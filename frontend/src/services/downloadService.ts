/**
 * Offline Download Service using IndexedDB
 * Handles chunked streaming downloads, blob storage, and offline retrieval.
 */

export interface DownloadedItem {
  id: string; // `${animeId}_${episodeNumber}`
  animeId: number;
  animeTitle: string;
  animeSlug: string;
  animePoster: string;
  animeType: string;
  episodeId: number;
  episodeNumber: number;
  episodeTitle: string;
  durationSeconds: number;
  videoUrl: string;
  fileSize: number; // in bytes
  downloadedAt: number;
  videoBlob?: Blob;
}

export interface DownloadProgress {
  id: string;
  animeTitle: string;
  episodeNumber: number;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'paused' | 'error';
  errorMessage?: string;
}

const DB_NAME = 'mer_donghua_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_episodes';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('animeId', 'animeId', { unique: false });
          store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export const downloadService = {
  /**
   * Check if an episode is already saved offline.
   */
  async isDownloaded(animeId: number, episodeNumber: number): Promise<boolean> {
    try {
      const db = await getDB();
      const id = `${animeId}_${episodeNumber}`;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  },

  /**
   * Get all downloaded items (without heavy blob payloads).
   */
  async getAllDownloads(): Promise<DownloadedItem[]> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = (req.result || []).map((item) => {
            const { videoBlob, ...rest } = item;
            return rest as DownloadedItem;
          });
          resolve(items.sort((a, b) => b.downloadedAt - a.downloadedAt));
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  },

  /**
   * Get the offline blob URL for video playback.
   */
  async getOfflineVideoUrl(animeId: number, episodeNumber: number): Promise<string | null> {
    try {
      const db = await getDB();
      const id = `${animeId}_${episodeNumber}`;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result && req.result.videoBlob) {
            const url = URL.createObjectURL(req.result.videoBlob);
            resolve(url);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Start downloading an episode with real-time progress callbacks.
   */
  async downloadEpisode(
    item: {
      animeId: number;
      animeTitle: string;
      animeSlug: string;
      animePoster: string;
      animeType: string;
      episodeId: number;
      episodeNumber: number;
      episodeTitle: string;
      durationSeconds: number;
      videoUrl: string;
    },
    onProgress: (progress: DownloadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<DownloadedItem> {
    const id = `${item.animeId}_${item.episodeNumber}`;

    // Initial state
    onProgress({
      id,
      animeTitle: item.animeTitle,
      episodeNumber: item.episodeNumber,
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      status: 'downloading',
    });

    try {
      const response = await fetch(item.videoUrl, {
        signal: abortSignal,
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) {
        throw new Error(`Download failed with HTTP ${response.status}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to direct blob
        const blob = await response.blob();
        return await this.saveToIndexedDB(item, blob, blob.size, onProgress);
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 50;

        onProgress({
          id,
          animeTitle: item.animeTitle,
          episodeNumber: item.episodeNumber,
          progress: Math.min(percent, 99),
          downloadedBytes: receivedBytes,
          totalBytes: totalBytes || receivedBytes,
          status: 'downloading',
        });
      }

      const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
      return await this.saveToIndexedDB(item, blob, receivedBytes, onProgress);
    } catch (err: any) {
      onProgress({
        id,
        animeTitle: item.animeTitle,
        episodeNumber: item.episodeNumber,
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        status: 'error',
        errorMessage: err.message || 'Download interrupted',
      });
      throw err;
    }
  },

  /**
   * Save the downloaded blob into IndexedDB.
   */
  async saveToIndexedDB(
    item: {
      animeId: number;
      animeTitle: string;
      animeSlug: string;
      animePoster: string;
      animeType: string;
      episodeId: number;
      episodeNumber: number;
      episodeTitle: string;
      durationSeconds: number;
      videoUrl: string;
    },
    blob: Blob,
    fileSize: number,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<DownloadedItem> {
    const id = `${item.animeId}_${item.episodeNumber}`;
    const db = await getDB();

    const downloadedItem: DownloadedItem = {
      id,
      animeId: item.animeId,
      animeTitle: item.animeTitle,
      animeSlug: item.animeSlug,
      animePoster: item.animePoster,
      animeType: item.animeType,
      episodeId: item.episodeId,
      episodeNumber: item.episodeNumber,
      episodeTitle: item.episodeTitle,
      durationSeconds: item.durationSeconds,
      videoUrl: item.videoUrl,
      fileSize,
      downloadedAt: Date.now(),
      videoBlob: blob,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(downloadedItem);

      req.onsuccess = () => {
        onProgress({
          id,
          animeTitle: item.animeTitle,
          episodeNumber: item.episodeNumber,
          progress: 100,
          downloadedBytes: fileSize,
          totalBytes: fileSize,
          status: 'completed',
        });
        const { videoBlob, ...rest } = downloadedItem;
        resolve(rest as DownloadedItem);
      };

      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Delete a downloaded episode from storage.
   */
  async deleteDownload(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Get estimated total storage used by downloads in MB.
   */
  async getStorageUsage(): Promise<{ usedBytes: number; usedMB: string; quotaMB: string }> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        return {
          usedBytes: used,
          usedMB: (used / (1024 * 1024)).toFixed(1),
          quotaMB: (quota / (1024 * 1024)).toFixed(0),
        };
      }
    } catch {
      // ignore
    }
    return { usedBytes: 0, usedMB: '0', quotaMB: 'N/A' };
  },
};
