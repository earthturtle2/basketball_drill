type PendingSaveHandler = () => Promise<boolean>;

let pendingSaveHandler: PendingSaveHandler | null = null;

export function registerPendingSaveHandler(handler: PendingSaveHandler) {
  pendingSaveHandler = handler;
  return () => {
    if (pendingSaveHandler === handler) pendingSaveHandler = null;
  };
}

export function flushPendingSave() {
  return pendingSaveHandler?.() ?? Promise.resolve(true);
}
