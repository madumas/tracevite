import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConstructionProvider,
  useConstructionState,
  useConstructionDispatch,
} from '@/model/context';
import { StatusBar } from '@/components/StatusBar';
import { Toolbar } from '@/components/Toolbar';
import { ActionBar } from '@/components/ActionBar';
import { LevelSelector } from '@/components/LevelSelector';
import { SaveIndicator } from '@/components/SaveIndicator';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { GhostSegment } from '@/components/GhostSegment';
import { SnapFeedback } from '@/components/SnapFeedback';
import { ChainingIndicator } from '@/components/ChainingIndicator';
import { useSegmentTool } from '@/hooks/useSegmentTool';
import { usePointerInteraction } from '@/hooks/usePointerInteraction';
import { useViewport } from '@/hooks/useViewport';
import { useBeforeUnload } from '@/hooks/useBeforeUnload';
import { useAutoSave } from '@/hooks/useAutoSave';
import { UI_BG, UI_TEXT_PRIMARY, CANVAS_BG, HEADER_HEIGHT } from '@/config/theme';
import { CSS_PX_PER_MM, BOUNDS_WIDTH_MM, BOUNDS_HEIGHT_MM } from '@/engine/viewport';
import { GridLayer } from '@/components/GridLayer';
import { SegmentLayer } from '@/components/SegmentLayer';
import { PointLayer } from '@/components/PointLayer';
import { NavigationControls } from '@/components/NavigationControls';
import {
  CONFIRM_NEW_TITLE,
  CONFIRM_NEW_SUBTITLE,
  CONFIRM_NEW_CANCEL,
  CONFIRM_NEW_CONFIRM,
} from '@/config/messages';
import type { ToolType, GridSize, DisplayUnit, SchoolLevel } from '@/model/types';

function AppContent() {
  const { state, canUndo, canRedo, undoManager } = useConstructionState();
  const dispatch = useConstructionDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewport, zoomIn, zoomOut, panUp, panDown, panLeft, panRight } =
    useViewport(containerRef);
  const [showNewConfirm, setShowNewConfirm] = useState(false);

  const { saving } = useAutoSave(state, undoManager);
  const segmentTool = useSegmentTool({ state, dispatch });

  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePointerInteraction({
    viewport,
    onCanvasClick: segmentTool.handleClick,
    onCursorMove: segmentTool.handleCursorMove,
  });

  const hasElements = state.points.length > 0;

  // Prevent accidental tab closure
  useBeforeUnload(hasElements);

  // Toolbar handlers
  const handleToolChange = useCallback(
    (tool: ToolType) => {
      segmentTool.reset();
      dispatch({ type: 'SET_ACTIVE_TOOL', activeTool: tool });
    },
    [dispatch, segmentTool],
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
  const handlePrint = useCallback(() => {
    // Placeholder — wired in Milestone C
  }, []);
  const handleNewConstruction = useCallback(() => setShowNewConfirm(true), []);
  const handleConfirmNew = useCallback(() => {
    dispatch({ type: 'NEW_CONSTRUCTION' });
    segmentTool.reset();
    setShowNewConfirm(false);
  }, [dispatch, segmentTool]);

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNewConfirm) {
          setShowNewConfirm(false);
        } else {
          segmentTool.handleEscape();
        }
      }
      const inInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
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
        if (state.selectedElementId && !(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          dispatch({ type: 'REMOVE_ELEMENT', elementId: state.selectedElementId });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    segmentTool,
    canUndo,
    canRedo,
    dispatch,
    showNewConfirm,
    hasElements,
    handlePrint,
    state.selectedElementId,
  ]);

  // Find chaining anchor
  const chainingAnchor = segmentTool.chainingAnchorId
    ? state.points.find((p) => p.id === segmentTool.chainingAnchorId)
    : undefined;

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
        onToolChange={handleToolChange}
        onGridChange={handleGridChange}
        onUnitChange={handleUnitChange}
        onSnapToggle={handleSnapToggle}
      />

      {/* Status Bar */}
      <StatusBar
        activeTool={state.activeTool}
        segmentPhase={segmentTool.phase}
        chainingLabel={chainingAnchor?.label}
      />

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
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="application"
          aria-label="Canevas de construction géométrique"
          style={{ display: 'block', touchAction: 'none' }}
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
          <PointLayer
            points={state.points}
            viewport={viewport}
            selectedElementId={state.selectedElementId}
          />
          {segmentTool.firstPointMm && segmentTool.cursorMm && (
            <GhostSegment
              startMm={segmentTool.firstPointMm}
              endMm={segmentTool.snapResult?.snappedPosition ?? segmentTool.cursorMm}
              viewport={viewport}
              displayUnit={state.displayUnit}
              isChaining={segmentTool.phase === 'segment_created'}
            />
          )}
          {chainingAnchor && segmentTool.phase === 'segment_created' && (
            <ChainingIndicator point={chainingAnchor} viewport={viewport} />
          )}
          <SnapFeedback snapResult={segmentTool.snapResult} viewport={viewport} />
        </svg>

        <NavigationControls
          onPanUp={panUp}
          onPanDown={panDown}
          onPanLeft={panLeft}
          onPanRight={panRight}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />
      </div>

      {/* Action Bar */}
      <ActionBar
        canUndo={canUndo}
        canRedo={canRedo}
        canPrint={hasElements}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPrint={handlePrint}
        onNewConstruction={handleNewConstruction}
      />

      {/* New construction confirmation dialog */}
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
    </div>
  );
}

export function App() {
  return (
    <ConstructionProvider>
      <AppContent />
    </ConstructionProvider>
  );
}
