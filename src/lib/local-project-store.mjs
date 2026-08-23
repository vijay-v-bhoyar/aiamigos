const DB_VERSION = 1;
const PROJECT_STORE = 'projects';
const QUEUE_STORE = 'syncQueue';

function storageKey(namespace) {
  return `aiamigos:practice:${namespace}:v1`;
}

function localStorageAdapter(storage) {
  const read = (key, fallback) => {
    try { return JSON.parse(storage.getItem(key) ?? JSON.stringify(fallback)); } catch { return fallback; }
  };
  const write = (key, value) => storage.setItem(key, JSON.stringify(value));
  return {
    async listProjects() { return read(storageKey(PROJECT_STORE), []); },
    async saveProject(project) { const items = read(storageKey(PROJECT_STORE), []).filter((item) => item.id !== project.id); write(storageKey(PROJECT_STORE), [...items, project]); return project; },
    async deleteProject(id) { write(storageKey(PROJECT_STORE), read(storageKey(PROJECT_STORE), []).filter((item) => item.id !== id)); },
    async enqueue(operation) { const queue = read(storageKey(QUEUE_STORE), []); write(storageKey(QUEUE_STORE), [...queue, { ...operation, queuedAt: new Date().toISOString() }]); },
    async drainQueue() { const queue = read(storageKey(QUEUE_STORE), []); write(storageKey(QUEUE_STORE), []); return queue; },
    kind: 'localStorage-fallback',
  };
}

function indexedDbAdapter(indexedDb, name) {
  let dbPromise;
  const open = () => dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDb.open(name, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => { request.result.createObjectStore(PROJECT_STORE, { keyPath: 'id' }); request.result.createObjectStore(QUEUE_STORE, { autoIncrement: true }); };
    request.onsuccess = () => resolve(request.result);
  });
  const transaction = async (store, mode, action) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode); const objectStore = tx.objectStore(store); const request = action(objectStore);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
  };
  return {
    async listProjects() { return (await transaction(PROJECT_STORE, 'readonly', (store) => store.getAll())) ?? []; },
    async saveProject(project) { await transaction(PROJECT_STORE, 'readwrite', (store) => store.put(project)); return project; },
    async deleteProject(id) { await transaction(PROJECT_STORE, 'readwrite', (store) => store.delete(id)); },
    async enqueue(operation) { await transaction(QUEUE_STORE, 'readwrite', (store) => store.add({ ...operation, queuedAt: new Date().toISOString() })); },
    async drainQueue() { const queue = (await transaction(QUEUE_STORE, 'readonly', (store) => store.getAll())) ?? []; await transaction(QUEUE_STORE, 'readwrite', (store) => store.clear()); return queue; },
    kind: 'indexedDB',
  };
}

export function createProjectStore({ indexedDb = globalThis.indexedDB, storage = globalThis.localStorage, dbName = 'aiamigos-practice' } = {}) {
  if (indexedDb) return indexedDbAdapter(indexedDb, dbName);
  if (storage) return localStorageAdapter(storage);
  const memory = new Map();
  const queue = [];
  return { async listProjects() { return [...memory.values()]; }, async saveProject(project) { memory.set(project.id, project); return project; }, async deleteProject(id) { memory.delete(id); }, async enqueue(operation) { queue.push({ ...operation, queuedAt: new Date().toISOString() }); }, async drainQueue() { return queue.splice(0, queue.length); }, kind: 'memory' };
}
