// Persistence improves retry recovery across reloads, but unavailable browser
// storage must never prevent a server write or obscure its successful result.
export function saveChatDraft(key: string, value: unknown | null): boolean {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
