import React from 'react';
import { ShieldAlert, Key, Ban, AlertTriangle, Check, X, Lock, ExternalLink, Send } from 'lucide-react';

interface SecurityPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityPolicyModal: React.FC<SecurityPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.16)] text-slate-900 font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-200/80">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-slate-900 tracking-tight">
              សេចក្ដីព្រមាន & គោលការណ៍ហាមឃាត់ KEY SHORTCUTS
            </h2>
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              MerDonghua — វិធានការការពារកម្មសិទ្ធិបញ្ញា & វីដេអូរក្សាសិទ្ធិ
            </p>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="space-y-5 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-red-900">
            <p className="font-bold flex items-center gap-2 text-sm text-red-700 mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>ការជូនដំណឹងសំខាន់សម្រាប់អ្នកប្រើប្រាស់ (User Notice)</span>
            </p>
            <p className="text-xs leading-relaxed text-slate-700">
              ដើម្បីការពារវីដេអូ និងទិន្នន័យប្រព័ន្ធ MerDonghua ពីការលួចចម្លង (Anti-Piracy) ប្រព័ន្ធការពារស្វ័យប្រវត្តិនឹងហាមឃាត់ការប្រើប្រាស់ Key Shortcuts មួយចំនួន។ សូមអានព័ត៌មានខាងក្រោមដោយយកចិត្តទុកដាក់៖
            </p>
          </div>

          {/* Section 1: Forbidden Keys */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-600" />
              <span>បញ្ជី KEY & SHORTCUTS ដែលត្រូវហាមឃាត់ (Prohibited Keys)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category A */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs mb-2">
                  <Ban className="w-3.5 h-3.5" />
                  <span>ថតរូបអេក្រង់ (Screenshot & Snipping)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 font-mono">
                  <li className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">PrintScreen (PrtScn)</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">Win + Shift + S</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">Cmd + Shift + 3 / 4 / 5</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                </ul>
              </div>

              {/* Category B */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>ថតវីដេអូអេក្រង់ (Screen Recording)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 font-mono">
                  <li className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">Win + Alt + R</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">Win + G (Game Bar)</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">Screen Record Tools</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                </ul>
              </div>

              {/* Category C */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 sm:col-span-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ពិនិត្យ Code & DevTools (Inspect Tools)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">F12 / Inspect Element</span>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">ព្រមាន 5 ដង → BAN</span>
                  </div>
                  <div className="flex items-center justify-between bg-white border border-slate-200/70 px-2.5 py-1.5 rounded-lg">
                    <span className="text-slate-900 font-semibold">Ctrl + Shift + I / J / C</span>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">ព្រមាន 5 ដង → BAN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Appeal contact */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-700 text-xs">
            <span className="font-medium">ប្រសិនបើច្រឡំដៃ ឬត្រូវការជំនួយ សូមទាក់ទង Admin៖</span>
            <a
              href="https://t.me/watchflixanimeadmin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Contact Admin (@watchflixanimeadmin)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>ខ្ញុំបានយល់ព្រម និងគោរពតាម (I Agree & Understand)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
