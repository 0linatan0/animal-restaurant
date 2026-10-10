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

function clipForUse(record) {
  if (!record || record.blob instanceof Blob) return record;
  const bytes = record.bytes;
  if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) throw new Error('本机录音数据已损坏，请从语音包恢复。');
  return {
    key: record.key,
    blob: new Blob([bytes], { type: record.mime || 'audio/wav' }),
    updatedAt: record.updatedAt,
  };
}

async function clipForStorage(clip) {
  if (!clip || typeof clip.key !== 'string' || !(clip.blob instanceof Blob)) throw new Error('录音数据无效，未保存任何更改。');
  return {
    key: clip.key,
    bytes: await clip.blob.arrayBuffer(),
    mime: clip.blob.type || 'audio/wav',
    updatedAt: clip.updatedAt,
  };
}

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
  return new Promise((resolve, reject) => { const r = d.transaction('clips').objectStore('clips').get(key); r.onsuccess = () => { try { resolve(clipForUse(r.result)); } catch (error) { reject(error); } }; r.onerror = () => reject(r.error); });
}
export async function listClips() {
  const d = await db();
  return new Promise((resolve, reject) => { const r = d.transaction('clips').objectStore('clips').getAll(); r.onsuccess = () => { try { resolve(r.result.map(clipForUse)); } catch (error) { reject(error); } }; r.onerror = () => reject(r.error); });
}
export async function writeClips(clips, removeKeys = []) {
  // iPad Safari 的部分上下文不能把 Blob 直接写入 IndexedDB；事务开始前先转换为可移植的二进制数据。
  const records = await Promise.all(clips.map(clipForStorage));
  const d = await db();
  return new Promise((resolve, reject) => {
    // 一次事务提交全部录音，导入失败时不破坏已有录音。
    const tx = d.transaction('clips', 'readwrite'); const store = tx.objectStore('clips');
    for (const key of removeKeys) store.delete(key);
    for (const record of records) store.put(record);
    tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(new Error('录音未能保存，请检查设备剩余空间；已有录音保持不变。'));
  });
}
