import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useThemeStore } from '../../store/themeStore';
import {
  Palette, Check, Sparkles, RefreshCw, Eye, ShieldCheck, Play
} from 'lucide-react';
import type { SiteTheme } from '../../types/theme';

export function AdminThemePage() {
  const {
    activeThemeId,
    activeTheme,
    availableThemes,
    isSaving,
    setTheme,
    saveAdminTheme,
  } = useThemeStore();

  const [selectedThemeId, setSelectedThemeId] = useState<string>(activeThemeId);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedTheme = availableThemes.find((t) => t.id === selectedThemeId) || activeTheme;

  const handlePreview = (theme: SiteTheme) => {
    setSelectedThemeId(theme.id);
    setTheme(theme.id);
  };

  const handleSaveDefault = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await saveAdminTheme(selectedThemeId);
      setSuccessMessage(`បានផ្លាស់ប្តូរពណ៌គេហទំព័រទៅជា "${selectedTheme.name}" ដោយជោគជ័យសម្រាប់អ្នកទស្សនាទាំងអស់!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'បរាជ័យក្នុងការរក្សាទុក theme');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  const handleResetToDefault = async () => {
    const defaultTheme = availableThemes[0];
    handlePreview(defaultTheme);
    try {
      await saveAdminTheme(defaultTheme.id);
      setSuccessMessage(`បានត្រឡប់មកកាន់ពណ៌ដើម "${defaultTheme.name}" វិញជោគជ័យ!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch {
      // ignore
    }
  };

  return (
    <AdminLayout title="គ្រប់គ្រង Theme ពណ៌">
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60">
                <Palette className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900">
                គ្រប់គ្រងពណ៌ Background គេហទំព័រ (10 Color Themes)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              ជ្រើសរើស និងកំណត់ពណ៌ផ្ទៃខាងក្រោយ (Background & Accent Color) សម្រាប់គេហទំព័រទាំងមូល។
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleResetToDefault}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> ពណ៌លំនាំដើម (Default)
            </button>
            <button
              onClick={handleSaveDefault}
              disabled={isSaving}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm py-2.5 px-5 flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  កំពុងរក្សាទុក...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> រក្សាទុកពណ៌គេហទំព័រ (Save Global Theme)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 animate-fade-in shadow-xs">
            <Check className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2 animate-fade-in">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Active Theme Highlight Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 transition-all duration-300 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs flex items-center gap-1"
                  style={{ backgroundColor: selectedTheme.accent }}
                >
                  <Sparkles className="w-3 h-3" /> កំពុងជ្រើសរើស (Selected)
                </span>
                <h3 className="text-lg font-display font-black text-slate-900">
                  {selectedTheme.name} <span className="text-slate-500 font-normal text-xs">({selectedTheme.name_en})</span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                {selectedTheme.description}
              </p>
            </div>

            {/* Live Palette Swatches */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-4 h-4 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: selectedTheme.bg_base }} />
                <div className="text-[11px] font-mono text-slate-600">
                  Base: <span className="text-slate-900 font-bold">{selectedTheme.bg_base}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-4 h-4 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: selectedTheme.bg_card }} />
                <div className="text-[11px] font-mono text-slate-600">
                  Card: <span className="text-slate-900 font-bold">{selectedTheme.bg_card}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-4 h-4 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: selectedTheme.border }} />
                <div className="text-[11px] font-mono text-slate-600">
                  Border: <span className="text-slate-900 font-bold">{selectedTheme.border}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-4 h-4 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: selectedTheme.accent }} />
                <div className="text-[11px] font-mono text-slate-600">
                  Accent: <span className="text-slate-900 font-bold">{selectedTheme.accent}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 10 Color Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {availableThemes.map((theme, index) => {
            const isCurrentSelected = selectedThemeId === theme.id;
            const isSiteActive = activeThemeId === theme.id;
            const isLightPreview =
              theme.id === 'pure-white' ||
              theme.bg_base.toUpperCase() === '#FFFFFF' ||
              theme.bg_base.toUpperCase() === '#F8FAFC';

            return (
              <div
                key={theme.id}
                onClick={() => handlePreview(theme)}
                className={`group cursor-pointer rounded-2xl p-5 bg-white border transition-all duration-200 relative overflow-hidden flex flex-col justify-between shadow-xs ${
                  isCurrentSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Visual Top Preview Frame */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-700">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-display font-bold text-sm sm:text-base text-slate-900">
                          {theme.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">{theme.name_en}</p>
                      </div>
                    </div>

                    {isSiteActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Live Active
                      </span>
                    )}
                  </div>

                  {/* Mockup Card Component */}
                  <div
                    className="p-3.5 rounded-xl border space-y-2.5"
                    style={{
                      backgroundColor: theme.bg_base,
                      borderColor: theme.border,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: theme.text_primary || (isLightPreview ? '#0F172A' : '#F8FAFC') }}
                        >
                          MerDonghua UI
                        </span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-2xs"
                        style={{ backgroundColor: theme.accent }}
                      >
                        VIP HD
                      </span>
                    </div>

                    <div
                      className="p-2 rounded-lg border flex items-center justify-between"
                      style={{
                        backgroundColor: theme.bg_card_subtle,
                        borderColor: theme.border,
                      }}
                    >
                      <div className="space-y-1">
                        <div className={`w-20 h-2 rounded ${isLightPreview ? 'bg-slate-300' : 'bg-slate-500/40'}`} />
                        <div className={`w-12 h-1.5 rounded ${isLightPreview ? 'bg-slate-200' : 'bg-slate-500/25'}`} />
                      </div>
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {theme.description}
                  </p>
                </div>

                {/* Bottom Color Swatches & Action */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: theme.bg_base }} title={`Base: ${theme.bg_base}`} />
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: theme.bg_card }} title={`Card: ${theme.bg_card}`} />
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: theme.bg_card_subtle }} title={`Subtle: ${theme.bg_card_subtle}`} />
                    <span className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs" style={{ backgroundColor: theme.accent }} title={`Accent: ${theme.accent}`} />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(theme);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isCurrentSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isCurrentSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Selected
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
