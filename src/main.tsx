import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// D1: Read URL params SYNCHRONOUSLY before createRoot (avoids Strict Mode double-mount bug)
function parseUrlParams(): { consigne: string | null; level: string | null } {
  const params = new URLSearchParams(window.location.search);
  let consigne = params.get('consigne');
  const level = params.get('level');

  if (consigne) {
    // Pipe → newline (teacher-friendly alias for %0A)
    consigne = consigne.replace(/\|/g, '\n');
    // Truncate to 1000 chars
    if (consigne.length > 1000) consigne = consigne.slice(0, 1000);
  }

  // Clean URL (consume params once)
  if (params.toString()) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return { consigne: consigne || null, level };
}

const urlParams = parseUrlParams();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialConsigne={urlParams.consigne} initialLevel={urlParams.level} />
  </StrictMode>,
);
