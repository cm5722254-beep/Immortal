import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Trash2, User, Shield, Play,
  Wifi, Eye, RotateCw, LogOut, CheckCircle2, SlidersHorizontal
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUiPreferencesStore } from '../store/uiPreferencesStore';
import { clearLocalCatalogCache } from '../services/catalogService';
import { translate, useLanguageStore } from '../store/languageStore';
import { triggerHaptic } from '../utils/telegram';

const loadToggle = (key: string, fallback = false) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
};

export function SettingsPage() {
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const { reduceMotion, toggleReduceMotion, hidePromos, toggleHidePromos } = useUiPreferencesStore();
  const [autoplay, setAutoplay] = useState(() => loadToggle('nami_autoplay', true));
  const [dataSaver, setDataSaver] = useState(() => loadToggle('nami_data_saver'));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    triggerHaptic('light');
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const toggle = (key: string, value: boolean, setter: (next: boolean) => void, label: string) => {
    const next = !value;
    setter(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {}
    showToast(next ? `បានបើក៖ ${label}` : `បានបិទ៖ ${label}`);
  };

  const clearCache = async () => {
    clearLocalCatalogCache();
    if ('caches' in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => /nami|huang|watchflix/i.test(name)).map((name) => caches.delete(name)));
      } catch {}
    }
    showToast(language === 'km' ? 'បានសម្អាតទិន្នន័យ Cache ជោគជ័យ' : 'Temporary app cache cleared');
  };

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 pb-28 md:pb-16 px-4 py-6 max-w-xl mx-auto transition-colors">
      {/* ── Page Header with Back Button ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            onClick={() => triggerHaptic('light')}
            className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-xs transition-all"
            aria-label={t('Back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight">
              {language === 'km' ? 'ការកំណត់ទូទៅ' : 'Settings'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'km' ? 'គ្រប់គ្រងការចាក់ និងប្រព័ន្ធសុវត្ថិភាព' : 'Manage preferences and security'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Account and Security ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'គណនី និងសុវត្ថិភាព' : 'Account & Security'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            {isAuthenticated ? (
              <Link
                to="/account"
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-slate-900 block">
                      {language === 'km' ? 'ព័ត៌មានផ្ទាល់ខ្លួន' : 'Personal Data'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {user?.username || user?.email || 'Manage profile info'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-slate-900 block">
                      {language === 'km' ? 'ចូលគណនី' : 'Sign in options'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {language === 'km' ? 'ចូលដើម្បីរក្សាទុកទិន្នន័យ' : 'Sign in to sync your data'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            )}
          </div>
        </div>

        {/* ── Section 2: Playback & Streaming ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'ការចាក់វីដេអូ & ទិន្នន័យ' : 'Playback & Data'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Autoplay Next */}
            <div
              onClick={() => toggle('nami_autoplay', autoplay, setAutoplay, language === 'km' ? 'ចាក់ភាគបន្ទាប់ស្វ័យប្រវត្តិ' : 'Autoplay next episode')}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Play className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'ចាក់ភាគបន្ទាប់ស្វ័យប្រវត្តិ' : 'Autoplay Next Episode'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'បន្តទៅភាគបន្ទាប់ដោយមិនចាំបាច់ចុច' : 'Seamless transition between episodes'}
                  </span>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${autoplay ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${autoplay ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Data Saver */}
            <div
              onClick={() => toggle('nami_data_saver', dataSaver, setDataSaver, language === 'km' ? 'សន្សំសំចៃទិន្នន័យអ៊ីនធឺណិត' : 'Data saver')}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wifi className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'សន្សំសំចៃទិន្នន័យ (Data Saver)' : 'Data Saver'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'បន្ថយកម្រិតរូបភាពស្វ័យប្រវត្តិដើម្បីសន្សំ Internet' : 'Stream at lower resolution on mobile'}
                  </span>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${dataSaver ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${dataSaver ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Reduce Motion */}
            <div
              onClick={() => {
                toggleReduceMotion();
                showToast(!reduceMotion ? 'បានបើក៖ កាត់បន្ថយចលនា' : 'បានបិទ៖ កាត់បន្ថយចលនា');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <Eye className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'កាត់បន្ថយចលនា (Reduce Motion)' : 'Reduce Motion'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'បិទចលនារំកិលខ្លាំងៗ' : 'Minimizes animations for comfort'}
                  </span>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${reduceMotion ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${reduceMotion ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Privacy & Display ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'ភាពឯកជន & បទបង្ហាញ' : 'Privacy & Display'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            <div
              onClick={() => {
                toggleHidePromos();
                showToast(!hidePromos ? 'បានលាក់ផ្ទាំងផ្សាយ' : 'បានបង្ហាញផ្ទាំងផ្សាយ');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'លាក់ផ្ទាំងផ្សាយពាណិជ្ជកម្ម' : 'Hide Promotional Banners'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'មិនបង្ហាញផ្ទាំងផ្សាយក្នុងគេហទំព័រ' : 'Keep interface clean and focused'}
                  </span>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${hidePromos ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${hidePromos ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4: Storage & Maintenance ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'ទិន្នន័យកម្មវិធី & ប្រព័ន្ធ' : 'Storage & App'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Clear Cache */}
            <div
              onClick={clearCache}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'សម្អាតទិន្នន័យបណ្តោះអាសន្ន' : 'Clear Temporary Cache'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'មិនប៉ះពាល់ដល់គណនី ឬបញ្ជីរក្សាទុកឡើយ' : 'Frees up local storage safely'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            {/* Reload App */}
            <div
              onClick={() => {
                triggerHaptic('light');
                window.location.reload();
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <RotateCw className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'ផ្ទុកកម្មវិធីឡើងវិញ' : 'Reload Application'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'ធ្វើបច្ចុប្បន្នភាពទិន្នន័យចុងក្រោយ' : 'Refresh for latest updates'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* ── Section 5: Session Actions ── */}
        {isAuthenticated && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                logout();
                showToast(language === 'km' ? 'បានចាកចេញពីគណនី' : 'Signed out');
                navigate('/login');
              }}
              className="w-full p-4 rounded-3xl bg-white/90 backdrop-blur-xl border border-rose-200/80 hover:bg-rose-50/60 shadow-xs flex items-center justify-center gap-2 text-rose-600 font-bold text-sm transition-all"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>{language === 'km' ? 'ចាកចេញពីគណនី (Sign out)' : 'Log out'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-2xl bg-slate-900/90 text-white font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}

export default SettingsPage;
