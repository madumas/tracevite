import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConstructionProvider,
  useConstructionState,
  useConstructionDispatch,
} from '@/model/context';
import { Toolbar } from '@/components/Toolbar';
import { ActionBar } from '@/components/ActionBar';
import { ModeSelector } from '@/components/ModeSelector';
import { SaveIndicator } from '@/components/SaveIndicator';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SnapFeedback } from '@/components/SnapFeedback';
import { ContextActionBar } from '@/components/ContextActionBar';
import { AngleLayer } from '@/components/AngleLayer';
import { useActiveTool } from '@/hooks/useActiveTool';
import { useSelection } from '@/hooks/useSelection';
import { usePointerInteraction } from '@/hooks/usePointerInteraction';
import { useViewport } from '@/hooks/useViewport';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useAutoSave } from '@/hooks/useAutoSave';
import {
  UI_BG,
  UI_PRIMARY,
  UI_TEXT_PRIMARY,
  CANVAS_BG,
  HEADER_HEIGHT,
  STATUS_BAR_HEIGHT,
} from '@/config/theme';
import { CSS_PX_PER_MM, BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM } from '@/engine/viewport';
import { isAngleCluttered } from '@/engine/angles';
import { computeDerived } from '@/engine/derived';
import { createSoundEngine } from '@/engine/sound';
import { ExportReminder } from '@/components/ExportReminder';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { detectLaunchStatus } from '@/model/persistence';
import { serializeState } from '@/model/serialize';
import { LengthInput } from '@/components/LengthInput';
import { SettingsDialog } from '@/components/SettingsDialog';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { GridLayer } from '@/components/GridLayer';
import { SegmentLayer } from '@/components/SegmentLayer';
import { PointLayer } from '@/components/PointLayer';
import { CircleLayer } from '@/components/CircleLayer';
import { NavigationControls } from '@/components/NavigationControls';
import {
  CONFIRM_NEW_TITLE,
  CONFIRM_NEW_SUBTITLE,
  CONFIRM_NEW_CANCEL,
  CONFIRM_NEW_CONFIRM,
  STATUS_DELETE_MODE,
  STATUS_DELETE_CONFIRM,
} from '@/config/messages';
import { hitTestElement } from '@/engine/hit-test';
import { ConsigneBanner } from '@/components/ConsigneBanner';
import { SlotManager } from '@/components/SlotManager';
import { useSlotManager } from '@/hooks/useSlotManager';
import { PrintDialog } from '@/components/PrintDialog';
import { PrintSvg } from '@/components/PrintSvg';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { useTutorial } from '@/hooks/useTutorial';
import type { ToolType, GridSize, DisplayUnit, DisplayMode } from '@/model/types';

const TOOL_SHORTCUT_MAP: Record<string, ToolType> = {
  s: 'segment',
  p: 'point',
  c: 'circle',
  v: 'move',
  m: 'measure',
  r: 'reflection',
};

const TOOL_DISPLAY_NAMES: Record<ToolType, string> = {
  segment: 'Segment',
  point: 'Point',
  circle: 'Cercle',
  move: 'Déplacer',
  measure: 'Mesurer',
  reflection: 'Réflexion',
};

import type { SlotRegistry } from '@/model/slots';

import type { UndoManager } from '@/model/undo';
import type { ConstructionState } from '@/model/types';

interface AppProps {
  initialConsigne?: string | null;
  initialLevel?: string | null;
  initialRegistry?: SlotRegistry;
  initialState?: ConstructionState;
  initialUndoManager?: UndoManager;
}

function AppContent({ initialConsigne, initialLevel, initialRegistry }: AppProps) {
  const { state, canUndo, canRedo, undoManager } = useConstructionState();
  const dispatch = useConstructionDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, zoomIn, zoomOut, panUp, panDown, panLeft, panRight } =
    useViewport(containerRef);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [consigneDismissed, setConsigneDismissed] = useState(false);
  const initializedRef = useRef(false);

  const [showSlotManager, setShowSlotManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [pendingDeleteFromKeyboard, setPendingDeleteFromKeyboard] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast for keyboard tool changes (spec §14)
  const [toastText, setToastText] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastText(text);
    toastTimerRef.current = setTimeout(() => setToastText(null), 5000);
  }, []);
  // Clear toast on any canvas click
  const clearToast = useCallback(() => {
    if (toastText) {
      setToastText(null);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }
  }, [toastText]);

  // Shift angle constraint toggle (spec §14)
  const [shiftConstraintActive, setShiftConstraintActive] = useState(false);
  // Reset Shift constraint on window blur (J2 fix)
  useEffect(() => {
    const handleBlur = () => setShiftConstraintActive(false);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  const tutorial = useTutorial(state);

  // Deep Freeze detection (spec §17.1)
  const [deepFreezeDetected, setDeepFreezeDetected] = useState(false);
  useEffect(() => {
    detectLaunchStatus().then((status) => {
      if (status === 'deep_freeze') setDeepFreezeDetected(true);
    });
  }, []);

  // PWA update detection
  const [updateAvailable, setUpdateAvailable] = useState(false);
  useEffect(() => {
    // Listen for SW update message from vite-plugin-pwa
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') setUpdateAvailable(true);
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  // Apply URL params once at mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (initialConsigne) {
      dispatch({ type: 'SET_CONSIGNE', consigne: initialConsigne });
    }
    const mode =
      initialLevel === '2e_cycle'
        ? 'simplifie'
        : initialLevel === '3e_cycle'
          ? 'complet'
          : initialLevel === 'simplifie'
            ? 'simplifie'
            : initialLevel === 'complet'
              ? 'complet'
              : null;
    if (mode) {
      dispatch({ type: 'SET_DISPLAY_MODE', displayMode: mode });
    }
  }, [initialConsigne, initialLevel, dispatch]);

  // Tool router — returns unified ToolHookResult
  const tool = useActiveTool({ state, dispatch, viewport, shiftConstraintActive });

  // Selection system
  const selection = useSelection({
    state,
    dispatch,
    toolIsIdle: tool.isIdle,
    activeTool: state.activeTool,
  });

  // Slot manager
  const slotManager = useSlotManager({
    initialRegistry: initialRegistry ?? { slots: [], activeSlotId: null, nextNumber: 1 },
    state,
    undoManager,
    dispatch,
    onBeforeSwitch: () => {
      tool.reset();
      selection.clearSelection();
    },
  });

  const { saving } = useAutoSave(state, undoManager, slotManager.activeSlotId);

  // Pointer events — route to delete mode, selection, or tool
  const handleCanvasClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      clearToast();
      if (deleteMode) {
        const hit = hitTestElement(mmPos, state);
        if (hit) {
          if (deleteConfirmId === hit.id) {
            // Second click on same element → delete
            dispatch({ type: 'REMOVE_ELEMENT', elementId: hit.id });
            setDeleteConfirmId(null);
            dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
          } else {
            // First click → select and ask for confirmation
            dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: hit.id });
            setDeleteConfirmId(hit.id);
          }
        } else {
          // Click empty space → clear pending confirmation
          setDeleteConfirmId(null);
          dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
        }
        return;
      }
      // Normal mode: selection first, then tool
      const handled = selection.trySelect(mmPos);
      if (!handled) {
        tool.handleClick(mmPos);
      }
    },
    [deleteMode, deleteConfirmId, state, dispatch, selection, tool, clearToast],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      selection.updateHover(mmPos);
      tool.handleCursorMove(mmPos);
    },
    [selection, tool],
  );

  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePointerInteraction({
    viewport,
    onCanvasClick: handleCanvasClick,
    onCursorMove: handleCursorMove,
  });

  const hasElements = state.points.length > 0;
  useBeforeUnload(hasElements);

  // Toolbar handlers
  const handleToolChange = useCallback(
    (t: ToolType) => {
      tool.reset();
      selection.clearSelection();
      setShiftConstraintActive(false);
      dispatch({ type: 'SET_ACTIVE_TOOL', activeTool: t });
    },
    [dispatch, tool, selection],
  );

  const handleGridChange = useCallback(
    (size: GridSize) => dispatch({ type: 'SET_GRID_SIZE', gridSizeMm: size }),
    [dispatch],
  );

  const handleUnitChange = useCallback(
    (unit: DisplayUnit) => dispatch({ type: 'SET_DISPLAY_UNIT', displayUnit: unit }),
    [dispatch],
  );

  const handleSnapToggle = useCallback(
    () => dispatch({ type: 'SET_SNAP_ENABLED', snapEnabled: !state.snapEnabled }),
    [dispatch, state.snapEnabled],
  );

  const handleModeChange = useCallback(
    (displayMode: DisplayMode) => dispatch({ type: 'SET_DISPLAY_MODE', displayMode }),
    [dispatch],
  );

  // Action bar handlers
  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printLandscape, setPrintLandscape] = useState(false);
  const handlePrint = useCallback(() => setShowPrintDialog(true), []);
  const handleNewConstruction = useCallback(() => setShowNewConfirm(true), []);
  const handleConfirmNew = useCallback(() => {
    dispatch({ type: 'NEW_CONSTRUCTION' });
    tool.reset();
    setShowNewConfirm(false);
  }, [dispatch, tool]);

  // Context action bar handlers
  const handleContextDelete = useCallback(
    (elementId: string) => dispatch({ type: 'REMOVE_ELEMENT', elementId }),
    [dispatch],
  );
  const handleToggleLock = useCallback(
    (pointId: string) => dispatch({ type: 'TOGGLE_POINT_LOCK', pointId }),
    [dispatch],
  );

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === 'Escape') {
        if (showNewConfirm) {
          setShowNewConfirm(false);
        } else if (deleteMode) {
          setDeleteMode(false);
          setDeleteConfirmId(null);
          selection.clearSelection();
        } else if (state.selectedElementId) {
          selection.clearSelection();
        } else {
          tool.handleEscape();
          setShiftConstraintActive(false);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !inInput) {
        e.preventDefault();
        if (canUndo) dispatch({ type: 'UNDO' });
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey)) &&
        !inInput
      ) {
        e.preventDefault();
        if (canRedo) dispatch({ type: 'REDO' });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (hasElements) handlePrint();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedElementId && !inInput) {
          e.preventDefault();
          setPendingDeleteFromKeyboard(true);
        }
      }

      // Tool keyboard shortcuts (spec §14) — disabled by default
      if (state.keyboardShortcutsEnabled && !inInput && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        const targetTool = TOOL_SHORTCUT_MAP[key];
        if (targetTool && targetTool !== state.activeTool) {
          // Guard: don't activate tools hidden in current mode (spec §14)
          if (targetTool === 'point' && !state.pointToolVisible) return;
          if (targetTool === 'circle' && state.displayMode === 'simplifie') return;
          e.preventDefault();
          dispatch({ type: 'SET_ACTIVE_TOOL', activeTool: targetTool });
          tool.reset();
          showToast(`Outil : ${TOOL_DISPLAY_NAMES[targetTool]}`);
        }
        if (key === 'g') {
          e.preventDefault();
          dispatch({ type: 'SET_SNAP_ENABLED', snapEnabled: !state.snapEnabled });
        }
      }

      // Shift angle constraint toggle (spec §14)
      if (e.key === 'Shift' && !inInput && !e.ctrlKey && !e.metaKey && !e.repeat) {
        setShiftConstraintActive((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    tool,
    canUndo,
    canRedo,
    dispatch,
    showNewConfirm,
    hasElements,
    handlePrint,
    state.selectedElementId,
    state.keyboardShortcutsEnabled,
    state.activeTool,
    state.snapEnabled,
    selection,
    deleteMode,
    showToast,
  ]);

  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    // Restore from localStorage, auto-collapse on small screens
    const saved = localStorage.getItem('tracevite_panel_collapsed');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' && window.innerHeight < 800;
  });
  const [hasNewProperties, setHasNewProperties] = useState(false);
  const prevDerivedCountRef = useRef(0);

  // Derived: angles, properties, figures (computed, not stored in state)
  const derived = useMemo(
    () => computeDerived(state, state.displayMode),
    [state.points, state.segments, state.circles, state.displayMode],
  );
  const cluttered = useMemo(
    () => isAngleCluttered(state, state.displayMode),
    [state.segments.length, state.displayMode],
  );
  const pointMap = useMemo(
    () => new Map(state.points.map((p) => [p.id, { x: p.x, y: p.y }])),
    [state.points],
  );

  // ── Sound engine integration (spec §7.2) ────────────────
  const soundEngineRef = useRef<ReturnType<typeof createSoundEngine> | null>(null);

  // Lazily create sound engine when mode changes from 'off'
  useEffect(() => {
    if (state.soundMode !== 'off' && !soundEngineRef.current) {
      soundEngineRef.current = createSoundEngine();
    }
    if (soundEngineRef.current) {
      soundEngineRef.current.setMode(state.soundMode);
      soundEngineRef.current.setGain(state.soundGain);
    }
  }, [state.soundMode, state.soundGain]);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      soundEngineRef.current?.dispose();
      soundEngineRef.current = null;
    };
  }, []);

  // Play snap sound only when snapping to a point or midpoint (not grid/alignment)
  const prevSnapTypeRef = useRef<string>('none');
  useEffect(() => {
    const snapType = tool.snapResult?.snapType ?? 'none';
    const isSignificantSnap = snapType === 'point' || snapType === 'midpoint';
    const wasSignificant =
      prevSnapTypeRef.current === 'point' || prevSnapTypeRef.current === 'midpoint';
    if (isSignificantSnap && !wasSignificant) {
      soundEngineRef.current?.playSnap();
    }
    prevSnapTypeRef.current = snapType;
  }, [tool.snapResult?.snapType]);

  // Play segment created / figure closed
  const prevSegCountRef = useRef(state.segments.length);
  const prevFigCountRef = useRef(derived.figures.length);
  useEffect(() => {
    if (state.segments.length > prevSegCountRef.current) {
      soundEngineRef.current?.playSegmentCreated();
    }
    prevSegCountRef.current = state.segments.length;
  }, [state.segments.length]);
  useEffect(() => {
    if (derived.figures.length > prevFigCountRef.current) {
      soundEngineRef.current?.playFigureClosed();
    }
    prevFigCountRef.current = derived.figures.length;
  }, [derived.figures.length]);

  // Persist panel collapsed state
  useEffect(() => {
    localStorage.setItem('tracevite_panel_collapsed', String(panelCollapsed));
    if (!panelCollapsed) setHasNewProperties(false); // Clear badge when panel opens
  }, [panelCollapsed]);

  // Track new properties for badge notification
  useEffect(() => {
    const currentCount = derived.properties.length + derived.figures.length;
    if (panelCollapsed && currentCount > prevDerivedCountRef.current) {
      setHasNewProperties(true);
    }
    prevDerivedCountRef.current = currentCount;
  }, [derived.properties.length, derived.figures.length, panelCollapsed]);

  const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
  const svgWidth = BOUNDS_WIDTH_MM * pxPerMm;
  const svgHeight = BOUNDS_HEIGHT_MM * pxPerMm;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: UI_BG,
        color: UI_TEXT_PRIMARY,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <header
        style={{
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: '#FFFFFF',
          borderBottom: '1px solid #D1D8E0',
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 16 }}>TraceVite</strong>
        <SaveIndicator saving={saving} />
        <button
          onClick={() => setShowSlotManager(true)}
          style={{
            padding: '3px 10px',
            background: 'transparent',
            border: `1px solid #D1D8E0`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 12,
            color: '#4A5568',
          }}
          data-testid="slot-manager-btn"
        >
          Mes constructions
        </button>
        {state.consigne && consigneDismissed && (
          <button
            onClick={() => setConsigneDismissed(false)}
            style={{
              padding: '2px 8px',
              background: '#E6F1FB',
              border: '1px solid #C5D8EC',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: '#185FA5',
            }}
            data-testid="consigne-show"
          >
            Voir la consigne
          </button>
        )}
        <div style={{ flex: 1 }} />
        <ModeSelector mode={state.displayMode} onChange={handleModeChange} />
        <button
          onClick={() => setShowSettings(true)}
          style={{
            width: 44,
            height: 44,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Paramètres"
          data-testid="settings-button"
        >
          ⚙
        </button>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>v0.1.0</span>
      </header>

      {/* Deep Freeze warning (spec §17.1) */}
      {deepFreezeDetected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: '#FEE2E2',
            borderBottom: '1px solid #FECACA',
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
          }}
          data-testid="deep-freeze-banner"
        >
          <span style={{ flex: 1 }}>
            Tes constructions ont été effacées par l'ordinateur. Si tu as exporté tes fichiers
            .tracevite, clique « Ouvrir » pour les retrouver.
          </span>
          <button
            onClick={() => {
              setShowSlotManager(true);
              setDeepFreezeDetected(false);
            }}
            style={{
              padding: '4px 10px',
              background: UI_PRIMARY,
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Ouvrir
          </button>
          <button
            onClick={() => setDeepFreezeDetected(false)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: '#666',
            }}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* Export reminder (spec §17.1) */}
      <ExportReminder
        hasConstructions={hasElements}
        onExport={() => {
          const json = serializeState(state);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'construction.tracevite';
          a.click();
          URL.revokeObjectURL(url);
        }}
      />

      {/* Toolbar */}
      <Toolbar
        activeTool={state.activeTool}
        gridSizeMm={state.gridSizeMm}
        displayUnit={state.displayUnit}
        snapEnabled={state.snapEnabled}
        displayMode={state.displayMode}
        onToolChange={handleToolChange}
        onGridChange={handleGridChange}
        onUnitChange={handleUnitChange}
        onSnapToggle={handleSnapToggle}
        pointToolVisible={state.pointToolVisible}
        fontScale={state.fontScale}
      />

      {/* Status Bar */}
      <div
        style={{
          height: STATUS_BAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: '#EDF1F5',
          borderBottom: '1px solid #D1D8E0',
          fontSize: 13 * state.fontScale,
          color: '#4A5568',
        }}
        role="status"
        aria-live="polite"
        data-testid="status-bar"
      >
        {deleteMode
          ? deleteConfirmId
            ? STATUS_DELETE_CONFIRM(
                (() => {
                  const pt = state.points.find((p) => p.id === deleteConfirmId);
                  if (pt) return `le point ${pt.label}`;
                  const seg = state.segments.find((s) => s.id === deleteConfirmId);
                  if (seg) {
                    const s = state.points.find((p) => p.id === seg.startPointId);
                    const e = state.points.find((p) => p.id === seg.endPointId);
                    return `le segment ${s?.label ?? ''}${e?.label ?? ''}`;
                  }
                  return "l'élément";
                })(),
              )
            : STATUS_DELETE_MODE
          : tool.statusMessage}
        {shiftConstraintActive && ' — Contrainte 15° active'}
      </div>

      {/* Canvas + Panel row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            background: CANVAS_BG,
          }}
          data-testid="canvas-container"
        >
          {/* Consigne banner — overlays top of canvas */}
          {state.consigne && !consigneDismissed && (
            <ConsigneBanner
              consigne={state.consigne}
              onDismiss={() => setConsigneDismissed(true)}
            />
          )}

          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            role="application"
            aria-label="Canevas de construction géométrique"
            style={{
              display: 'block',
              touchAction: 'none',
              cursor: deleteMode ? 'crosshair' : undefined,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            data-testid="canvas-svg"
          >
            <GridLayer viewport={viewport} gridSizeMm={state.gridSizeMm} />
            <SegmentLayer
              segments={state.segments}
              points={state.points}
              viewport={viewport}
              displayUnit={state.displayUnit}
              selectedElementId={state.selectedElementId}
              properties={derived.properties}
              hideProperties={state.hideProperties}
              fontScale={state.fontScale}
            />
            <CircleLayer
              circles={state.circles}
              points={state.points}
              viewport={viewport}
              selectedElementId={state.selectedElementId}
            />
            <PointLayer
              points={state.points}
              viewport={viewport}
              selectedElementId={state.selectedElementId}
              fontScale={state.fontScale}
            />

            {/* Angle arcs and markers */}
            <AngleLayer
              angles={derived.angles}
              points={pointMap}
              viewport={viewport}
              displayMode={state.displayMode}
              cluttered={cluttered}
              selectedElementId={state.selectedElementId}
              hoveredElementId={selection.hoveredElement?.id ?? null}
              hideProperties={state.hideProperties}
              fontScale={state.fontScale}
            />

            {/* Tool-specific overlays (ghost segment, ghost circle, etc.) */}
            {tool.overlayElements}

            {/* Snap feedback */}
            <SnapFeedback snapResult={tool.snapResult} viewport={viewport} />
          </svg>

          {/* Context action bar (positioned over canvas) */}
          {state.selectedElementId && (
            <ContextActionBar
              state={state}
              viewport={viewport}
              onDelete={handleContextDelete}
              onToggleLock={handleToggleLock}
              triggerConfirm={pendingDeleteFromKeyboard}
              onConfirmHandled={() => setPendingDeleteFromKeyboard(false)}
              fontScale={state.fontScale}
            />
          )}

          {/* Length input for Measure tool (spec §6.8, §9.5) */}
          {state.activeTool === 'measure' &&
            state.selectedElementId &&
            (() => {
              const seg = state.segments.find((s) => s.id === state.selectedElementId);
              if (!seg) return null;
              const sp = state.points.find((p) => p.id === seg.startPointId);
              const ep = state.points.find((p) => p.id === seg.endPointId);
              const label = sp && ep ? sp.label + ep.label : '';
              return (
                <LengthInput
                  segmentLabel={label}
                  currentLengthMm={seg.lengthMm}
                  displayUnit={state.displayUnit}
                  onSubmit={(lengthMm) => {
                    dispatch({ type: 'FIX_SEGMENT_LENGTH', segmentId: seg.id, lengthMm });
                    dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
                  }}
                  onDismiss={() => dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null })}
                />
              );
            })()}

          <NavigationControls
            onPanUp={panUp}
            onPanDown={panDown}
            onPanLeft={panLeft}
            onPanRight={panRight}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />

          {/* Tutorial overlay */}
          {tutorial.isActive && (
            <TutorialOverlay
              step={tutorial.step}
              onSkip={tutorial.skip}
              onFinish={tutorial.finish}
              onDismissPost={tutorial.dismissPost}
            />
          )}
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          state={state}
          angles={derived.angles}
          properties={derived.properties}
          figures={derived.figures}
          displayMode={state.displayMode}
          hideProperties={state.hideProperties}
          onToggleHideProperties={() =>
            dispatch({ type: 'SET_HIDE_PROPERTIES', hide: !state.hideProperties })
          }
          onSelectElement={(id) => dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: id })}
          collapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed(!panelCollapsed)}
          hasNewProperties={hasNewProperties}
          fontScale={state.fontScale}
        />
      </div>

      {/* PWA update prompt (spec §4.1.2) */}
      {updateAvailable && (
        <UpdatePrompt
          onUpdate={() => {
            // Auto-save then reload
            window.location.reload();
          }}
          onDismiss={() => setUpdateAvailable(false)}
        />
      )}

      {/* Action Bar */}
      <ActionBar
        canUndo={canUndo}
        canRedo={canRedo}
        canPrint={hasElements}
        deleteMode={deleteMode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleDeleteMode={() => {
          setDeleteMode(!deleteMode);
          setDeleteConfirmId(null);
          if (deleteMode) selection.clearSelection();
        }}
        onPrint={handlePrint}
        onNewConstruction={handleNewConstruction}
        fontScale={state.fontScale}
      />

      {showNewConfirm && (
        <ConfirmDialog
          title={CONFIRM_NEW_TITLE}
          subtitle={CONFIRM_NEW_SUBTITLE(
            slotManager.registry.slots.find((s) => s.id === slotManager.activeSlotId)?.name ??
              'Construction 1',
          )}
          confirmLabel={CONFIRM_NEW_CONFIRM}
          cancelLabel={CONFIRM_NEW_CANCEL}
          onConfirm={handleConfirmNew}
          onCancel={() => setShowNewConfirm(false)}
        />
      )}

      {showPrintDialog && (
        <PrintDialog
          state={state}
          slotName={
            slotManager.registry.slots.find((s) => s.id === slotManager.activeSlotId)?.name ??
            'Construction 1'
          }
          landscape={printLandscape}
          onLandscapeChange={setPrintLandscape}
          onClose={() => setShowPrintDialog(false)}
          onRecenter={() => {
            // TODO: RECENTER_CONSTRUCTION action
            setShowPrintDialog(false);
          }}
        />
      )}

      {/* Hidden print SVG — visible only in @media print */}
      <PrintSvg state={state} landscape={printLandscape} />

      {/* Slot manager modal */}
      {showSlotManager && (
        <SlotManager
          registry={slotManager.registry}
          activeSlotId={slotManager.activeSlotId}
          state={state}
          onSwitch={(id) => {
            slotManager.switchSlot(id);
            setShowSlotManager(false);
          }}
          onCreate={(name) => {
            slotManager.createNewSlot(name);
            setShowSlotManager(false);
          }}
          onDelete={(id) => slotManager.removeSlot(id)}
          onRename={(id, name) => slotManager.renameCurrentSlot(id, name)}
          onImport={(importedState, name) => {
            slotManager.createNewSlot(name);
            dispatch({
              type: 'LOAD_CONSTRUCTION',
              undoManager: { past: [], current: importedState, future: [] },
            });
            setShowSlotManager(false);
          }}
          onClose={() => setShowSlotManager(false)}
        />
      )}

      {/* Keyboard shortcut toast (spec §14) */}
      {toastText && (
        <div
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1A2433',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          data-testid="tool-toast"
        >
          {toastText}
        </div>
      )}

      {/* Settings dialog */}
      {showSettings && (
        <SettingsDialog
          toleranceProfile={state.toleranceProfile}
          chainTimeoutMs={state.chainTimeoutMs}
          fontScale={state.fontScale}
          soundMode={state.soundMode}
          soundGain={state.soundGain}
          keyboardShortcutsEnabled={state.keyboardShortcutsEnabled}
          pointToolVisible={state.pointToolVisible}
          onToleranceChange={(v) =>
            dispatch({ type: 'SET_TOLERANCE_PROFILE', toleranceProfile: v })
          }
          onChainTimeoutChange={(v) => dispatch({ type: 'SET_CHAIN_TIMEOUT', chainTimeoutMs: v })}
          onFontScaleChange={(v) => dispatch({ type: 'SET_FONT_SCALE', fontScale: v })}
          onSoundModeChange={(v) => dispatch({ type: 'SET_SOUND_MODE', soundMode: v })}
          onSoundGainChange={(v) => dispatch({ type: 'SET_SOUND_GAIN', soundGain: v })}
          onKeyboardShortcutsChange={(v) =>
            dispatch({ type: 'SET_KEYBOARD_SHORTCUTS', enabled: v })
          }
          onPointToolVisibleChange={(v) => dispatch({ type: 'SET_POINT_TOOL_VISIBLE', visible: v })}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export function App({
  initialConsigne,
  initialLevel,
  initialRegistry,
  initialState,
  initialUndoManager,
}: AppProps) {
  return (
    <ConstructionProvider initialState={initialState} initialUndoManager={initialUndoManager}>
      <AppContent
        initialConsigne={initialConsigne}
        initialLevel={initialLevel}
        initialRegistry={initialRegistry}
      />
    </ConstructionProvider>
  );
}
