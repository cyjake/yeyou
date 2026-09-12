export type PwaStatus = 'unsupported' | 'ready' | 'offline' | 'update-available';

export function registerPwa(onStatus: (status: PwaStatus, registration?: ServiceWorkerRegistration) => void): void {
  if (!('serviceWorker' in navigator)) { onStatus('unsupported'); return; }
  const notifyConnectivity = () => onStatus(navigator.onLine ? 'ready' : 'offline');
  window.addEventListener('online', notifyConnectivity);
  window.addEventListener('offline', notifyConnectivity);
  void navigator.serviceWorker.register('/service-worker.js').then(registration => {
    if (registration.waiting) onStatus('update-available', registration);
    else notifyConnectivity();
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) onStatus('update-available', registration);
      });
    });
  }).catch(() => onStatus(navigator.onLine ? 'unsupported' : 'offline'));
}

export function activatePwaUpdate(registration: ServiceWorkerRegistration): void {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
}
