import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, MessageCircle, Play, ShieldAlert } from 'lucide-react';
import { Logo } from './Logo';
import { SecurityPolicyModal } from '../common/SecurityPolicyModal';

export function Footer() {
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const accountLinks = [
    { to: '/login', label: 'ចូលគណនី / ចុះឈ្មោះ' },
    { to: '/profile', label: 'គណនី & ការកំណត់' },
    { to: '/favorites', label: 'បញ្ជីរក្សាទុករបស់ខ្ញុំ' },
    { to: '/history', label: 'ប្រវត្តិទស្សនា' },
    { to: '/vip', label: 'សមាជិក VIP ($2.50)' },
  ];

  return (
    <>
      <footer className="hidden md:block border-t border-white/[0.08] bg-[#101010] mt-20 text-neutral-400">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1 space-y-3">
              <Logo size="md" showWordmark={true} />
              <p className="text-gray-400 text-xs leading-relaxed font-sans">
                គេហទំព័រទស្សនារឿងភាគចិន 3D (Donghua) និងរឿងជប៉ុន (Anime) កម្រិតច្បាស់ Full HD & 4K UHD គ្រប់ពេលវេលា គ្រប់ទីកន្លែង។
              </p>
              <div className="flex gap-2.5 pt-2">
                <a
                  href="https://t.me/nintplex"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[#161F33] hover:bg-amber-500 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Telegram Group Chat"
                  title="Telegram Group Chat (@nintplex)"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 rounded-xl bg-[#161F33] hover:bg-amber-500 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Youtube"
                >
                  <Play className="w-4 h-4" />
                </a>
                <a
                  href="https://t.me/MerDonghuakhmer"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[#161F33] hover:bg-amber-500 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Website"
                  title="Developer Telegram"
                >
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-1.5">
                <span>តំណភ្ជាប់រហ័ស</span>
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/" className="text-gray-400 hover:text-amber-400 transition-colors">
                    ទំព័រដើម (Home)
                  </Link>
                </li>
                <li>
                  <Link to="/search" className="text-gray-400 hover:text-amber-400 transition-colors">
                    ស្វែងរករឿង Anime & Donghua
                  </Link>
                </li>
                <li>
                  <Link to="/vip" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
                    👑 គម្រោងតម្លៃ VIP ($2.50)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-1.5">
                <span>គណនី & ជំនួយ</span>
              </h4>
              <ul className="space-y-2 text-xs">
                {accountLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-gray-400 hover:text-amber-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal / Copyright & DMCA */}
            <div>
              <h4 className="font-display font-bold text-sm text-white mb-3 flex items-center gap-1.5">
                <span>គោលការណ៍សុវត្ថិភាព & DMCA</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans mb-2">
                <strong>NAMI ANIME</strong> ជាគេហទំព័រផ្តល់ការកម្សាន្ត និងស្វែងរករឿង។ រាល់វីដេអូទាំងអស់ត្រូវបានចាក់បញ្ចាំងពីប្រភពសាធារណៈ។
              </p>
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>⚠️ Keys & Shortcuts ហាមឃាត់ (Security Policy)</span>
                </button>
                <p className="text-[11px] text-amber-300/90 font-mono text-center">
                  DMCA Contact: <a href="https://t.me/MerDonghuakhmer" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">@MerDonghuakhmer</a>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#1E283C] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-gray-500">
              © {new Date().getFullYear()} <strong className="text-amber-400">ទស្សនារឿង</strong>. All rights reserved.
            </p>
            <p className="text-amber-400/90 font-semibold flex items-center gap-2">
              <span>ទស្សនារឿង — Stream Anime & Donghua 4K Ultra HD</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Security Policy Modal */}
      <SecurityPolicyModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </>
  );
}
