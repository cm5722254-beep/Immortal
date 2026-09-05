import React from 'react';
import { ShieldAlert, Key, Ban, AlertTriangle, Check, X, Lock, ExternalLink } from 'lucide-react';

interface SecurityPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityPolicyModal: React.FC<SecurityPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0F0B15] border-2 border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-500/20 text-white font-sans">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/30 shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg sm:text-xl text-white tracking-tight flex items-center gap-2">
              <span>សេចក្ដីព្រមាន & គោលការណ៍ហាមឃាត់ KEY SHORTCUTS</span>
            </h2>
            <p className="text-xs text-red-400 font-medium mt-0.5">
              ⚠️ NAMI ANIME — វិធានការការពារកម្មសិទ្ធិបញ្ញា & វីដេអូ រក្សាសិទ្ធិ
            </p>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="space-y-5 text-xs sm:text-sm text-gray-300 leading-relaxed">
          
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200">
            <p className="font-bold flex items-center gap-2 text-sm text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>ការជូនដំណឹងសំខាន់សម្រាប់អ្នកប្រើប្រាស់ (User Notice)</span>
            </p>
            <p className="text-xs leading-relaxed text-gray-300">
              ដើម្បីការពារវីដេអូ និងទិន្នន័យប្រព័ន្ធ NAMI ANIME ពីការលួចចម្លង (Anti-Piracy) ប្រព័ន្ធការពារស្វ័យប្រវត្តិនឹងហាមឃាត់ការប្រើប្រាស់ Key Shortcuts មួយចំនួន។ សូមអានព័ត៌មានខាងក្រោមដោយយកចិត្តទុកដាក់៖
            </p>
          </div>

          {/* Section 1: Forbidden Keys */}
          <div>
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2 text-amber-400">
              <Key className="w-4 h-4 text-amber-400" />
              <span>បញ្ជី KEY & SHORTCUTS ដែលត្រូវហាមឃាត់ (Prohibited Keys)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Category A: Screenshot & Snipping */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-2">
                  <Ban className="w-3.5 h-3.5" />
                  <span>ថតរូបអេក្រង់ (Screenshot & Snipping)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 font-mono">
                  <li className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">PrintScreen (PrtScn)</span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Win + Shift + S</span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Cmd + Shift + 3 / 4 / 5</span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                </ul>
              </div>

              {/* Category B: Screen Recording */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>ថតវីដេអូអេក្រង់ (Screen Recording)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 font-mono">
                  <li className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Win + Alt + R</span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Win + G (Game Bar)</span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                  <li className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Screen Record Tools</span>
                    <span className="text-[10px] text-red-400 font-bold bg-red-500/20 px-1.5 py-0.5 rounded">BAN ភ្លាមៗ</span>
                  </li>
                </ul>
              </div>

              {/* Category C: DevTools & Inspect */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-amber-500/20 sm:col-span-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ពិនិត្យ Code & DevTools (Inspect Tools)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">F12 / Inspect Element</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">ព្រមាន 5 ដង ➔ BAN</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Ctrl + Shift + I / J / C</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">ព្រមាន 5 ដង ➔ BAN</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Ctrl + U (View Source)</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">ព្រមាន 5 ដង ➔ BAN</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 px-2 py-1 rounded">
                    <span className="text-amber-300">Ctrl + S / Ctrl + P</span>
                    <span className="text-[10px] text-gray-400 font-bold bg-gray-500/20 px-1.5 py-0.5 rounded">Block ស្វ័យប្រវត្តិ</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Penalties & Consequences */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">
              ⛔ ទណ្ឌកម្ម និងវិធានការ (Penalties & Account Locks)
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside leading-relaxed">
              <li>
                <strong>Permanent Device BAN:</strong> ប្រសិនបើប្រព័ន្ធប្រទះឃើញការថត Screenshot ឬ Record គណនី និងឧបករណ៍របស់អ្នកនឹងត្រូវ <strong className="text-red-400">BANNED ជាស្ថាពរ</strong> មិនអាចចូលមើលបានទៀតឡើយ។
              </li>
              <li>
                <strong>DevTools Strike System:</strong> ការចុច F12 / Inspect លើសពី ៥ ដង ប្រព័ន្ធនឹងចាក់សោរឧបករណ៍ និងគណនីស្វ័យប្រវត្តិ។
              </li>
            </ul>
          </div>

          {/* Section 3: Appeal contact */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <span>ប្រសិនបើច្រឡំដៃ ឬត្រូវការជំនួយ សូមទាក់ទង Admin៖</span>
            <a
              href="https://t.me/MerDonghuakhmer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors shrink-0"
            >
              <span>💬 Contact Admin (@MerDonghuakhmer)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>ខ្ញុំបានយល់ព្រម និងគោរពតាម (I Agree & Understand)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
