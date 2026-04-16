/**
 * PWA update hook (spec §4.1.2 + QA item 2.1).
 *
 * Wraps `virtual:pwa-register/react`'s `useRegisterSW` and exposes a simple
 * `{ needRefresh, updateSW }` API.
 *
 * Graceful degradation: if vite-plugin-pwa's virtual module is unavailable (e.g.
 * content-filter blocked the SW, dev-server, or the plugin wasn't bundled),
 * `needRefresh` stays false forever and `updateSW` is a no-op — the app boots
 * and works normally in online-only mode.
 */

import { useEffect, useState } from 'react';

interface PWAUpdateState {
  needRefresh: boolean;
  updateSW: () => Promise<void>;
}

export function usePWAUpdate(): PWAUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updater, setUpdater] = useState<(reloadPage?: boolean) => Promise<void>>(
    () => async () => {
      // no-op fallback
    },
  );

  useEffect(() => {
    let cancelled = false;

    // Dynamic import so the app still boots if the virtual module is missing.
    (async () => {
      try {
        const mod = await import('virtual:pwa-register');
        if (cancelled) return;

        const updateSW = mod.registerSW({
          immediate: false,
          onNeedRefresh() {
            setNeedRefresh(true);
          },
          onOfflineReady() {
            // Silent — no toast, app just works offline now.
          },
        });
        setUpdater(() => updateSW);
      } catch {
        // virtual:pwa-register unavailable (dev, content-filter, etc.) — stay quiet.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    needRefresh,
    updateSW: async () => {
      // Trigger the SW update path. vite-plugin-pwa is supposed to reload the
      // page via `controllerchange`, but if no waiting worker is actually
      // present (rare race / dev / unregistered SW) the call is a silent
      // no-op and the user is stuck on the « Rechargement… » screen.
      // We fire the update without awaiting and arm a hard fallback reload.
      try {
        void updater(true);
      } catch {
        /* ignore — fallback below will reload regardless */
      }
      window.setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
  };
}
