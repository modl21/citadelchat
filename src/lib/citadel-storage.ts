import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
}

export interface DownloadedKnowledgePack {
  id: string;
  title: string;
  version: string;
  updatedAt: string;
  documents: KnowledgeDocument[];
  downloadedAt: number;
}

interface CitadelSettingRecord {
  key: string;
  value: string;
}

interface CitadelDB extends DBSchema {
  knowledgePacks: {
    key: string;
    value: DownloadedKnowledgePack;
  };
  settings: {
    key: string;
    value: CitadelSettingRecord;
  };
}

const DB_NAME = 'citadel-chat-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CitadelDB>> | null = null;

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

async function getDb(): Promise<IDBPDatabase<CitadelDB>> {
  if (!hasIndexedDB()) {
    throw new Error('IndexedDB is not available in this environment.');
  }

  if (!dbPromise) {
    dbPromise = openDB<CitadelDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('knowledgePacks')) {
          db.createObjectStore('knowledgePacks', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  return dbPromise;
}

export async function saveKnowledgePack(pack: Omit<DownloadedKnowledgePack, 'downloadedAt'>): Promise<void> {
  const db = await getDb();
  await db.put('knowledgePacks', {
    ...pack,
    downloadedAt: Date.now(),
  });
}

export async function listKnowledgePacks(): Promise<DownloadedKnowledgePack[]> {
  const db = await getDb();
  const packs = await db.getAll('knowledgePacks');
  return packs.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getKnowledgePack(packId: string): Promise<DownloadedKnowledgePack | undefined> {
  const db = await getDb();
  return db.get('knowledgePacks', packId);
}

export async function deleteKnowledgePack(packId: string): Promise<void> {
  const db = await getDb();
  await db.delete('knowledgePacks', packId);
}

export async function clearKnowledgePacks(): Promise<void> {
  const db = await getDb();
  await db.clear('knowledgePacks');
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.put('settings', { key, value });
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const record = await db.get('settings', key);
  return record?.value ?? null;
}

export async function clearAllCitadelData(): Promise<void> {
  const db = await getDb();
  await db.clear('knowledgePacks');
  await db.clear('settings');
}

export async function estimateStorageUsage(): Promise<{ usedBytes: number; quotaBytes: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  return {
    usedBytes: estimate.usage ?? 0,
    quotaBytes: estimate.quota ?? 0,
  };
}

export function canUseIndexedDB(): boolean {
  return hasIndexedDB();
}
