import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConstructionProvider,
  useConstructionState,
  useConstructionDispatch,
} from '@/model/context';
import { Toolbar } from '@/components/Toolbar';
import { ActionBar } from '@/components/ActionBar';
import { LevelSelector } from '@/components/LevelSelector';
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
  UI_TEXT_PRIMARY,
  CANVAS_BG,
  HEADER_HEIGHT,
  STATUS_BAR_HEIGHT,
} from '@/config/theme';
import { CSS_PX_PER_MM, BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM } from '@/engine/viewport';
import { isAngleCluttered } from '@/engine/angles';
import { computeDerived } from '@/engine/derived';
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
import { PrintDialog } from '@/components/PrintDialog';
import type { ToolType, GridSize, DisplayUnit, SchoolLevel } from '@/model/types';

import type { SlotRegistry } from '@/model/slots';

interface AppProps {
  initialConsigne?: string | null;
  initialLevel?: string | null;
  initialRegistry?: SlotRegistry;
}

function AppContent({
  initialConsigne,
  initialLevel,
  initialRegistry: _initialRegistry,
}: AppProps) {
  const { state, canUndo, canRedo, undoManager } = useConstructionState();
  const dispatch = useConstructionDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, zoomIn, zoomOut, panUp, panDown, panLeft, panRight } =
    useViewport(containerRef);
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const [consigneDismissed, setConsigneDismissed] = useState(false);
  const initializedRef = useRef(false);

  const { saving } = useAutoSave(state, undoManager);

  const [pendingDeleteFromKeyboard, setPendingDeleteFromKeyboard] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Apply URL params once at mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (initialConsigne) {
      dispatch({ type: 'SET_CONSIGNE', consigne: initialConsigne });
    }
    if (initialLevel === '2e_cycle' || initialLevel === '3e_cycle') {
      dispatch({ type: 'SET_SCHOOL_LEVEL', schoolLevel: initialLevel });
    }
  }, [initialConsigne, initialLevel, dispatch]);

  // Tool router — returns unified ToolHookResult
  const tool = useActiveTool({ state, dispatch, viewport });

  // Selection system
  const selection = useSelection({
    state,
    dispatch,
    toolIsIdle: tool.isIdle,
    activeTool: state.activeTool,
  });

  // Pointer events — route to delete mode, selection, or tool
  const handleCanvasClick = useCallback(
    (mmPos: { x: number; y: number }) => {
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
    [deleteMode, deleteConfirmId, state, dispatch, selection, tool],
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

  const handleLevelChange = useCallback(
    (level: SchoolLevel) => dispatch({ type: 'SET_SCHOOL_LEVEL', schoolLevel: level }),
    [dispatch],
  );

  // Action bar handlers
  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
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
          // Trigger micro-confirmation in ContextActionBar instead of direct delete
          // Set a flag that the ContextActionBar will pick up
          setPendingDeleteFromKeyboard(true);
        }
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
    selection,
    deleteMode,
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
    () => computeDerived(state, state.schoolLevel),
    [state.points, state.segments, state.circles, state.schoolLevel],
  );
  const cluttered = useMemo(
    () => isAngleCluttered(state, state.schoolLevel),
    [state.segments.length, state.schoolLevel],
  );
  const pointMap = useMemo(
    () => new Map(state.points.map((p) => [p.id, { x: p.x, y: p.y }])),
    [state.points],
  );

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
        <LevelSelector level={state.schoolLevel} onChange={handleLevelChange} />
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>v0.1.0</span>
      </header>

      {/* Toolbar */}
      <Toolbar
        activeTool={state.activeTool}
        gridSizeMm={state.gridSizeMm}
        displayUnit={state.displayUnit}
        snapEnabled={state.snapEnabled}
        schoolLevel={state.schoolLevel}
        onToolChange={handleToolChange}
        onGridChange={handleGridChange}
        onUnitChange={handleUnitChange}
        onSnapToggle={handleSnapToggle}
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
          fontSize: 13,
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
            />

            {/* Angle arcs and markers */}
            <AngleLayer
              angles={derived.angles}
              points={pointMap}
              viewport={viewport}
              schoolLevel={state.schoolLevel}
              cluttered={cluttered}
              selectedElementId={state.selectedElementId}
              hoveredElementId={selection.hoveredElement?.id ?? null}
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
            />
          )}

          <NavigationControls
            onPanUp={panUp}
            onPanDown={panDown}
            onPanLeft={panLeft}
            onPanRight={panRight}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        </div>

        {/* Properties Panel */}
        <PropertiesPanel
          state={state}
          angles={derived.angles}
          properties={derived.properties}
          figures={derived.figures}
          schoolLevel={state.schoolLevel}
          hideProperties={state.hideProperties}
          onToggleHideProperties={() =>
            dispatch({ type: 'SET_HIDE_PROPERTIES', hide: !state.hideProperties })
          }
          onSelectElement={(id) => dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: id })}
          collapsed={panelCollapsed}
          onToggleCollapsed={() => setPanelCollapsed(!panelCollapsed)}
          hasNewProperties={hasNewProperties}
        />
      </div>

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
      />

      {showNewConfirm && (
        <ConfirmDialog
          title={CONFIRM_NEW_TITLE}
          subtitle={CONFIRM_NEW_SUBTITLE('Construction 1')}
          confirmLabel={CONFIRM_NEW_CONFIRM}
          cancelLabel={CONFIRM_NEW_CANCEL}
          onConfirm={handleConfirmNew}
          onCancel={() => setShowNewConfirm(false)}
        />
      )}

      {showPrintDialog && (
        <PrintDialog
          state={state}
          slotName="Construction 1"
          onClose={() => setShowPrintDialog(false)}
          onRecenter={() => {
            // TODO: RECENTER_CONSTRUCTION action
            setShowPrintDialog(false);
          }}
        />
      )}
    </div>
  );
}

export function App({ initialConsigne, initialLevel, initialRegistry }: AppProps) {
  return (
    <ConstructionProvider>
      <AppContent
        initialConsigne={initialConsigne}
        initialLevel={initialLevel}
        initialRegistry={initialRegistry}
      />
    </ConstructionProvider>
  );
}
