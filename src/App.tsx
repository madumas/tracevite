import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ConstructionProvider,
  useConstructionState,
  useConstructionDispatch,
} from '@/model/context';
import { Toolbar } from '@/components/Toolbar';
import { ActionBar } from '@/components/ActionBar';
import { SnapFeedback } from '@/components/SnapFeedback';
import { ContextActionBar } from '@/components/ContextActionBar';
import { AngleLayer } from '@/components/AngleLayer';
import { TextBoxLayer } from '@/components/TextBoxLayer';
import { useActiveTool } from '@/hooks/useActiveTool';
import { useSelection } from '@/hooks/useSelection';
import { usePointerInteraction } from '@/hooks/usePointerInteraction';
import { useViewport } from '@/hooks/useViewport';
import { useContainerSize } from '@/hooks/useContainerSize';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useAutoSave } from '@/hooks/useAutoSave';
import {
  UI_BG,
  UI_PRIMARY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  STATUS_BAR_HEIGHT,
  STATUS_BAR_BG,
  getCanvasColors,
  CanvasColorsProvider,
} from '@/config/theme';
import { CSS_PX_PER_MM, BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM } from '@/engine/viewport';
import { isAngleCluttered } from '@/engine/angles';
import { computeDerived } from '@/engine/derived';
import { getAngleLabelPosition, getSegmentLabelPosition } from '@/engine/label-positions';
import { createSoundEngine } from '@/engine/sound';
import { detectLaunchStatus } from '@/model/persistence';
import { LengthInput } from '@/components/LengthInput';
import { RadiusInput } from '@/components/RadiusInput';
import { SettingsDialog } from '@/components/SettingsDialog';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { GridLayer } from '@/components/GridLayer';
import { PrintGuideLayer } from '@/components/PrintGuideLayer';
import { CartesianLayer } from '@/components/CartesianLayer';
import { SegmentLayer } from '@/components/SegmentLayer';
import { PointLayer } from '@/components/PointLayer';
import { CircleLayer } from '@/components/CircleLayer';
import { NavigationControls } from '@/components/NavigationControls';
import {
  CONFIRM_NEW_TITLE,
  CONFIRM_NEW_SUBTITLE,
  CONFIRM_NEW_CANCEL,
  CONFIRM_NEW_CONFIRM,
} from '@/config/messages';
import { ConfirmDialog } from '@/components/ConfirmDialog';

import { ConsigneBanner } from '@/components/ConsigneBanner';
import { SlotManager } from '@/components/SlotManager';
import { useSlotManager } from '@/hooks/useSlotManager';
import { PrintDialog } from '@/components/PrintDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { PrintSvg } from '@/components/PrintSvg';
import { useTutorial } from '@/hooks/useTutorial';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { ToolType, GridSize, DisplayUnit, DisplayMode } from '@/model/types';
import { PreferencesProvider, usePreferences } from '@/model/preferences';
import { AboutDialog } from '@/components/AboutDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { FatigueReminder } from '@/components/FatigueReminder';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/** Tools where clicking an element is a tool action, not a general selection.
 * Used to (1) forward clicks to the tool and (2) hide ContextActionBar. */
const COMPOUND_TOOLS: readonly ToolType[] = [
  'reproduce',
  'perpendicular',
  'parallel',
  'translation',
  'reflection',
  'compare',
  'frieze',
  'symmetry',
  'rotation',
  'homothety',
];

const TOOL_SHORTCUT_MAP: Record<string, ToolType> = {
  a: 'select',
  s: 'segment',
  p: 'point',
  c: 'circle',
  v: 'move',
  r: 'reflection',
};

const TOOL_DISPLAY_NAMES: Record<ToolType, string> = {
  select: 'Sélectionner',
  segment: 'Segment',
  point: 'Point',
  circle: 'Cercle',
  move: 'Déplacer',
  reflection: 'Réflexion',
  reproduce: 'Reproduire',
  perpendicular: 'Perpendiculaire',
  parallel: 'Parallèle',
  translation: 'Translation',
  compare: 'Comparer',
  frieze: 'Frise',
  symmetry: 'Symétrie',
  rotation: 'Rotation',
  homothety: 'Agrandir/Réduire',
  text: 'Texte',
};

import type { SlotRegistry } from '@/model/slots';

import type { UndoManager } from '@/model/undo';
import type { ConstructionState } from '@/model/types';

interface AppProps {
  initialRegistry?: SlotRegistry;
  initialState?: ConstructionState;
  initialUndoManager?: UndoManager;
}

// SVG cursor for 15° angle constraint (spec §14) — distinct from native crosshair
const SHIFT_CONSTRAINT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><line x1='4' y1='28' x2='28' y2='28' stroke='%23185FA5' stroke-width='2'/><line x1='4' y1='28' x2='24' y2='14' stroke='%23185FA5' stroke-width='2'/><path d='M14,28 A10,10 0 0,1 15,22' fill='none' stroke='%23185FA5' stroke-width='1.5'/></svg>")}") 4 28, crosshair`;

/** Canvas cursor based on active tool + interaction state (TDC affordance). */
function getCanvasCursor(
  activeTool: ToolType,
  isActiveGesture: boolean | undefined,
  isIdle: boolean,
  isHoveringElement: boolean,
  shiftConstraintActive: boolean,
): string {
  if (shiftConstraintActive) return SHIFT_CONSTRAINT_CURSOR;
  if (isIdle && isHoveringElement) return 'pointer';
  switch (activeTool) {
    case 'select':
      return 'default';
    case 'segment':
    case 'point':
    case 'circle':
    case 'perpendicular':
    case 'parallel':
    case 'reflection':
    case 'translation':
    case 'reproduce':
    case 'compare':
    case 'frieze':
    case 'symmetry':
    case 'rotation':
    case 'homothety':
    case 'text':
      return 'crosshair';
    case 'move':
      return isActiveGesture ? 'grabbing' : 'grab';
  }
}

function AppContent({ initialRegistry }: AppProps) {
  const { state, canUndo, canRedo, undoManager } = useConstructionState();
  const dispatch = useConstructionDispatch();
  const preferences = usePreferences();
  const canvasColors = getCanvasColors(preferences.highContrast);
  const effectiveSegmentColor = preferences.highContrast
    ? canvasColors.segment
    : preferences.segmentColor;
  // Responsive breakpoints
  const isNarrow = useMediaQuery('(max-width: 1024px)');

  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);
  const { viewport, zoomIn, zoomOut, resetZoom, panUp, panDown, panLeft, panRight, pinchZoomPan } =
    useViewport(containerRef, containerSize);
  const [consigneDismissed, setConsigneDismissed] = useState(false);
  // initializedRef removed — URL params now handled in main.tsx before mount

  const [showSlotManager, setShowSlotManager] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [showAllProps, setShowAllProps] = useState(false);
  const [hiddenOps, setHiddenOps] = useState<Set<string>>(new Set());
  // Reset "show all" filter when selection changes
  useEffect(() => setShowAllProps(false), [state.selectedElementId]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const [estimationRevealed, setEstimationRevealed] = useState(false);
  const [forceShowLabels, setForceShowLabels] = useState(false);
  const [clutterHintShown, setClutterHintShown] = useState(false);
  const forceShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredPanelElementId, setHoveredPanelElementId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showFatigueReminder, setShowFatigueReminder] = useState(false);
  const fatigueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectiveFontScale = demoMode ? Math.max(state.fontScale, 2) : state.fontScale;

  // Sync demoMode with fullscreen state
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setDemoMode(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Fatigue reminder timer
  useEffect(() => {
    const minutes = preferences.fatigueReminderMinutes;
    if (fatigueTimerRef.current) clearTimeout(fatigueTimerRef.current);
    if (minutes == null) return;
    fatigueTimerRef.current = setTimeout(
      () => {
        setShowFatigueReminder(true);
      },
      minutes * 60 * 1000,
    );
    return () => {
      if (fatigueTimerRef.current) clearTimeout(fatigueTimerRef.current);
    };
  }, [preferences.fatigueReminderMinutes, showFatigueReminder]);

  // RadiusInput state for circle radius/diameter fixing (spec §6.3)
  const [fixingCircleId, setFixingCircleId] = useState<string | null>(null);
  // LengthInput state for segment length fixing (contextual action)
  const [fixingSegmentId, setFixingSegmentId] = useState<string | null>(null);
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

  const tutorial = useTutorial(state, () => {
    dispatch({ type: 'SET_ACTIVE_TOOL', activeTool: 'segment' });
  });

  // Deep Freeze detection (spec §17.1)
  const [deepFreezeDetected, setDeepFreezeDetected] = useState(false);
  useEffect(() => {
    detectLaunchStatus().then((status) => {
      if (status === 'deep_freeze') setDeepFreezeDetected(true);
    });
  }, []);

  // Apply URL params once at mount (moved after slotManager — see below)

  // Tool router — returns unified ToolHookResult
  const tool = useActiveTool({
    state,
    dispatch,
    viewport,
    shiftConstraintActive,
    animateTransformations: preferences.animateTransformations,
  });

  // Accommodation TDC : masquer décorations pendant gestes moteurs actifs (déficit double tâche)
  const gestureHideProperties = state.hideProperties || !!tool.isActiveGesture;

  // Auto-show RadiusInput after circle creation (spec §6.3)
  useEffect(() => {
    if (tool.lastCreatedCircleId) {
      const timer = setTimeout(() => setFixingCircleId(tool.lastCreatedCircleId!), 300);
      return () => clearTimeout(timer);
    }
  }, [tool.lastCreatedCircleId]);

  // Close RadiusInput when circle is deleted (undo, delete)
  useEffect(() => {
    if (fixingCircleId && !state.circles.some((c) => c.id === fixingCircleId)) {
      setFixingCircleId(null);
    }
  }, [fixingCircleId, state.circles]);

  // Close RadiusInput/LengthInput on tool change
  useEffect(() => {
    setFixingCircleId(null);
    setFixingSegmentId(null);
  }, [state.activeTool]);

  // Close LengthInput when segment is deleted
  useEffect(() => {
    if (fixingSegmentId && !state.segments.some((s) => s.id === fixingSegmentId)) {
      setFixingSegmentId(null);
    }
  }, [fixingSegmentId, state.segments]);

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

  // Auto-create first slot when user starts drawing (spec §17.1)
  useEffect(() => {
    if (!slotManager.activeSlotId && state.points.length > 0) {
      slotManager.createNewSlot(undefined, true); // keepCurrentState = true
    }
  }, [state.points.length, slotManager.activeSlotId, slotManager]);

  useAutoSave(state, undoManager, slotManager.activeSlotId);

  // Pointer events — route to delete mode, selection, or tool
  const handleDeleteElement = useCallback(
    (elementId: string) => {
      dispatch({ type: 'REMOVE_ELEMENT', elementId });
      dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: null });
    },
    [dispatch],
  );

  const handleCanvasClick = useCallback(
    (mmPos: { x: number; y: number }) => {
      clearToast();
      // Normal mode: if tool is mid-action, forward to tool directly.
      // Compound tools that need clicks on elements get priority over selection.
      const toolNeedsElementClick = COMPOUND_TOOLS.includes(state.activeTool);
      if (!tool.isIdle || toolNeedsElementClick) {
        tool.handleClick(mmPos);
      } else {
        const handled = selection.trySelect(mmPos);
        if (!handled) {
          tool.handleClick(mmPos);
        }
      }
    },
    [state, selection, tool, clearToast],
  );

  const handleCursorMove = useCallback(
    (mmPos: { x: number; y: number }) => {
      selection.updateHover(mmPos);
      tool.handleCursorMove(mmPos);
    },
    [selection, tool],
  );

  const { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel } =
    usePointerInteraction({
      viewport,
      onCanvasClick: handleCanvasClick,
      onCursorMove: handleCursorMove,
      cursorSmoothing: preferences.cursorSmoothing && state.toleranceProfile === 'very_large',
      onPinchZoom: pinchZoomPan,
      onTouchEnd: selection.clearHover,
    });

  const hasElements = state.points.length > 0;
  useBeforeUnload(hasElements);

  // Toolbar handlers
  const handleToolChange = useCallback(
    (t: ToolType) => {
      if (t === state.activeTool && !tool.isIdle) {
        // Re-click same tool = cancel current action (more intuitive than Escape)
        tool.reset();
        selection.clearSelection();
        return;
      }
      tool.reset();
      selection.clearSelection();
      setShiftConstraintActive(false);
      dispatch({ type: 'SET_ACTIVE_TOOL', activeTool: t });
    },
    [dispatch, tool, selection, state.activeTool],
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
  const [printLandscape, setPrintLandscape] = useState(true);
  const [printIncludeMeasurements, setPrintIncludeMeasurements] = useState(true);
  const [printIncludeConsigne, setPrintIncludeConsigne] = useState(false);
  const handlePrint = useCallback(() => setShowPrintDialog(true), []);

  // Context action bar handlers
  const handleToggleLock = useCallback(
    (pointId: string) => dispatch({ type: 'TOGGLE_POINT_LOCK', pointId }),
    [dispatch],
  );
  const handleFixSegmentLength = useCallback(
    (segmentId: string) => setFixingSegmentId(segmentId),
    [],
  );
  const [panelCollapsed, setPanelCollapsed] = useState(() => {
    const saved =
      localStorage.getItem('geomolo_panel_collapsed') ??
      localStorage.getItem('tracevite_panel_collapsed');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' && (window.innerHeight < 800 || window.innerWidth < 900);
  });

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const inInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === 'Escape') {
        // Mobile panel overlay has highest priority (z-index 1000)
        if (isNarrow && !panelCollapsed) {
          setPanelCollapsed(true);
        } else if (showSlotManager) {
          setShowSlotManager(false);
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
    hasElements,
    handlePrint,
    state.selectedElementId,
    state.keyboardShortcutsEnabled,
    state.activeTool,
    state.snapEnabled,
    selection,
    showSlotManager,
    showToast,
    isNarrow,
    panelCollapsed,
  ]);

  // Right-click = cancel (same hierarchy as Escape, spec-compatible "physical Escape")
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      if (showSettings) {
        setShowSettings(false);
      } else if (showPrintDialog) {
        setShowPrintDialog(false);
      } else if (state.selectedElementId) {
        selection.clearSelection();
      } else if (!tool.isIdle) {
        tool.handleEscape();
        setShiftConstraintActive(false);
      }
    };
    window.addEventListener('contextmenu', handler);
    return () => window.removeEventListener('contextmenu', handler);
  }, [tool, showSettings, showPrintDialog, state.selectedElementId, selection]);

  const [hasNewProperties, setHasNewProperties] = useState(false);
  const prevDerivedCountRef = useRef(0);

  // Derived: angles, properties, figures (computed, not stored in state)
  const derived = useMemo(
    () => computeDerived(state, state.displayMode),
    [state.points, state.segments, state.circles, state.displayMode],
  );
  const [tempFocusMode, setTempFocusMode] = useState(false);
  const cluttered = useMemo(
    () => isAngleCluttered(state, state.displayMode),
    [state.segments.length, state.displayMode],
  );
  // Focus mode: compute dimmed element IDs (segments + points not adjacent to selection)
  const focusDimmedIds = useMemo(() => {
    if (!(preferences.focusMode || tempFocusMode) || !state.selectedElementId) return undefined;
    const selectedSeg = state.segments.find((s) => s.id === state.selectedElementId);
    if (!selectedSeg) return undefined;

    // Find adjacent points (directly connected to selected segment)
    const selectedPointIds = new Set([selectedSeg.startPointId, selectedSeg.endPointId]);

    // Phase 1: find segments that share a point with the selected segment (1-hop only)
    const adjacentSegIds = new Set<string>();
    adjacentSegIds.add(selectedSeg.id);
    for (const seg of state.segments) {
      if (selectedPointIds.has(seg.startPointId) || selectedPointIds.has(seg.endPointId)) {
        adjacentSegIds.add(seg.id);
      }
    }

    // Phase 2: collect all points from adjacent segments
    const adjacentPointIds = new Set(selectedPointIds);
    for (const seg of state.segments) {
      if (adjacentSegIds.has(seg.id)) {
        adjacentPointIds.add(seg.startPointId);
        adjacentPointIds.add(seg.endPointId);
      }
    }

    // Dimmed = everything NOT adjacent
    const dimmed = new Set<string>();
    for (const seg of state.segments) {
      if (!adjacentSegIds.has(seg.id)) dimmed.add(seg.id);
    }
    for (const pt of state.points) {
      if (!adjacentPointIds.has(pt.id)) dimmed.add(pt.id);
    }
    return dimmed.size > 0 ? dimmed : undefined;
  }, [preferences.focusMode, tempFocusMode, state.selectedElementId, state.segments, state.points]);

  // Auto-select last segment after transformation + temporary focus mode
  const prevSegCount = useRef(state.segments.length);
  const [primeHintShown, setPrimeHintShown] = useState(false);
  const [primeHint, setPrimeHint] = useState<string | null>(null);
  useEffect(() => {
    const delta = state.segments.length - prevSegCount.current;
    prevSegCount.current = state.segments.length;
    if (delta >= 3 && state.segments.length > 0) {
      // Auto-select last segment created
      const lastSeg = state.segments[state.segments.length - 1]!;
      dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: lastSeg.id });
      // Temporarily enable focus mode (10s with gradual fade-out)
      if (!preferences.focusMode) {
        setTempFocusMode(true);
        const t = setTimeout(() => setTempFocusMode(false), 10000);
        // Cleanup handled by React
        return () => clearTimeout(t);
      }
      // Show prime hint once
      if (!primeHintShown && state.points.some((p) => p.label.includes("'"))) {
        setPrimeHintShown(true);
        setPrimeHint("Les points avec ' sont les copies issues de la transformation.");
        const t = setTimeout(() => setPrimeHint(null), 5000);
        return () => clearTimeout(t);
      }
    }
  }, [
    state.segments.length,
    preferences.focusMode,
    state.segments,
    state.points,
    dispatch,
    primeHintShown,
  ]);

  // Track first appearance of clutter for button pulse animation
  const [clutterBtnPulse, setClutterBtnPulse] = useState(false);
  useEffect(() => {
    if (cluttered && !clutterHintShown) {
      setClutterHintShown(true);
      setClutterBtnPulse(true);
      const t = setTimeout(() => setClutterBtnPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [cluttered, clutterHintShown]);

  const effectiveCluttered = cluttered && !forceShowLabels;

  // Filter out elements belonging to hidden transform operations
  const visibleSegments = useMemo(
    () =>
      hiddenOps.size === 0
        ? state.segments
        : state.segments.filter(
            (s) => !s.transformOperation || !hiddenOps.has(s.transformOperation),
          ),
    [state.segments, hiddenOps],
  );
  const visiblePoints = useMemo(
    () =>
      hiddenOps.size === 0
        ? state.points
        : state.points.filter((p) => !p.transformOperation || !hiddenOps.has(p.transformOperation)),
    [state.points, hiddenOps],
  );

  const handleForceShowLabels = useCallback(() => {
    setForceShowLabels((prev) => {
      if (prev) {
        // Turning off — cancel timer
        if (forceShowTimerRef.current) clearTimeout(forceShowTimerRef.current);
        forceShowTimerRef.current = null;
        return false;
      }
      // Turning on — start 8s auto-off timer
      if (forceShowTimerRef.current) clearTimeout(forceShowTimerRef.current);
      forceShowTimerRef.current = setTimeout(() => setForceShowLabels(false), 8000);
      return true;
    });
  }, []);

  const pointMap = useMemo(
    () => new Map(state.points.map((p) => [p.id, { x: p.x, y: p.y }])),
    [state.points],
  );

  // Pre-compute label obstacles for point label placement (anti-overlap)
  const labelObstacles = useMemo(() => {
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
    const map = new Map<string, import('@/engine/label-placement').Obstacle[]>();

    for (const point of state.points) {
      const sx = (point.x - viewport.panX) * pxPerMm;
      const sy = (point.y - viewport.panY) * pxPerMm;
      const obstacles: import('@/engine/label-placement').Obstacle[] = [];

      // Angle labels at this vertex
      for (const angle of derived.angles) {
        if (angle.vertexPointId !== point.id) continue;
        const ray1 = state.points.find((p) => p.id === angle.ray1PointId);
        const ray2 = state.points.find((p) => p.id === angle.ray2PointId);
        if (!ray1 || !ray2) continue;
        const a1 = Math.atan2((ray1.y - point.y) * pxPerMm, (ray1.x - point.x) * pxPerMm);
        const a2 = Math.atan2((ray2.y - point.y) * pxPerMm, (ray2.x - point.x) * pxPerMm);
        let sweep = a2 - a1;
        if (sweep < 0) sweep += 2 * Math.PI;
        const pos = getAngleLabelPosition(sx, sy, a1, sweep);
        obstacles.push({ x: pos.x - sx - 15, y: pos.y - sy - 8, width: 30, height: 16 });
      }

      // Segment length labels for segments touching this point
      for (const seg of state.segments) {
        if (seg.startPointId !== point.id && seg.endPointId !== point.id) continue;
        const sp = state.points.find((p) => p.id === seg.startPointId);
        const ep = state.points.find((p) => p.id === seg.endPointId);
        if (!sp || !ep) continue;
        const sx1 = (sp.x - viewport.panX) * pxPerMm;
        const sy1 = (sp.y - viewport.panY) * pxPerMm;
        const sx2 = (ep.x - viewport.panX) * pxPerMm;
        const sy2 = (ep.y - viewport.panY) * pxPerMm;
        const pos = getSegmentLabelPosition(sx1, sy1, sx2, sy2);
        obstacles.push({ x: pos.x - sx - 20, y: pos.y - sy - 8, width: 40, height: 16 });
      }

      map.set(point.id, obstacles);
    }
    return map;
  }, [state.points, state.segments, derived.angles, viewport]);

  // Pre-compute ALL segment length label positions as obstacles for angle labels
  const angleLabelObstacles = useMemo(() => {
    const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
    const segFontSize = Math.max(13, 13 * effectiveFontScale);
    const estW = 6 * segFontSize * 0.65;
    const estH = segFontSize * 1.3;

    // Compute all segment label bboxes once
    const allSegLabels: import('@/engine/label-placement').Obstacle[] = [];
    for (const seg of state.segments) {
      const sp = state.points.find((p) => p.id === seg.startPointId);
      const ep = state.points.find((p) => p.id === seg.endPointId);
      if (!sp || !ep) continue;
      const sx1 = (sp.x - viewport.panX) * pxPerMm;
      const sy1 = (sp.y - viewport.panY) * pxPerMm;
      const sx2 = (ep.x - viewport.panX) * pxPerMm;
      const sy2 = (ep.y - viewport.panY) * pxPerMm;
      const pos = getSegmentLabelPosition(sx1, sy1, sx2, sy2);
      allSegLabels.push({ x: pos.x - estW / 2, y: pos.y - estH / 2, width: estW, height: estH });
    }

    // Every vertex gets ALL segment labels as potential obstacles
    const map = new Map<string, import('@/engine/label-placement').Obstacle[]>();
    for (const point of state.points) {
      map.set(point.id, allSegLabels);
    }
    return map;
  }, [state.points, state.segments, viewport, effectiveFontScale]);

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
    const isSignificantSnap =
      snapType === 'point' || snapType === 'midpoint' || snapType === 'segment';
    const wasSignificant =
      prevSnapTypeRef.current === 'point' ||
      prevSnapTypeRef.current === 'midpoint' ||
      prevSnapTypeRef.current === 'segment';
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
  const [figureClosedHint, setFigureClosedHint] = useState<string | null>(null);
  useEffect(() => {
    if (derived.figures.length > prevFigCountRef.current) {
      soundEngineRef.current?.playFigureClosed();
      if (state.hideProperties) {
        setFigureClosedHint('Tu as fermé une figure ! Observe ses propriétés.');
        const t = setTimeout(() => setFigureClosedHint(null), 4000);
        return () => clearTimeout(t);
      }
    }
    prevFigCountRef.current = derived.figures.length;
  }, [derived.figures.length, state.hideProperties]);

  // Persist panel collapsed state
  useEffect(() => {
    localStorage.setItem('geomolo_panel_collapsed', String(panelCollapsed));
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
  const containerW = containerSize.width || window.innerWidth;
  const containerH = containerSize.height || window.innerHeight;
  const svgWidth = Math.max(BOUNDS_WIDTH_MM * pxPerMm, containerW);
  const svgHeight = Math.max(BOUNDS_HEIGHT_MM * pxPerMm, containerH);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: UI_BG,
        color: UI_TEXT_PRIMARY,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
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
            .geomolo, clique « Ouvrir » pour les retrouver.
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

      {/* Toolbar */}
      <Toolbar
        activeTool={state.activeTool}
        displayMode={state.displayMode}
        onToolChange={handleToolChange}
        pointToolVisible={state.pointToolVisible}
        fontScale={effectiveFontScale}
        demoMode={demoMode}
        onShowAbout={() => setShowAbout(true)}
        onModeChange={handleModeChange}
      />

      {/* Status Bar — primary sequencing guide for TDC */}
      <div
        style={{
          height: STATUS_BAR_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: tutorial.isActive && tutorial.step !== 'post' ? '#FEF3C7' : STATUS_BAR_BG,
          borderBottom: '1px solid #D1D8E0',
          borderLeft: `3px solid ${tutorial.isActive && tutorial.step !== 'post' ? '#D97706' : UI_PRIMARY}`,
          fontSize: 13 * effectiveFontScale,
          color: '#4A5568',
        }}
        role="status"
        aria-live="polite"
        data-testid="status-bar"
      >
        {/* Tutorial mode: show tutorial messages instead of tool status */}
        {tutorial.isActive && tutorial.step !== 'post' && typeof tutorial.step === 'number' ? (
          <>
            <span
              style={{
                background: '#D97706',
                color: '#FFF',
                padding: '1px 8px',
                borderRadius: 4,
                fontSize: 12 * effectiveFontScale,
                fontWeight: 600,
                marginRight: 6,
                whiteSpace: 'nowrap',
              }}
            >
              Tutoriel
            </span>
            <span style={{ flex: 1 }}>{tutorial.currentMessage}</span>
            {tutorial.step === 4 && (
              <button
                onClick={tutorial.finish}
                style={{
                  minHeight: 32,
                  padding: '0 12px',
                  background: UI_PRIMARY,
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  marginLeft: 8,
                }}
                data-testid="tutorial-finish"
              >
                Commencer
              </button>
            )}
            <button
              onClick={tutorial.skip}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#B45309',
                fontSize: 12,
                marginLeft: 8,
                whiteSpace: 'nowrap',
              }}
              data-testid="tutorial-skip"
            >
              Passer
            </button>
          </>
        ) : (
          <>
            {(() => {
              const raw = tool.statusMessage;
              const dashIdx = raw.indexOf(' — ');
              if (dashIdx < 0) return raw; // hint messages without separator
              const toolName = raw.slice(0, dashIdx);
              const instruction = raw.slice(dashIdx + 3);
              // Parse step progress from toolName (e.g. "Étape 1/2 — Segment")
              const stepMatch = toolName.match(/(\d+)\/(\d+)/);
              const stepCurrent = stepMatch ? parseInt(stepMatch[1]!, 10) : 0;
              const stepTotal = stepMatch ? parseInt(stepMatch[2]!, 10) : 0;

              return (
                <>
                  <span
                    style={{
                      background: UI_PRIMARY,
                      color: '#FFF',
                      padding: '1px 8px',
                      borderRadius: 4,
                      fontSize: 12 * effectiveFontScale,
                      fontWeight: 600,
                      marginRight: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stepTotal >= 2 && (
                      <span style={{ marginRight: 5 }}>
                        {Array.from({ length: stepTotal }, (_, i) => (
                          <span
                            key={i}
                            style={{
                              display: 'inline-block',
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: i < stepCurrent ? '#FFF' : 'rgba(255,255,255,0.35)',
                              margin: '0 1px',
                            }}
                          />
                        ))}
                      </span>
                    )}
                    {toolName}
                  </span>
                  {instruction}
                  {state.estimationMode && !estimationRevealed && (
                    <span
                      style={{
                        background: '#FEF3C7',
                        color: '#B45309',
                        padding: '2px 10px',
                        borderRadius: 4,
                        fontSize: 12 * effectiveFontScale,
                        fontWeight: 600,
                        marginLeft: 8,
                        whiteSpace: 'nowrap',
                      }}
                      data-testid="estimation-badge"
                    >
                      ◈ Estimation
                    </span>
                  )}
                </>
              );
            })()}
            {shiftConstraintActive && ' — Contrainte 15° active'}
            {figureClosedHint && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12 * effectiveFontScale,
                  color: '#0a7e7a',
                  fontWeight: 600,
                  animation: 'figure-closed-flash 400ms ease-out',
                }}
              >
                ✓ {figureClosedHint}
              </span>
            )}
            {primeHint && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 11 * effectiveFontScale,
                  color: UI_TEXT_SECONDARY,
                  fontStyle: 'italic',
                }}
              >
                {primeHint}
              </span>
            )}
            {/* Right-side buttons grouped in a single flex container */}
            {(!tool.isIdle || cluttered || (!demoMode && state.consigne && consigneDismissed)) && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                {cluttered && (
                  <button
                    onClick={handleForceShowLabels}
                    style={{
                      padding: '2px 10px',
                      background: forceShowLabels ? '#E8F0FA' : 'transparent',
                      border: `1px solid ${forceShowLabels ? UI_PRIMARY : '#D1D8E0'}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12 * effectiveFontScale,
                      fontWeight: 500,
                      color: forceShowLabels ? UI_PRIMARY : '#4A5568',
                      whiteSpace: 'nowrap',
                      minHeight: 28,
                      animation: clutterBtnPulse ? 'glow-pulse 0.6s ease-in-out 3' : undefined,
                    }}
                    data-testid="show-labels-btn"
                    title="Afficher les mesures sur le canevas"
                  >
                    {forceShowLabels ? '✓ Mesures' : 'Mesures'}
                  </button>
                )}
                {!tool.isIdle && (
                  <button
                    onClick={() => tool.reset()}
                    style={{
                      padding: '2px 12px',
                      background: UI_PRIMARY,
                      color: '#FFF',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12 * effectiveFontScale,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      minHeight: 44,
                      minWidth: 44,
                    }}
                    data-testid="status-escape-btn"
                  >
                    {state.activeTool === 'move' ? 'Annuler' : 'Terminer'}
                  </button>
                )}
                {!demoMode && state.consigne && consigneDismissed && (
                  <button
                    onClick={() => setConsigneDismissed(false)}
                    style={{
                      padding: '2px 8px',
                      background: '#E6F1FB',
                      border: '1px solid #C5D8EC',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                      color: '#0a7e7a',
                      whiteSpace: 'nowrap',
                    }}
                    data-testid="consigne-show"
                  >
                    Voir la consigne
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Canvas + Panel row */}
      <div
        style={{
          display: 'flex',
          flexDirection: preferences.panelPosition === 'left' ? 'row-reverse' : 'row',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Canvas area */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: canvasColors.bg,
            touchAction: 'none',
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

          <CanvasColorsProvider value={canvasColors}>
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              role="application"
              aria-label="Canevas de construction géométrique"
              style={{
                display: 'block',
                touchAction: 'none',
                cursor: getCanvasCursor(
                  state.activeTool,
                  tool.isActiveGesture,
                  tool.isIdle,
                  !!selection.hoveredElement,
                  shiftConstraintActive,
                ),
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              data-testid="canvas-svg"
            >
              <PrintGuideLayer
                viewport={viewport}
                pageFormat={preferences.pageFormat}
                landscape={printLandscape}
              />
              <GridLayer
                viewport={viewport}
                gridSizeMm={state.gridSizeMm}
                pageFormat={preferences.pageFormat}
                landscape={printLandscape}
                reinforced={preferences.reinforcedGrid}
              />
              {state.cartesianMode !== 'off' && state.displayMode === 'complet' && (
                <CartesianLayer
                  viewport={viewport}
                  mode={state.cartesianMode}
                  gridSizeMm={state.gridSizeMm}
                  displayUnit={state.displayUnit}
                />
              )}
              {/* Dim existing construction during ghost preview (rotation/homothety) */}
              <g opacity={tool.isPreviewActive ? 0.15 : undefined}>
                <SegmentLayer
                  segments={visibleSegments}
                  points={visiblePoints}
                  viewport={viewport}
                  displayUnit={state.displayUnit}
                  selectedElementId={state.selectedElementId}
                  properties={derived.properties}
                  hideProperties={gestureHideProperties}
                  fontScale={effectiveFontScale}
                  segmentColor={effectiveSegmentColor}
                  estimationMode={state.estimationMode && !estimationRevealed}
                  cluttered={effectiveCluttered}
                  hoveredElementId={hoveredPanelElementId ?? selection.hoveredElement?.id ?? null}
                  focusDimmedIds={focusDimmedIds}
                />
                <CircleLayer
                  circles={state.circles}
                  points={state.points}
                  viewport={viewport}
                  selectedElementId={state.selectedElementId}
                  displayUnit={state.displayUnit}
                  fontScale={effectiveFontScale}
                  estimationMode={state.estimationMode}
                  focusDimmedIds={focusDimmedIds}
                />
                <PointLayer
                  points={visiblePoints}
                  viewport={viewport}
                  selectedElementId={state.selectedElementId}
                  fontScale={effectiveFontScale}
                  pointColor={effectiveSegmentColor}
                  labelObstacles={labelObstacles}
                  focusDimmedIds={focusDimmedIds}
                />
              </g>

              {/* Angle arcs and markers */}
              <AngleLayer
                angles={derived.angles}
                points={pointMap}
                viewport={viewport}
                displayMode={state.displayMode}
                cluttered={effectiveCluttered}
                selectedElementId={state.selectedElementId}
                hoveredElementId={hoveredPanelElementId ?? selection.hoveredElement?.id ?? null}
                hideProperties={gestureHideProperties}
                fontScale={effectiveFontScale}
                estimationMode={state.estimationMode && !estimationRevealed}
                activeGestureHideAll={!!tool.isActiveGesture && !tool.activePointId}
                activeVertexPointId={tool.activePointId ?? undefined}
                angleLabelObstacles={angleLabelObstacles}
                focusDimmedIds={focusDimmedIds}
              />

              {/* Text boxes */}
              <TextBoxLayer
                textBoxes={state.textBoxes}
                viewport={viewport}
                selectedElementId={state.selectedElementId}
                fontScale={effectiveFontScale}
              />

              {/* Tool-specific overlays (ghost segment, ghost circle, etc.) */}
              {tool.overlayElements}

              {/* Snap feedback */}
              <SnapFeedback snapResult={tool.snapResult} viewport={viewport} />
            </svg>
          </CanvasColorsProvider>

          {/* Context action bar — hidden during compound tool workflows
             where clicking an element is a tool action, not a general selection */}
          {state.selectedElementId &&
            !COMPOUND_TOOLS.includes(state.activeTool) &&
            !fixingSegmentId &&
            !fixingCircleId && (
              <ContextActionBar
                state={state}
                viewport={viewport}
                onToggleLock={handleToggleLock}
                onFixCircleRadius={setFixingCircleId}
                onFixSegmentLength={handleFixSegmentLength}
                onDeleteElement={handleDeleteElement}
                containerWidth={containerSize.width}
                fontScale={effectiveFontScale}
              />
            )}

          {/* Tool-specific floating panel (e.g. frieze count stepper) */}
          {/* On narrow (tablet), position at top to avoid hand grip zone conflict */}
          {tool.toolPanel && (
            <div
              style={{
                position: 'absolute',
                ...(isNarrow
                  ? { top: 80, left: '50%', transform: 'translateX(-50%)' }
                  : {
                      bottom: STATUS_BAR_HEIGHT + 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }),
                zIndex: 25,
              }}
            >
              {tool.toolPanel}
            </div>
          )}

          {/* Length input for segment fixing (contextual action, spec §6.8, §9.5) */}
          {fixingSegmentId &&
            (() => {
              const seg = state.segments.find((s) => s.id === fixingSegmentId);
              if (!seg) return null;
              const sp = state.points.find((p) => p.id === seg.startPointId);
              const ep = state.points.find((p) => p.id === seg.endPointId);
              const label = sp && ep ? sp.label + ep.label : '';
              const pxPerMm = viewport.zoom * CSS_PX_PER_MM;
              const midPx =
                sp && ep
                  ? {
                      x: ((sp.x + ep.x) / 2 - viewport.panX) * pxPerMm,
                      y: ((sp.y + ep.y) / 2 - viewport.panY) * pxPerMm,
                    }
                  : undefined;
              return (
                <LengthInput
                  segmentLabel={label}
                  currentLengthMm={seg.lengthMm}
                  displayUnit={state.displayUnit}
                  fixedLengthMm={seg.fixedLength}
                  positionPx={midPx}
                  containerWidth={containerSize.width}
                  onSubmit={(lengthMm) => {
                    dispatch({ type: 'FIX_SEGMENT_LENGTH', segmentId: seg.id, lengthMm });
                    setFixingSegmentId(null);
                    selection.clearSelection();
                  }}
                  onClear={() => {
                    dispatch({ type: 'UNFIX_SEGMENT_LENGTH', segmentId: seg.id });
                  }}
                  onDismiss={() => setFixingSegmentId(null)}
                />
              );
            })()}

          {/* Radius/Diameter input for circles (spec §6.3) */}
          {fixingCircleId &&
            (() => {
              const circle = state.circles.find((c) => c.id === fixingCircleId);
              if (!circle) return null;
              const center = state.points.find((p) => p.id === circle.centerPointId);
              const anchorScreenPos = center
                ? {
                    x: (center.x - viewport.panX) * viewport.zoom * CSS_PX_PER_MM,
                    y: (center.y - viewport.panY) * viewport.zoom * CSS_PX_PER_MM,
                  }
                : undefined;
              return (
                <RadiusInput
                  circleLabel={center?.label ?? ''}
                  currentRadiusMm={circle.radiusMm}
                  displayUnit={state.displayUnit}
                  anchorScreenPos={anchorScreenPos}
                  onSubmit={(radiusMm) => {
                    dispatch({ type: 'SET_CIRCLE_RADIUS', circleId: circle.id, radiusMm });
                    setFixingCircleId(null);
                  }}
                  onDismiss={() => setFixingCircleId(null)}
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
            zoomLevel={viewport.zoom}
            onZoomReset={resetZoom}
            hidePanButtons={isNarrow}
          />

          {/* Post-tutorial message — central overlay for task initiation (TDC accommodation) */}
          {tutorial.step === 'post' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                zIndex: 25,
              }}
              onClick={tutorial.dismissPost}
              data-testid="tutorial-post"
            >
              <span
                style={{
                  fontSize: 18,
                  color: '#7A8B99',
                  pointerEvents: 'none',
                }}
              >
                Clique n'importe où pour commencer!
              </span>
            </div>
          )}
        </div>

        {/* Properties Panel — sidebar on desktop, modal overlay on mobile */}
        {!isNarrow && (
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
            panelPosition={preferences.panelPosition}
            fontScale={effectiveFontScale}
            estimationActive={state.estimationMode && !estimationRevealed}
            onHoverElement={setHoveredPanelElementId}
            hoveredElementId={hoveredPanelElementId}
            showAllProperties={showAllProps}
            onToggleShowAll={() => setShowAllProps(!showAllProps)}
            hiddenOps={hiddenOps}
            onToggleOp={(opId) =>
              setHiddenOps((prev) => {
                const next = new Set(prev);
                if (next.has(opId)) next.delete(opId);
                else next.add(opId);
                return next;
              })
            }
            onSetConsigne={(text) => dispatch({ type: 'SET_CONSIGNE', consigne: text })}
          />
        )}
        {isNarrow && (
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            style={{
              position: 'absolute',
              bottom: 52,
              right: 8,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: '#FFFFFF',
              border: '1px solid #D1D8E0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              zIndex: 20,
            }}
            aria-label="Propriétés"
            data-testid="panel-toggle-mobile"
          >
            {hasNewProperties ? '📐●' : '📐'}
          </button>
        )}
      </div>

      {/* Mobile panel bottom sheet */}
      {isNarrow && !panelCollapsed && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.2)',
            zIndex: 1000,
          }}
          onClick={() => setPanelCollapsed(true)}
        >
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              height: '50vh',
              maxHeight: '75vh',
              background: UI_BG,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: 'auto',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
              animation: 'slide-up 200ms ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: '#C0C8D0',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 16px 8px',
                borderBottom: '1px solid #D1D8E0',
              }}
            >
              <strong>Propriétés</strong>
              <button
                onClick={() => setPanelCollapsed(true)}
                style={{
                  width: 44,
                  height: 44,
                  background: 'transparent',
                  border: 'none',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
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
              onSelectElement={(id) => {
                dispatch({ type: 'SET_SELECTED_ELEMENT', elementId: id });
                setPanelCollapsed(true);
              }}
              collapsed={false}
              onToggleCollapsed={() => setPanelCollapsed(true)}
              hasNewProperties={false}
              fontScale={effectiveFontScale}
              estimationActive={state.estimationMode && !estimationRevealed}
              onHoverElement={setHoveredPanelElementId}
              hoveredElementId={hoveredPanelElementId}
              hiddenOps={hiddenOps}
              onToggleOp={(opId) =>
                setHiddenOps((prev) => {
                  const next = new Set(prev);
                  if (next.has(opId)) next.delete(opId);
                  else next.add(opId);
                  return next;
                })
              }
              onSetConsigne={(text) => dispatch({ type: 'SET_CONSIGNE', consigne: text })}
              showAllProperties={showAllProps}
              onToggleShowAll={() => setShowAllProps(!showAllProps)}
            />
          </div>
        </div>
      )}

      {/* PWA update prompt (spec §4.1.2) */}
      {/* Action Bar */}
      <ActionBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPrint={handlePrint}
        onShareLink={() => setShowShareDialog(true)}
        fontScale={effectiveFontScale}
        estimationMode={state.estimationMode}
        onToggleEstimation={() => setEstimationRevealed((prev) => !prev)}
        onShowSlotManager={() => setShowSlotManager(true)}
        onShowSettings={() => setShowSettings(true)}
        onShowGuide={() => setShowHelp(true)}
        onToggleDemoMode={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
            setDemoMode(false);
          } else {
            document.documentElement.requestFullscreen?.()?.then(
              () => setDemoMode(true),
              () => {
                /* fullscreen refused */
              },
            );
          }
        }}
        demoMode={demoMode}
        snapEnabled={state.snapEnabled}
        onSnapToggle={handleSnapToggle}
        gridSizeMm={state.gridSizeMm}
        onGridChange={handleGridChange}
        displayUnit={state.displayUnit}
        onUnitChange={handleUnitChange}
      />

      {showPrintDialog && (
        <PrintDialog
          state={state}
          slotName={
            slotManager.registry.slots.find((s) => s.id === slotManager.activeSlotId)?.name ??
            'Construction 1'
          }
          landscape={printLandscape}
          onLandscapeChange={setPrintLandscape}
          includeMeasurements={printIncludeMeasurements}
          onIncludeMeasurementsChange={setPrintIncludeMeasurements}
          includeConsigne={printIncludeConsigne}
          onIncludeConsigneChange={setPrintIncludeConsigne}
          onClose={() => setShowPrintDialog(false)}
          onRecenter={() => {
            // TODO: RECENTER_CONSTRUCTION action
            setShowPrintDialog(false);
          }}
        />
      )}

      {showShareDialog && <ShareDialog state={state} onClose={() => setShowShareDialog(false)} />}

      {/* Hidden print SVG — visible only in @media print */}
      <PrintSvg
        state={state}
        landscape={printLandscape}
        pageFormat={preferences.pageFormat}
        includeMeasurements={printIncludeMeasurements}
        includeConsigne={printIncludeConsigne}
      />

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
            if (state.points.length > 0) {
              setShowConfirmNew(true);
            } else {
              slotManager.createNewSlot(name);
              setShowSlotManager(false);
            }
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

      {/* Confirm dialog for new construction */}
      {showConfirmNew && (
        <ConfirmDialog
          title={CONFIRM_NEW_TITLE}
          subtitle={CONFIRM_NEW_SUBTITLE(
            slotManager.registry.slots.find((s) => s.id === slotManager.activeSlotId)?.name ??
              'Construction',
          )}
          confirmLabel={CONFIRM_NEW_CONFIRM}
          cancelLabel={CONFIRM_NEW_CANCEL}
          onConfirm={() => {
            slotManager.createNewSlot();
            setShowConfirmNew(false);
            setShowSlotManager(false);
          }}
          onCancel={() => setShowConfirmNew(false)}
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
          estimationMode={state.estimationMode}
          onEstimationModeChange={(v) => {
            dispatch({ type: 'SET_ESTIMATION_MODE', enabled: v });
            setEstimationRevealed(false);
          }}
          cartesianMode={state.cartesianMode}
          onCartesianModeChange={(v) => dispatch({ type: 'SET_CARTESIAN_MODE', mode: v })}
          autoIntersection={state.autoIntersection}
          onAutoIntersectionChange={(v) => dispatch({ type: 'SET_AUTO_INTERSECTION', enabled: v })}
          clutterThreshold={state.clutterThreshold}
          onClutterThresholdChange={(v) =>
            dispatch({ type: 'SET_CLUTTER_THRESHOLD', clutterThreshold: v })
          }
          displayMode={state.displayMode}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* About dialog */}
      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}

      {showHelp && (
        <HelpDialog
          onClose={() => setShowHelp(false)}
          onStartTutorial={() => {
            setShowHelp(false);
            tutorial.start();
          }}
          onShowAbout={() => {
            setShowHelp(false);
            setShowAbout(true);
          }}
        />
      )}

      {/* Fatigue reminder */}
      {showFatigueReminder && <FatigueReminder onDismiss={() => setShowFatigueReminder(false)} />}
    </div>
  );
}

export function App({ initialRegistry, initialState, initialUndoManager }: AppProps) {
  return (
    <ErrorBoundary>
      <PreferencesProvider>
        <ConstructionProvider initialState={initialState} initialUndoManager={initialUndoManager}>
          <AppContent initialRegistry={initialRegistry} />
        </ConstructionProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  );
}
