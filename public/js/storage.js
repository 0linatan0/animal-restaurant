import { DEFAULT_SETTINGS } from './catalog.js';
import { normalizeSettings, restoreSession } from './model.js';
const PREFIX = 'little-kitchen:';
export const local = {
  get(key, fallback = null) { try { return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(PREFIX + key); } catch {} },
};
export const loadSettings = () => normalizeSettings(local.get('settings', DEFAULT_SETTINGS));
export const loadSession = () => restoreSession(local.get('session'));
let database;
export function db() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('little-kitchen-voices', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('clips', { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(new Error('本机录音存储暂不可用，请检查浏览器存储设置。')); };
  });
  return database;
}
export async function getClip(key) {
  const d = await db();
  return new Promise((resolve, reject) => { const r = d.transaction('clips').objectStore('clips').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
export async function listClips() {
  const d = await db();
  return new Promise((resolve, reject) => { const r = d.transaction('clips').objectStore('clips').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
export async function writeClips(clips, removeKeys = []) {
  const d = await db();
  return new Promise((resolve, reject) => {
    // 一次事务提交全部录音，导入失败时不破坏已有录音。
    const tx = d.transaction('clips', 'readwrite'); const store = tx.objectStore('clips');
    for (const key of removeKeys) store.delete(key);
    for (const clip of clips) store.put(clip);
    tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(new Error('录音未能保存，请检查设备剩余空间；已有录音保持不变。'));
  });
}
