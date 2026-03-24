import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft } from './useAutoSave.js';

describe('useAutoSave utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loadDraft reads and parses a stored draft', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    localStorage.setItem('draft-key', JSON.stringify({ title: 'Draft title' }));

    expect(loadDraft<{ title: string }>('draft-key')).toEqual({ title: 'Draft title' });
    expect(getItemSpy).toHaveBeenCalledWith('draft-key');
  });

  it('clearDraft removes a stored draft', () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');
    localStorage.setItem('draft-key', JSON.stringify({ title: 'Draft title' }));

    clearDraft('draft-key');

    expect(localStorage.getItem('draft-key')).toBeNull();
    expect(removeItemSpy).toHaveBeenCalledWith('draft-key');
  });

  it('loadDraft returns null when the key is missing', () => {
    expect(loadDraft('missing-draft')).toBeNull();
  });

  it('loadDraft returns null for invalid JSON', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    localStorage.setItem('draft-key', '{invalid-json');

    expect(loadDraft('draft-key')).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});
