import { memo } from 'react';
import type { ToolType, SegmentToolPhase } from '@/model/types';
import { STATUS_BAR_HEIGHT, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from '@/config/theme';
import {
  STATUS_SEGMENT_IDLE,
  STATUS_SEGMENT_FIRST_PLACED,
  STATUS_SEGMENT_CHAINING,
  STATUS_MOVE_IDLE,
  STATUS_MEASURE_IDLE,
} from '@/config/messages';

interface StatusBarProps {
  readonly activeTool: ToolType;
  readonly segmentPhase: SegmentToolPhase;
  readonly chainingLabel?: string;
}

function getStatusMessage(
  activeTool: ToolType,
  segmentPhase: SegmentToolPhase,
  chainingLabel?: string,
): string {
  if (activeTool === 'segment') {
    switch (segmentPhase) {
      case 'idle':
        return STATUS_SEGMENT_IDLE;
      case 'first_point_placed':
        return STATUS_SEGMENT_FIRST_PLACED;
      case 'segment_created':
        return STATUS_SEGMENT_CHAINING(chainingLabel ?? '?');
    }
  }

  if (activeTool === 'move') return STATUS_MOVE_IDLE;
  if (activeTool === 'measure') return STATUS_MEASURE_IDLE;

  return '';
}

export const StatusBar = memo(function StatusBar({
  activeTool,
  segmentPhase,
  chainingLabel,
}: StatusBarProps) {
  const message = getStatusMessage(activeTool, segmentPhase, chainingLabel);

  return (
    <div
      style={{
        height: STATUS_BAR_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: '#EDF1F5',
        borderBottom: '1px solid #D1D8E0',
        fontSize: 13,
        color: UI_TEXT_SECONDARY,
      }}
      role="status"
      aria-live="polite"
      data-testid="status-bar"
    >
      <span style={{ color: UI_TEXT_PRIMARY, fontWeight: 600, marginRight: 4 }}>
        {activeTool === 'segment'
          ? 'Segment'
          : activeTool === 'move'
            ? 'Déplacer'
            : activeTool === 'measure'
              ? 'Mesurer'
              : ''}
      </span>
      <span>{message.includes('—') ? message.split('—')[1]?.trim() : message}</span>
    </div>
  );
});
