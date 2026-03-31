import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import './styles/print.css';
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

boot();
