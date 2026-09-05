import { Send } from 'lucide-react';

export function ContactDeveloperButton() {
  return (
    <aside aria-label="Developer Support" className="fixed bottom-[74px] md:bottom-6 right-3 md:right-6 z-30 group select-none scale-90 sm:scale-100 opacity-80 hover:opacity-100 transition-opacity">
      <a
        href="https://t.me/nintplex"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-gradient-to-r from-[#0088cc] to-[#2AABEE] text-white p-2.5 sm:px-3.5 sm:py-2.5 rounded-full shadow-[0_4px_16px_rgba(0,136,204,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        title="Telegram Group Chat (@nintplex)"
      >
        <div className="relative">
          <Send className="w-4 h-4 fill-white stroke-[2.2]" />
        </div>
        <span className="font-display font-semibold text-xs hidden sm:inline whitespace-nowrap">
          Group Chat (@nintplex)
        </span>
      </a>
    </aside>

  );
}
