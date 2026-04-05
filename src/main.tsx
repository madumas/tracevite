import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/print.css';

// Disable Service Worker on dev subdomain — no stale cache during testing
if (
  window.location.hostname === 'dev.geomolo.ca' ||
  window.location.hostname === 'dev.tracevite.ca'
) {
  navigator.serviceWorker?.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}
import { migrateIfNeeded, loadSlotData } from '@/model/slot-persistence';
import type { SlotRegistry } from '@/model/slots';
import type { ConstructionState } from '@/model/types';
import type { UndoManager } from '@/model/undo';
import { createUndoManager } from '@/model/undo';
import { createInitialState } from '@/model/state';

// D1: Read URL params SYNCHRONOUSLY before createRoot
function parseUrlParams(): { consigne: string | null; level: string | null } {
  const params = new URLSearchParams(window.location.search);
  let consigne = params.get('consigne');
  const mode = params.get('mode');
  const level = params.get('level');

  if (consigne) {
    consigne = consigne.replace(/\|/g, '\n');
    if (consigne.length > 1000) consigne = consigne.slice(0, 1000);
  }

  if (params.toString()) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return { consigne: consigne || null, level: mode || level };
}

const urlParams = parseUrlParams();

// D2: Migration gate + load active slot — must complete before React renders
async function boot() {
  let registry: SlotRegistry;
  try {
    registry = await migrateIfNeeded();
  } catch {
    registry = { slots: [], activeSlotId: null, nextNumber: 1 };
  }

  // Load the active slot's saved construction data
  let initialState: ConstructionState = createInitialState();
  let initialUndoManager: UndoManager = createUndoManager(initialState);

  if (registry.activeSlotId) {
    try {
      const slotData = await loadSlotData(registry.activeSlotId);
      if (slotData) {
        initialState = slotData.state;
        initialUndoManager = {
          past: slotData.past,
          current: slotData.state,
          future: slotData.future,
        };
      }
    } catch {
      // Corrupted slot data — start fresh
    }
  }

  // Handle file_handlers: open .geomolo/.tracevite files via PWA launchQueue
  interface LaunchParams {
    files?: Array<{ getFile(): Promise<File> }>;
  }
  interface LaunchQueue {
    setConsumer(cb: (params: LaunchParams) => void): void;
  }
  if ('launchQueue' in window) {
    try {
      await new Promise<void>((resolve) => {
        (window as unknown as { launchQueue: LaunchQueue }).launchQueue.setConsumer(
          async (launchParams) => {
            if (launchParams.files?.length) {
              try {
                const fileHandle = launchParams.files[0]!;
                const file = await fileHandle.getFile();
                const text = await file.text();
                const { deserializeState } = await import('@/model/serialize');
                initialState = deserializeState(text);
                initialUndoManager = createUndoManager(initialState);
              } catch {
                // Invalid file — continue with default state
              }
            }
            resolve();
          },
        );
        // If consumer is never called (no file), resolve after a short timeout
        setTimeout(resolve, 100);
      });
    } catch {
      // launchQueue not supported properly
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App
        initialConsigne={urlParams.consigne}
        initialLevel={urlParams.level}
        initialRegistry={registry}
        initialState={initialState}
        initialUndoManager={initialUndoManager}
      />
    </StrictMode>,
  );
}

boot().catch((err) => {
  document.body.innerHTML = `<pre style="padding:20px;color:red;font-size:14px">Boot error:\n${err?.message}\n${err?.stack}</pre>`;
});
