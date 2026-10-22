/** Same-origin only. All callbacks reread authoritative storage, never echo event payloads. */
export function watchLocalStorage(
  host: Window,
  keys: ReadonlyArray<string>,
  refresh: (source: 'storage' | 'resume') => void,
): () => void {
  const onStorage = (event: StorageEvent) => {
    try { if (event.storageArea !== host.localStorage) return; } catch { return; }
    if (event.key === null || keys.includes(event.key)) refresh('storage');
  };
  const onVisible = () => { if (host.document.visibilityState === 'visible') refresh('resume'); };
  const onPageShow = () => refresh('resume');
  host.addEventListener('storage', onStorage);
  host.addEventListener('pageshow', onPageShow);
  host.document.addEventListener('visibilitychange', onVisible);
  return () => {
    host.removeEventListener('storage', onStorage);
    host.removeEventListener('pageshow', onPageShow);
    host.document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Serialize cooperating tabs where Web Locks is available. No persistence or network. */
export async function withLocalLock<T>(name: string, action: () => T | Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(name, action);
  }
  return action();
}
