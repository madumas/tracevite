/**
 * Multi-tab guard (QA item 1.10).
 *
 * Approach (validated by neuropsy + UX reviews): rather than synchronize state
 * across tabs (complex, ambiguous messages to the child), we simply detect a
 * second tab and block the UI with a clear message. In classroom use, a second
 * GéoMolo tab is almost always an accident.
 *
 * Protocol:
 *   1. On mount, each tab generates a random `tabId` and opens a
 *      BroadcastChannel('geomolo_heartbeat').
 *   2. It broadcasts `{ type: 'hello', tabId }` immediately and every 2s.
 *   3. Any tab that receives a `hello` from a different `tabId` replies with
 *      `{ type: 'already_here', tabId: self }` — unless it has already been
 *      flagged as a duplicate itself.
 *   4. When a tab receives `already_here`, it sets `isDuplicate = true` and
 *      stops broadcasting. The caller renders a blocking screen.
 *
 * The first tab to have started (whose heartbeat arrives first on the channel
 * after a new tab opens) "wins". Graceful fallback if BroadcastChannel isn't
 * supported — the hook just does nothing.
 */

import { useEffect, useState } from 'react';

interface TabSyncResult {
  isDuplicate: boolean;
}

export function useTabSync(): TabSyncResult {
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel('geomolo_heartbeat');
    } catch {
      return;
    }

    let flagged = false;
    const setFlagged = () => {
      flagged = true;
      setIsDuplicate(true);
    };

    channel.onmessage = (event: MessageEvent<{ type: string; tabId: string }>) => {
      const msg = event.data;
      if (!msg || msg.tabId === tabId) return;

      if (msg.type === 'hello' && !flagged) {
        // Another tab is announcing itself. Tell it we're already here.
        channel.postMessage({ type: 'already_here', tabId });
      } else if (msg.type === 'already_here') {
        // We were greeted by an existing tab → we are the duplicate.
        setFlagged();
      }
    };

    const sendHello = () => {
      if (flagged) return;
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
    };
  }, []);

  return { isDuplicate };
}
