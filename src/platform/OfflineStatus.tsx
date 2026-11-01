import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function OfflineStatus({ busy }: { busy: boolean }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration?.active) setReady(true);
    },
    onRegisterError() {
      setError(true);
    },
  });

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <>
      <div className="connection" role="status">
        <span
          className={`status-dot ${ready || offlineReady ? "is-ready" : ""}`}
        />
        {ready || offlineReady
          ? "Offline bereit"
          : import.meta.env.DEV
            ? "Entwicklungsmodus · ohne Offline-Cache"
            : "Offline-App wird vorbereitet …"}
        {!online && <span> · Ohne Netz</span>}
      </div>
      {error && (
        <p role="alert" className="notice error">
          Die Offline-Installation ist fehlgeschlagen. Bitte mit Internet erneut
          laden. Lokale Projekte bleiben erhalten.
        </p>
      )}
      {needRefresh && (
        <aside className="notice update" aria-label="App-Update">
          <p>
            Eine neue App-Version ist bereit. Offene Eingaben zuerst speichern.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Alle Eingaben gespeichert? Die App wird für das Update neu geladen.",
                )
              ) {
                void updateServiceWorker(true).catch(() => setError(true));
              }
            }}
          >
            Update laden
          </button>
        </aside>
      )}
    </>
  );
}
