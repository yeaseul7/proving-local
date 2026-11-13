type BrowserStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'removeItem'>;

// Remove only the deleting account's local copies, preserving other accounts
// and shared appearance preferences on the same browser.
export function clearAccountBrowserData(accounts: string[], storage: BrowserStorage): void {
  const remove = new Set<string>();
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key) continue;
    if (accounts.some(account => ['study-notebooks-', 'study-chat-', 'study-plan-notice-', 'study-leaf-notes-v1-', 'proving-profile-', 'proving-exam-v1:', 'proving-exam-selection:'].some(prefix => key === `${prefix}${account}`) || key.startsWith(`study-notebooks-backup-${account}-`))) {
      // Reactions use notebook IDs rather than account IDs. Remove reactions
      // referenced by this account's saved notes before removing those notes.
      try {
        const data = JSON.parse(storage.getItem(key) ?? 'null');
        const notes = Array.isArray(data) ? data : data?.notebooks;
        if (Array.isArray(notes)) for (const note of notes) if (typeof note?.id === 'string') remove.add(`proving-note-reaction:${note.id}`);
      } catch { /* Malformed local copies are still removed. */ }
      remove.add(key);
    }
  }
  try {
    const selected = JSON.parse(storage.getItem('proving-ai-selection') ?? 'null');
    if (accounts.includes(selected?.account)) remove.add('proving-ai-selection');
  } catch { /* Not an account-owned selection. */ }
  for (const key of remove) storage.removeItem(key);
}
