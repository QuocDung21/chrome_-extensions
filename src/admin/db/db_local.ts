import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'TemplateLoaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';

// --- CÁC KEY ĐỂ LƯU TRỮ HANDLE ---
const MANUAL_LOADER_KEY = 'lastDirectoryHandle'; // Key cho chức năng cũ (nếu bạn vẫn dùng)
const SYNC_DIR_KEY = 'syncDirectoryHandle';      // Key cho chức năng đồng bộ mới

interface MyAppDB extends DBSchema {
    [STORE_NAME]: {
        key: string;
        value: FileSystemDirectoryHandle;
    };
}

let dbPromise: Promise<IDBPDatabase<MyAppDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<MyAppDB>> => {
    if (!dbPromise) {
        dbPromise = openDB<MyAppDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            }
        });
    }
    return dbPromise;
};

// --- HÀM CHO CHỨC NĂNG MANUAL LOADER (GIỮ LẠI ĐỂ TƯƠNG THÍCH) ---
export const storeDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
    const db = await getDb();
    await db.put(STORE_NAME, handle, MANUAL_LOADER_KEY);
};

export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | undefined> => {
    const db = await getDb();
    return await db.get(STORE_NAME, MANUAL_LOADER_KEY);
};

export const clearDirectoryHandle = async (): Promise<void> => {
    const db = await getDb();
    await db.delete(STORE_NAME, MANUAL_LOADER_KEY);
};


// --- HÀM MỚI CẦN THIẾT CHO CHỨC NĂNG ĐỒNG BỘ ---
export const storeSyncDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
    const db = await getDb();
    await db.put(STORE_NAME, handle, SYNC_DIR_KEY);
    console.log('✅ Sync directory handle stored.');
};

export const getSyncDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | undefined> => {
    const db = await getDb();
    const handle = await db.get(STORE_NAME, SYNC_DIR_KEY);
    if (handle) {
        console.log('✅ Retrieved sync directory handle from IndexedDB.');
    }
    return handle;
};

export const clearSyncDirectoryHandle = async (): Promise<void> => {
    const db = await getDb();
    await db.delete(STORE_NAME, SYNC_DIR_KEY);
    console.log('✅ Sync directory handle cleared.');
};


// --- HÀM XÁC MINH QUYỀN (DÙNG CHUNG) ---
export const verifyAndRequestPermission = async (
    handle: FileSystemDirectoryHandle
): Promise<boolean> => {
    const options = { mode: 'readwrite' as const };
    // @ts-expect-error
    if ((await handle.queryPermission(options)) === 'granted') {
        return true;
    }
    // @ts-expect-error
    if ((await handle.requestPermission(options)) === 'granted') {
        return true;
    }
    console.error('❌ Permission denied by user.');
    return false;
};