import { Crown, Send } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getVipContactUrl } from '../utils/vip';

export function VIPPage() {
  const { user, isVip } = useAuthStore();
  const telegramUrl = getVipContactUrl(user?.username);

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-5 py-16 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#211a10] to-[#111216] p-7 text-center shadow-2xl sm:p-10">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Crown className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black">Huang+ Premium</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          {isVip
            ? 'Premium is active on your account. You can watch every available episode.'
            : 'Premium membership is arranged through Telegram. Message the admin to ask about access.'}
        </p>
        {isVip && user?.vip_expires_at && (
          <p className="mt-3 text-xs text-amber-200/80">
            Expires {new Date(user.vip_expires_at).toLocaleDateString()}
          </p>
        )}
        {!isVip && (
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-bold text-[#17130a] transition hover:bg-amber-300"
          >
            <Send className="h-4 w-4" /> Message on Telegram
          </a>
        )}
      </section>
    </main>
  );
}

export default VIPPage;
