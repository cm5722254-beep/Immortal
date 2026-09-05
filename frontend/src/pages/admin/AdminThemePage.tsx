import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { useThemeStore } from '../../store/themeStore';
import {
  Palette, Check, Sparkles, RefreshCw, Eye, ShieldCheck
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
      setSuccessMessage(`✅ បានផ្លាស់ប្តូរពណ៌គេហទំព័រទៅជា "${selectedTheme.name}" ដោយជោគជ័យសម្រាប់អ្នកទស្សនាទាំងអស់!`);
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
      setSuccessMessage(`✅ បានត្រឡប់មកកាន់ពណ៌ដើម "${defaultTheme.name}" វិញជោគជ័យ!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      // ignore
    }
  };

  return (
    <AdminLayout title="គ្រប់គ្រង Theme ពណ៌">
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-[#111726] to-[#161F33] border border-[#1E283C] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#E8452C]/15 text-[#E8452C] border border-[#E8452C]/30">
                <Palette className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-black text-white">
                គ្រប់គ្រងពណ៌ Background គេហទំព័រ (10 Color Themes)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              ជ្រើសរើស និងកំណត់ពណ៌ផ្ទៃខាងក្រោយ (Background & Accent Color) សម្រាប់គេហទំព័រទាំងមូល។
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetToDefault}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#1E283C] hover:bg-[#25324C] border border-[#2A3750] transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> ពណ៌លំនាំដើម (Default)
            </button>
            <button
              onClick={handleSaveDefault}
              disabled={isSaving}
              className="btn-primary text-xs sm:text-sm py-2.5 px-5 flex items-center gap-2 shadow-lg shadow-[#E8452C]/25 disabled:opacity-50"
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
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-medium flex items-center gap-2 animate-fade-in shadow-lg">
            <Check className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2 animate-fade-in">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Active Theme Highlight Card */}
        <div
          className="p-5 rounded-2xl border transition-all duration-300 shadow-2xl relative overflow-hidden"
          style={{
            backgroundColor: selectedTheme.bg_card,
            borderColor: selectedTheme.border,
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1"
                  style={{ backgroundColor: selectedTheme.accent }}
                >
                  <Sparkles className="w-3 h-3" /> កំពុងជ្រើសរើស (Selected)
                </span>
                <h3 className="text-lg font-display font-black text-white">
                  {selectedTheme.name} <span className="text-gray-400 font-normal text-xs">({selectedTheme.name_en})</span>
                </h3>
              </div>
              <p className="text-xs text-gray-300 max-w-xl">
                {selectedTheme.description}
              </p>
            </div>

            {/* Live Palette Swatches */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: selectedTheme.bg_base }} />
                <div className="text-[11px] font-mono text-gray-300">
                  Base: <span className="text-white font-bold">{selectedTheme.bg_base}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: selectedTheme.bg_card }} />
                <div className="text-[11px] font-mono text-gray-300">
                  Card: <span className="text-white font-bold">{selectedTheme.bg_card}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: selectedTheme.border }} />
                <div className="text-[11px] font-mono text-gray-300">
                  Border: <span className="text-white font-bold">{selectedTheme.border}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                <div className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: selectedTheme.accent }} />
                <div className="text-[11px] font-mono text-gray-300">
                  Accent: <span className="text-white font-bold">{selectedTheme.accent}</span>
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

            return (
              <div
                key={theme.id}
                onClick={() => handlePreview(theme)}
                className={`group cursor-pointer rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-xl ${
                  isCurrentSelected
                    ? 'ring-2 ring-offset-2 ring-offset-[#0A0E17] scale-[1.01]'
                    : 'hover:scale-[1.008] hover:border-gray-500/50 opacity-90 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: theme.bg_card,
                  borderColor: isCurrentSelected ? theme.accent : theme.border,
                  // @ts-ignore
                  '--tw-ring-color': theme.accent,
                }}
              >
                {/* Visual Top Preview Frame */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-[11px] font-bold text-gray-300">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-white transition-colors">
                          {theme.name}
                        </h4>
                        <p className="text-[11px] text-gray-400">{theme.name_en}</p>
                      </div>
                    </div>

                    {isSiteActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm shrink-0">
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
                        <span className="text-[10px] font-bold text-gray-200">Mer Donghua UI</span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-sm"
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
                      <div className="space-y-0.5">
                        <div className="w-20 h-2 rounded bg-white/20" />
                        <div className="w-12 h-1.5 rounded bg-white/10" />
                      </div>
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: theme.accent }}
                      >
                        ▶
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {theme.description}
                  </p>
                </div>

                {/* Bottom Color Swatches & Action */}
                <div className="pt-4 mt-3 border-t flex items-center justify-between" style={{ borderColor: theme.border }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: theme.bg_base }} title={`Base: ${theme.bg_base}`} />
                    <span className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: theme.bg_card }} title={`Card: ${theme.bg_card}`} />
                    <span className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: theme.bg_card_subtle }} title={`Subtle: ${theme.bg_card_subtle}`} />
                    <span className="w-4 h-4 rounded-full border border-white/20 shadow" style={{ backgroundColor: theme.accent }} title={`Accent: ${theme.accent}`} />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(theme);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      isCurrentSelected
                        ? 'text-white shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                    }`}
                    style={{
                      backgroundColor: isCurrentSelected ? theme.accent : undefined,
                    }}
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
