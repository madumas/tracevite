/**
 * Multi-tab guard (QA item 1.10).
 *
 * Approach (validated by neuropsy + UX reviews): rather than synchronize state
 * across tabs (complex, ambiguous messages to the child), we detect a second
 * tab and block the UI with a clear message. In classroom use a second
 * GéoMolo tab is almost always accidental.
 *
 * Protocol:
 *   - Each tab generates a random `tabId` and opens BroadcastChannel('geomolo_heartbeat').
 *   - Broadcasts `{ type: 'hello', tabId }` immediately and every 2s.
 *   - Any other live tab replies `{ type: 'already_here', tabId }`. Receiving
 *     `already_here` flips the new tab into the `isDuplicate` state.
 *   - `takeOver()` broadcasts `{ type: 'takeover', tabId }`. The currently-
 *     active tab receives it and flags itself as duplicate — enabling the
 *     blocked tab to become the single live one. This is the recovery path
 *     when `window.close()` is no-op'd by the browser (tab wasn't script-
 *     opened, which is the common case in classroom workflows).
 *
 * Graceful fallback if BroadcastChannel isn't supported — hook stays quiet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface TabSyncResult {
  /** True when this tab has been told another tab is already active. */
  isDuplicate: boolean;
  /** Demand exclusive use of this tab; the previously-active tab becomes a duplicate. */
  takeOver: () => void;
}

export function useTabSync(): TabSyncResult {
  const [isDuplicate, setIsDuplicate] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>('');
  const flaggedRef = useRef(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    tabIdRef.current = tabId;

    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel('geomolo_heartbeat');
    } catch {
      return;
    }
    channelRef.current = channel;

    const setFlagged = (flag: boolean) => {
      flaggedRef.current = flag;
      setIsDuplicate(flag);
    };

    channel.onmessage = (event: MessageEvent<{ type: string; tabId: string }>) => {
      const msg = event.data;
      if (!msg || msg.tabId === tabId) return;

      if (msg.type === 'hello' && !flaggedRef.current) {
        // Another tab announcing itself — reply that we're already alive.
        channel.postMessage({ type: 'already_here', tabId });
      } else if (msg.type === 'already_here') {
        // We were greeted by an existing tab → we are the duplicate.
        setFlagged(true);
      } else if (msg.type === 'takeover') {
        // The other tab wants to take over — we become the duplicate.
        setFlagged(true);
      }
    };

    const sendHello = () => {
      if (flaggedRef.current) return;
      try {
        channel.postMessage({ type: 'hello', tabId });
      } catch {
        /* channel closed — ignore */
      }
    };

    sendHello();
    const heartbeat = window.setInterval(sendHello, 2000);

    return () => {
      clearInterval(heartbeat);
      try {
        channel.close();
      } catch {
        /* already closed */
      }
      channelRef.current = null;
    };
  }, []);

  const takeOver = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) {
      // No multi-tab channel available — best-effort: clear the duplicate flag
      // so the UI unblocks. The legacy tab won't know, but that's acceptable
      // fallback for browsers without BroadcastChannel.
      flaggedRef.current = false;
      setIsDuplicate(false);
      return;
    }
    try {
      channel.postMessage({ type: 'takeover', tabId: tabIdRef.current });
    } catch {
      /* channel closed */
    }
    flaggedRef.current = false;
    setIsDuplicate(false);
  }, []);

  return { isDuplicate, takeOver };
}
