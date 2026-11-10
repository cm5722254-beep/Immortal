import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, UserRound, Mail, Hash, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { translate, useLanguageStore } from '../store/languageStore';
import { triggerHaptic } from '../utils/telegram';

export function AccountPage() {
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    triggerHaptic(type === 'success' ? 'light' : 'medium');
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const response = await api.put('/users/me', {
        username: username.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      setUser(response.data);
      showToast(language === 'km' ? 'បានរក្សាទុកព័ត៌មានជោគជ័យ' : 'Profile updated successfully', 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || (language === 'km' ? 'មិនអាចរក្សាទុកបានទេ។ សូមព្យាយាមម្តងទៀត' : 'Could not save changes');
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50/70 text-slate-900 pb-28 md:pb-16 px-4 py-8 max-w-xl mx-auto flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <UserRound className="w-8 h-8" />
        </div>
        <h1 className="font-display font-black text-xl text-slate-900 mb-2">
          {language === 'km' ? 'សូមចូលគណនី' : 'Sign in Required'}
        </h1>
        <p className="text-xs text-slate-500 mb-6 max-w-xs">
          {language === 'km' ? 'សូមចូលគណនីដើម្បីគ្រប់គ្រងព័ត៌មានផ្ទាល់ខ្លួន' : 'Sign in to view and manage your account'}
        </p>
        <Link
          to="/login"
          className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
        >
          {language === 'km' ? 'ចូលគណនីឥឡូវនេះ' : 'Sign In'}
        </Link>
      </main>
    );
  }

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
              {language === 'km' ? 'ព័ត៌មានគណនី' : 'Account Details'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'km' ? 'គ្រប់គ្រងឈ្មោះ រូបតំណាង និងព័ត៌មានផ្ទាល់ខ្លួន' : 'Manage your Apple ID style profile'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* ── Avatar Card Preview ── */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col items-center text-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-sm ring-4 ring-blue-50 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  className="w-full h-full object-cover"
                />
              ) : (
                (username || 'U').charAt(0).toUpperCase()
              )}
            </div>
            {user.is_vip_active && (
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 border-2 border-white text-[9px] font-black text-slate-950 shadow-xs">
                VIP
              </div>
            )}
          </div>
          <h2 className="font-display font-bold text-base text-slate-900">
            {username || user.username || 'Member'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {user.email || 'No email provided'}
          </p>
        </div>

        {/* ── Editable Fields Inset Group ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'កែប្រែព័ត៌មាន' : 'Profile Fields'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs p-5 space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'km' ? 'ឈ្មោះបង្ហាញ (Display Name)' : 'Display Name'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  maxLength={40}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ឧ. Sokha VIP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-sans"
                  required
                />
              </div>
            </div>

            {/* Avatar URL Input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {language === 'km' ? 'តំណភ្ជាប់រូបតំណាង (Avatar URL)' : 'Avatar Image URL'}
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {language === 'km' ? 'អ្នកអាចបញ្ចូល Link រូបភាពពី Telegram, Facebook ឬ web ណាក៏បាន' : 'Paste any direct image link to update your avatar'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Read-only Account Meta Group ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'ព័ត៌មានប្រព័ន្ធ' : 'Account Identity'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Email */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-500 block">Email</span>
                  <span className="text-sm font-semibold text-slate-900 font-mono">
                    {user.email || (language === 'km' ? 'មិនមាន' : 'None')}
                  </span>
                </div>
              </div>
            </div>

            {/* Account ID */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-500 block">User ID</span>
                  <span className="text-sm font-semibold text-slate-900 font-mono">
                    #{user.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Role */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-500 block">Role</span>
                  <span className="text-sm font-bold text-blue-600">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Submit Action ── */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{language === 'km' ? 'រក្សាទុកការផ្លាស់ប្តូរ' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-2xl bg-slate-900/90 text-white font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2 backdrop-blur-md">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </main>
  );
}

export default AccountPage;
