import { create } from 'zustand';
import { downloadService, type DownloadedItem, type DownloadProgress } from '../services/downloadService';

interface DownloadState {
  downloads: DownloadedItem[];
  activeDownloads: Record<string, DownloadProgress>;
  controllers: Record<string, AbortController>;
  storageUsed: { usedMB: string; quotaMB: string };
  isOnline: boolean;

  fetchDownloads: () => Promise<void>;
  startDownload: (item: {
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
  }) => Promise<void>;
  cancelDownload: (id: string) => void;
  deleteDownload: (id: string) => Promise<void>;
  isDownloaded: (animeId: number, episodeNumber: number) => boolean;
  getDownloadProgress: (animeId: number, episodeNumber: number) => DownloadProgress | undefined;
}

export const useDownloadStore = create<DownloadState>((set, get) => {
  // Listen for online/offline events
  window.addEventListener('online', () => set({ isOnline: true }));
  window.addEventListener('offline', () => set({ isOnline: false }));

  return {
    downloads: [],
    activeDownloads: {},
    controllers: {},
    storageUsed: { usedMB: '0', quotaMB: '0' },
    isOnline: navigator.onLine,

    fetchDownloads: async () => {
      const items = await downloadService.getAllDownloads();
      const usage = await downloadService.getStorageUsage();
      set({
        downloads: items,
        storageUsed: { usedMB: usage.usedMB, quotaMB: usage.quotaMB },
      });
    },

    startDownload: async (item) => {
      const id = `${item.animeId}_${item.episodeNumber}`;
      if (get().activeDownloads[id]?.status === 'downloading') return;

      const controller = new AbortController();
      set((state) => ({
        controllers: { ...state.controllers, [id]: controller },
      }));

      try {
        await downloadService.downloadEpisode(
          item,
          (progress) => {
            set((state) => ({
              activeDownloads: { ...state.activeDownloads, [id]: progress },
            }));
          },
          controller.signal
        );

        // Refresh downloads
        await get().fetchDownloads();
        set((state) => {
          const { [id]: _, ...rest } = state.activeDownloads;
          return { activeDownloads: rest };
        });
      } catch (err: any) {
        console.error('Download failed:', err);
      }
    },

    cancelDownload: (id) => {
      const controller = get().controllers[id];
      if (controller) {
        controller.abort();
      }
      set((state) => {
        const { [id]: _, ...restActive } = state.activeDownloads;
        const { [id]: __, ...restControllers } = state.controllers;
        return { activeDownloads: restActive, controllers: restControllers };
      });
    },

    deleteDownload: async (id) => {
      await downloadService.deleteDownload(id);
      await get().fetchDownloads();
    },

    isDownloaded: (animeId, episodeNumber) => {
      const id = `${animeId}_${episodeNumber}`;
      return get().downloads.some((d) => d.id === id);
    },

    getDownloadProgress: (animeId, episodeNumber) => {
      const id = `${animeId}_${episodeNumber}`;
      return get().activeDownloads[id];
    },
  };
});
