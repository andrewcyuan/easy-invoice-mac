import { invoke, isTauri } from "@tauri-apps/api/core";
import { initialState, readState, type SavedState } from "./model";
const journalKey = "invoice-recovery-v1";
export async function loadState() {
  const disk = isTauri() ? await invoke<unknown>("load_state") : null;
  const saved = disk ? readState(disk) : initialState();
  const journal = localStorage.getItem(journalKey);
  if (!journal) return saved;
  const recovered = readState(JSON.parse(journal));
  if (recovered.revision > saved.revision) {
    if (isTauri()) await invoke("save_state", { state: recovered });
    return recovered;
  }
  return saved;
}
export function createStore(initial: SavedState) {
  let state = initial;
  let status = "Saved locally";
  let error = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();
  let snapshot = { state, status, error };
  const listeners = new Set<() => void>();
  const publish = () => {
    snapshot = { state, status, error };
    listeners.forEach((fn) => fn());
  };
  async function flush() {
    clearTimeout(timer);
    const current = state;
    const save = queue
      .catch(() => {})
      .then(async () => {
        if (isTauri()) await invoke("save_state", { state: current });
        else localStorage.setItem(journalKey, JSON.stringify(current));
        if (state.revision === current.revision) {
          status = "Saved locally";
          error = "";
          publish();
        }
      });
    queue = save;
    try {
      await save;
    } catch (e) {
      error = `Could not save: ${String(e)}`;
      status = "Not saved";
      publish();
      throw e;
    }
  }
  return {
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getSnapshot: () => snapshot,
    getState: () => state,
    update: (fn: (previous: SavedState) => SavedState) => {
      state = {
        ...fn(state),
        revision: Math.max(Date.now(), state.revision + 1),
      };
      status = "Saving…";
      error = "";
      try {
        localStorage.setItem(journalKey, JSON.stringify(state));
      } catch (e) {
        error = `Recovery journal unavailable: ${String(e)}`;
      }
      publish();
      clearTimeout(timer);
      timer = setTimeout(() => void flush().catch(() => {}), 350);
    },
    flush,
  };
}
export type InvoiceStore = ReturnType<typeof createStore>;
