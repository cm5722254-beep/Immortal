import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUiPreferencesStore } from '../store/uiPreferencesStore';
import { clearLocalCatalogCache } from '../services/catalogService';

const loadToggle = (key: string, fallback = false) => {
  try { const value = localStorage.getItem(key); return value === null ? fallback : value === 'true'; } catch { return fallback; }
};

export function SettingsPage() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const { reduceMotion, toggleReduceMotion, hidePromos, toggleHidePromos } = useUiPreferencesStore();
  const [autoplay, setAutoplay] = useState(() => loadToggle('nami_autoplay', true));
  const [dataSaver, setDataSaver] = useState(() => loadToggle('nami_data_saver'));
  const [message, setMessage] = useState('');
  const toggle = (key: string, value: boolean, setter: (next: boolean) => void) => { const next = !value; setter(next); localStorage.setItem(key, String(next)); };

  const clearCache = async () => {
    clearLocalCatalogCache();
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => /nami|huang|watchflix/i.test(name)).map((name) => caches.delete(name)));
    }
    setMessage('Temporary app cache cleared. Your downloads and sign-in are unchanged.');
  };

  return (
    <main className="mini-settings-page">
      <div className="mini-page-title"><Link to="/profile" aria-label="Back"><ArrowLeft /></Link><h1>Settings</h1></div>
      <section className="mini-settings-group"><h2>Account and Security</h2><Link to="/account" className="mini-settings-row">Personal Data <ChevronRight /></Link><Link to="/login" className="mini-settings-row">Sign-in options <ChevronRight /></Link></section>
      <section className="mini-settings-group"><h2>Playback & Download</h2>
        <button className="mini-settings-row" onClick={() => toggle('nami_autoplay', autoplay, setAutoplay)}>Autoplay next episode <span className={`mini-switch ${autoplay ? 'on' : ''}`} /></button>
        <button className="mini-settings-row" onClick={() => toggle('nami_data_saver', dataSaver, setDataSaver)}>Data saver <span className={`mini-switch ${dataSaver ? 'on' : ''}`} /></button>
        <button className="mini-settings-row" onClick={toggleReduceMotion}>Reduce motion <span className={`mini-switch ${reduceMotion ? 'on' : ''}`} /></button>
      </section>
      <section className="mini-settings-group"><h2>Privacy</h2><button className="mini-settings-row" onClick={toggleHidePromos}>Hide promotions <span className={`mini-switch ${hidePromos ? 'on' : ''}`} /></button></section>
      <section className="mini-settings-group"><h2>Storage & App</h2><button className="mini-settings-row" onClick={clearCache}>Clear cache <span><Trash2 /></span></button><button className="mini-settings-row" onClick={() => window.location.reload()}>Reload app <span><ChevronRight /></span></button></section>
      {message && <p className="mini-form-message" role="status">{message}</p>}
      <button className="mini-settings-action" onClick={() => { logout(); navigate('/login'); }}>Switch accounts</button>
      <button className="mini-settings-action danger" onClick={() => { logout(); window.location.href = '/'; }}>Log out</button>
    </main>
  );
}
