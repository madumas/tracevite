import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { migrateIfNeeded } from '@/model/slot-persistence';
import type { SlotRegistry } from '@/model/slots';

// D1: Read URL params SYNCHRONOUSLY before createRoot
function parseUrlParams(): { consigne: string | null; level: string | null } {
  const params = new URLSearchParams(window.location.search);
  let consigne = params.get('consigne');
  const level = params.get('level');

  if (consigne) {
    consigne = consigne.replace(/\|/g, '\n');
    if (consigne.length > 1000) consigne = consigne.slice(0, 1000);
  }

  if (params.toString()) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return { consigne: consigne || null, level };
}

const urlParams = parseUrlParams();

// D2: Migration gate — must complete before React renders
async function boot() {
  let registry: SlotRegistry;
  try {
    registry = await migrateIfNeeded();
  } catch {
    // IndexedDB unavailable — start with empty registry
    registry = { slots: [], activeSlotId: null, nextNumber: 1 };
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App
        initialConsigne={urlParams.consigne}
        initialLevel={urlParams.level}
        initialRegistry={registry}
      />
    </StrictMode>,
  );
}

boot();
