import { useState, useEffect } from 'react';
import { Plus, Lock, Globe, Trash2, Edit2, BookmarkPlus, Check, FolderOpen, X, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Anime } from '../../types';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface VaultFolder {
  id: string;
  name: string;
  emoji: string;
  isPrivate: boolean;
  items: Anime[];
  createdAt: number;
}

const STORAGE_KEY = 'md_watchlist_vault';
const EMOJI_OPTIONS = ['📁', '🎬', '⚔️', '💖', '🐉', '🌌', '🔥', '🎭', '👑', '🕹️', '🎵', '🌙'];

// ── Persistence helpers ───────────────────────────────────────────────────────
function loadVault(): VaultFolder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveVault(folders: VaultFolder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

// ── Create Folder Modal ───────────────────────────────────────────────────────
function CreateFolderModal({ onSave, onClose }: { onSave: (name: string, emoji: string, isPrivate: boolean) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [isPrivate, setIsPrivate] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">New Vault Folder</h3>
          <button onClick={onClose} className="btn-icon w-7 h-7"><X className="w-4 h-4" /></button>
        </div>

        {/* Emoji picker */}
        <p className="text-xs text-gray-400 mb-2">Pick an icon</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all
                ${emoji === e ? 'bg-orange-500/30 border-2 border-orange-500 scale-110' : 'bg-white/5 hover:bg-white/15 border border-white/5'}`}>
              {e}
            </button>
          ))}
        </div>

        {/* Name input */}
        <label className="label">Folder Name</label>
        <input
          type="text"
          value={name}
          maxLength={32}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Cyberpunk Masterpieces"
          className="input mb-4"
          autoFocus
        />

        {/* Privacy toggle */}
        <button
          onClick={() => setIsPrivate(p => !p)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all mb-5
            ${isPrivate ? 'bg-orange-500/10 border-orange-500/40' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
        >
          {isPrivate ? <Lock className="w-4 h-4 text-orange-400 shrink-0" /> : <Globe className="w-4 h-4 text-green-400 shrink-0" />}
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{isPrivate ? 'Private' : 'Public'}</p>
            <p className="text-xs text-gray-400">{isPrivate ? 'Only you can see this folder' : 'Anyone can view your list'}</p>
          </div>
          <div className={`ml-auto w-8 h-4.5 rounded-full relative transition-all ${isPrivate ? 'bg-orange-500' : 'bg-white/20'}`}
            style={{ height: '18px' }}>
            <span className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${isPrivate ? 'left-[18px]' : 'left-0.5'}`} />
          </div>
        </button>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button
            onClick={() => { if (name.trim()) { onSave(name.trim(), emoji, isPrivate); onClose(); } }}
            disabled={!name.trim()}
            className="btn-primary flex-1 text-sm disabled:opacity-50"
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add to Folder Button (used on AnimeCard via external call) ─────────────────
interface AddToVaultButtonProps {
  anime: Anime;
  className?: string;
}
export function AddToVaultButton({ anime, className = '' }: AddToVaultButtonProps) {
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<VaultFolder[]>(loadVault);
  const [added, setAdded] = useState<string | null>(null);

  const addToFolder = (folderId: string) => {
    const next = folders.map(f => {
      if (f.id !== folderId) return f;
      const already = f.items.some(a => a.id === anime.id);
      return already ? f : { ...f, items: [...f.items, anime] };
    });
    saveVault(next);
    setFolders(next);
    setAdded(folderId);
    setTimeout(() => { setAdded(null); setOpen(false); }, 1200);
  };

  return (
    <div className="relative">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        title="Add to Vault"
        className={`flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm
          text-white text-[10px] font-semibold px-3 py-1.5 rounded-full
          transition-all duration-200 border border-white/20 ${className}`}
      >
        <BookmarkPlus className="w-3 h-3" /> Vault
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-52 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 animate-scale-in">
          <p className="px-3 py-2 text-[10px] text-gray-500 font-mono uppercase tracking-wider">Add to folder</p>
          {folders.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">No folders yet. Create one in your Vault.</p>
          ) : (
            folders.map(f => (
              <button key={f.id} onClick={() => addToFolder(f.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-white/10 transition-colors text-left">
                <span className="text-sm">{f.emoji}</span>
                <span className="flex-1 truncate">{f.name}</span>
                {f.isPrivate && <Lock className="w-3 h-3 text-gray-500" />}
                {added === f.id && <Check className="w-3 h-3 text-green-400" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main WatchlistVault Component ─────────────────────────────────────────────
export function WatchlistVault() {
  const [folders, setFolders] = useState<VaultFolder[]>(loadVault);
  const [showCreate, setShowCreate] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [favorites, setFavorites] = useState<Anime[]>([]);
  const [loadingFav, setLoadingFav] = useState(false);

  // Load API favorites for "All Favorites" built-in folder
  useEffect(() => {
    setLoadingFav(true);
    api.get('/favorites').then(r => setFavorites(r.data)).catch(() => {}).finally(() => setLoadingFav(false));
  }, []);

  const createFolder = (name: string, emoji: string, isPrivate: boolean) => {
    const newFolder: VaultFolder = {
      id: `folder_${Date.now()}`,
      name, emoji, isPrivate,
      items: [],
      createdAt: Date.now(),
    };
    const next = [newFolder, ...folders];
    saveVault(next);
    setFolders(next);
    setActiveFolder(newFolder.id);
  };

  const deleteFolder = (id: string) => {
    const next = folders.filter(f => f.id !== id);
    saveVault(next);
    setFolders(next);
    if (activeFolder === id) setActiveFolder(null);
  };

  const removeItemFromFolder = (folderId: string, animeId: number) => {
    const next = folders.map(f =>
      f.id === folderId ? { ...f, items: f.items.filter(a => a.id !== animeId) } : f
    );
    saveVault(next);
    setFolders(next);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    const next = folders.map(f => f.id === id ? { ...f, name: editName.trim() } : f);
    saveVault(next);
    setFolders(next);
    setEditingId(null);
  };

  const togglePrivacy = (id: string) => {
    const next = folders.map(f => f.id === id ? { ...f, isPrivate: !f.isPrivate } : f);
    saveVault(next);
    setFolders(next);
  };

  const activeFolderData = activeFolder ? folders.find(f => f.id === activeFolder) : null;
  const displayItems = activeFolderData ? activeFolderData.items : favorites;
  const isBuiltIn = !activeFolder;

  return (
    <div className="card p-5 border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-lg">🗄️</div>
          <div>
            <h2 className="font-bold text-white">Watchlist Vault</h2>
            <p className="text-xs text-gray-400">Your custom collections</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs py-2 px-3.5 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Folder
        </button>
      </div>

      {/* Folder tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {/* Built-in: All Favorites */}
        <button
          onClick={() => setActiveFolder(null)}
          className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all
            ${!activeFolder ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
        >
          <Heart className="w-3.5 h-3.5" /> All Favorites
          <span className="text-[10px] text-gray-500">({favorites.length})</span>
        </button>

        {folders.map(f => (
          <div key={f.id} className="shrink-0 relative group/tab">
            {editingId === f.id ? (
              <div className="flex items-center gap-1">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(f.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="input text-xs h-8 w-32 py-0 px-2"
                  autoFocus
                />
                <button onClick={() => saveEdit(f.id)} className="text-green-400 hover:text-green-300 text-xs px-1">✓</button>
              </div>
            ) : (
              <button
                onClick={() => setActiveFolder(f.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all pr-6
                  ${activeFolder === f.id ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
              >
                {f.emoji} {f.name}
                <span className="text-[10px] text-gray-500">({f.items.length})</span>
                {f.isPrivate && <Lock className="w-2.5 h-2.5 text-gray-500" />}
              </button>
            )}
            {/* Folder actions */}
            <div className="absolute right-0.5 top-1/2 -translate-y-1/2 hidden group-hover/tab:flex items-center gap-0.5">
              <button onClick={() => { setEditingId(f.id); setEditName(f.name); }} className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-white bg-black/60">
                <Edit2 className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => deleteFolder(f.id)} className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-red-400 bg-black/60">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active folder meta */}
      {activeFolderData && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-2xl">{activeFolderData.emoji}</span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-white">{activeFolderData.name}</p>
            <p className="text-xs text-gray-400">{activeFolderData.items.length} items</p>
          </div>
          <button
            onClick={() => togglePrivacy(activeFolderData.id)}
            title="Toggle privacy"
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all
              ${activeFolderData.isPrivate ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-green-500/10 border-green-500/30 text-green-300'}`}
          >
            {activeFolderData.isPrivate ? <><Lock className="w-3 h-3" /> Private</> : <><Globe className="w-3 h-3" /> Public</>}
          </button>
        </div>
      )}

      {/* Item grid */}
      {loadingFav && isBuiltIn ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton aspect-[2/3] rounded-xl" />)}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isBuiltIn ? 'No favorites yet — heart some content!' : 'This folder is empty. Add content from any card.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {displayItems.map(anime => {
            const detailUrl = `/${anime.type.toLowerCase() === 'anime' ? 'anime' : anime.type.toLowerCase() === 'donghua' ? 'donghua' : anime.type.toLowerCase() === 'drama' ? 'drama' : 'movie'}/${anime.slug}`;
            return (
              <div key={anime.id} className="relative group/item">
                <Link to={detailUrl} className="block rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 hover:border-orange-500/30 transition-all">
                  <div className="aspect-[2/3] relative overflow-hidden">
                    {anime.poster_url ? (
                      <img src={anime.poster_url} alt={anime.title} className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[#222] flex items-center justify-center text-gray-600 text-xs">{anime.title[0]}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </div>
                  <p className="p-1.5 text-[10px] font-semibold text-gray-300 line-clamp-2 leading-tight">{anime.title}</p>
                </Link>
                {!isBuiltIn && activeFolderData && (
                  <button
                    onClick={() => removeItemFromFolder(activeFolderData.id, anime.id)}
                    title="Remove from folder"
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/80 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateFolderModal onSave={createFolder} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
