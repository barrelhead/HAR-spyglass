import type { HarEntry } from '../types/har';

const KEY = 'harData';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB Chrome storage limit

export async function saveHarData(entries: HarEntry[], fileName: string): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  const payload = JSON.stringify({ entries, fileName });
  if (new Blob([payload]).size > MAX_BYTES) return; // silently skip if too large
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: { entries, fileName } }, resolve);
  });
}

export async function loadHarData(): Promise<{ entries: HarEntry[]; fileName: string } | null> {
  if (typeof chrome === 'undefined' || !chrome.storage) return null;
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY, (result) => {
      resolve(result[KEY] ?? null);
    });
  });
}

export async function clearHarData(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) return;
  return new Promise((resolve) => {
    chrome.storage.local.remove(KEY, resolve);
  });
}
