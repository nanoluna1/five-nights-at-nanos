const KEY = 'fnan.save.v1';

export function defaultSave() {
  return { highestUnlocked: 1, lastPlayed: 1 };
}

export function loadSave(store) {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave(); // corrupt save must never hard-crash the menu
  }
}

export function saveSave(store, data) {
  store.setItem(KEY, JSON.stringify(data));
}

export function recordNightComplete(store, night) {
  const s = loadSave(store);
  s.highestUnlocked = Math.max(s.highestUnlocked, night + 1);
  s.lastPlayed = night;
  saveSave(store, s);
  return s;
}
