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
import {
  migrateIfNeeded,
  loadSlotData,
  saveSlotData,
  saveRegistry,
} from '@/model/slot-persistence';
import type { SlotRegistry } from '@/model/slots';
import { createSlot } from '@/model/slots';
import type { ConstructionState } from '@/model/types';
import type { UndoManager } from '@/model/undo';
import { createUndoManager } from '@/model/undo';
import { createInitialState } from '@/model/state';

// D1: Read URL params SYNCHRONOUSLY before createRoot
import { parseShareParam, type SharedConstruction } from '@/engine/share';

function parseUrlParams(): { shared: SharedConstruction | null } {
  const shared = parseShareParam(window.location.hash);

  if (shared) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return { shared };
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

  // Load construction: shared URL takes priority over saved slot
  let initialState: ConstructionState = createInitialState();
  let initialUndoManager: UndoManager = createUndoManager(initialState);

  if (urlParams.shared) {
    // Shared construction → create a new slot so existing work is preserved
    const s = urlParams.shared;
    initialState = {
      ...initialState,
      points: s.points,
      segments: s.segments,
      circles: s.circles,
      textBoxes: s.textBoxes,
      consigne: s.consigne,
      displayMode: s.displayMode,
      gridSizeMm: s.gridSizeMm as 5 | 10 | 20,
    };
    initialUndoManager = createUndoManager(initialState);

    const result = createSlot(registry, 'Construction partagée');
    if (result) {
      registry = result.registry;
      await saveSlotData(result.slotId, initialState, initialUndoManager);
      await saveRegistry(registry);
    }
  } else if (registry.activeSlotId) {
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
        initialRegistry={registry}
        initialState={initialState}
        initialUndoManager={initialUndoManager}
      />
    </StrictMode>,
  );
}

boot();
