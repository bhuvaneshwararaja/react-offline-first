/**
 * Registers `scriptURL` with the browser. Returns `undefined` when service workers are unavailable
 * or registration throws. Use a script that handles the `offline-first-sync` Background Sync tag.
 */
export async function registerServiceWorker(
  scriptURL: string,
  options?: RegistrationOptions
): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }
  try {
    return await navigator.serviceWorker.register(scriptURL, options);
  } catch {
    return undefined;
  }
}
