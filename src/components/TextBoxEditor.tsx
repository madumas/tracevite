/**
 * TextBoxEditor — inline HTML textarea overlay for editing text boxes.
 * Positioned over the SVG canvas using getBoundingClientRect().
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { UI_PRIMARY } from '@/config/theme';

interface TextBoxEditorProps {
  readonly initialText: string;
  readonly targetRect: DOMRect; // bounding rect of the SVG <rect> element
  readonly fontSize: number; // px, matching the SVG text size
  readonly paddingPx: number; // px, matching the SVG rect internal padding
  readonly onCommit: (text: string) => void;
  readonly onCancel: () => void;
}

export function TextBoxEditor({
  initialText,
  targetRect,
  fontSize,
  paddingPx,
  onCommit,
  onCancel,
}: TextBoxEditorProps) {
  const [text, setText] = useState(initialText);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleCommit = useCallback(() => {
    onCommit(text.trim());
  }, [text, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [handleCommit, onCancel],
  );

  return (
    <textarea
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value.slice(0, 1000))}
      onKeyDown={handleKeyDown}
      onBlur={handleCommit}
      placeholder="Texte..."
      style={{
        position: 'fixed',
        left: targetRect.left,
        top: targetRect.top,
        width: Math.max(200, targetRect.width),
        minHeight: Math.max(44, targetRect.height),
        padding: paddingPx,
        fontSize,
        lineHeight: 1.4,
        fontFamily: 'system-ui, sans-serif',
        border: `2px solid ${UI_PRIMARY}`,
        borderRadius: 4,
        outline: 'none',
        resize: 'both',
        zIndex: 30,
        background: 'rgba(255,255,255,0.95)',
        boxSizing: 'border-box',
        margin: 0,
      }}
    />
  );
}
