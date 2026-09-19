import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, MessageCircle, ShieldAlert } from 'lucide-react';
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
      <footer className="border-t border-white/[0.08] bg-[#0e0e10] mt-16 md:mt-24 text-neutral-400 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-3 sm:col-span-2 md:col-span-1">
              <Logo size="md" showWordmark={true} />
              <p className="text-gray-400 text-xs leading-relaxed font-sans">
                WatchFlix Anime — គេហទំព័រទស្សនារឿងចិន 3D (Donghua) និងរឿងជប៉ុន (Anime) កម្រិតច្បាស់ Full HD & 4K UHD គ្រប់ពេលវេលា គ្រប់ទីកន្លែង ដោយឥតគិតថ្លៃ និងល្បឿនលឿន។
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                <a
                  href="https://t.me/animekhnotocation"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#0088cc]/20 hover:bg-[#0088cc] text-[#29b6f6] hover:text-white border border-[#0088cc]/40 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
                  aria-label="Telegram Channel"
                  title="Official Telegram Channel (@animekhnotocation)"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Channel</span>
                </a>
                <a
                  href="https://t.me/animekhanddonghuabot"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-gray-300 hover:text-white border border-white/15 flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
                  aria-label="Telegram Anime Bot"
                  title="Telegram Bot (@animekhanddonghuabot)"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Anime Bot</span>
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
                    ទំព័រដើម
                  </Link>
                </li>
                <li>
                  <Link to="/donghua" className="text-gray-400 hover:text-amber-400 transition-colors">
                    រឿងចិន 3D (Donghua)
                  </Link>
                </li>
                <li>
                  <Link to="/anime" className="text-gray-400 hover:text-amber-400 transition-colors">
                    រឿងជប៉ុន (Anime)
                  </Link>
                </li>
                <li>
                  <Link to="/movies" className="text-gray-400 hover:text-amber-400 transition-colors">
                    ភាពយន្តដុំ (Movies)
                  </Link>
                </li>
                <li>
                  <Link to="/search" className="text-gray-400 hover:text-amber-400 transition-colors">
                    ស្វែងរករឿង
                  </Link>
                </li>
                <li>
                  <Link to="/vip" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
                    👑 គម្រោងសមាជិក VIP
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
                <strong>WatchFlix Anime</strong> ជាគេហទំព័រផ្តល់ការកម្សាន្ត និងស្វែងរករឿង។ រាល់វីដេអូទាំងអស់ត្រូវបានចាក់បញ្ចាំងពីប្រភពសាធារណៈ។
              </p>
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setIsSecurityModalOpen(true)}
                  className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>⚠️ គោលការណ៍សុវត្ថិភាព (Security Policy)</span>
                </button>
                <p className="text-[11px] text-amber-300/90 font-mono text-center">
                  ទំនាក់ទំនង DMCA: <a href="https://t.me/watchflixanimeadmin" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">@watchflixanimeadmin</a>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-[#1E283C] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p className="text-gray-500 text-center sm:text-left">
              © {new Date().getFullYear()} <strong className="text-amber-400">WatchFlix Anime</strong>. រក្សាសិទ្ធិគ្រប់យ៉ាង។
            </p>
            <p className="text-amber-400/90 font-semibold flex items-center gap-2 text-center sm:text-right">
              <span>WatchFlix Anime — Stream Donghua & Anime 4K Ultra HD</span>
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
