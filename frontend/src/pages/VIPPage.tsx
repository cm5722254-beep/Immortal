import { Check, Crown, Download, Play, Send, Smartphone } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';

const plans = [
  { key: 'pro', price: 2, limit: 0, accent: 'border-sky-500/30', icon: Play },
  { key: 'plus', price: 3, limit: 10, accent: 'border-emerald-500/40', icon: Download },
  { key: 'premium', price: 5, limit: null, accent: 'border-amber-400/50', icon: Crown },
] as const;

export function VIPPage() {
  const { user, isVip } = useAuthStore();
  const language = useLanguageStore((state) => state.language);
  const isKhmer = language === 'km';
  const expires = user?.vip_expires_at
    ? new Date(user.vip_expires_at).toLocaleDateString(isKhmer ? 'km-KH' : 'en-US')
    : null;

  const telegramUrl = (plan: string) => {
    const message = isKhmer
      ? `សួស្តី ខ្ញុំចង់ទិញកញ្ចប់ VIP ${plan} តម្លៃ $${plans.find((item) => item.key === plan)?.price}/ខែ។ ឈ្មោះគណនី៖ ${user?.username || 'មិនទាន់ចូលគណនី'}`
      : `Hello, I would like to buy the ${plan} VIP plan ($${plans.find((item) => item.key === plan)?.price}/month). Username: ${user?.username || 'Guest'}`;
    return `https://t.me/watchflixanimeadmin?text=${encodeURIComponent(message)}`;
  };

  const copy = {
    title: isKhmer ? 'ជ្រើសរើសកញ្ចប់ VIP' : 'Choose your VIP plan',
    subtitle: isKhmer ? 'មើលគ្រប់ភាគបានរយៈពេល ១ ខែ' : 'Watch every available episode for one month',
    watch: isKhmer ? 'មើលគ្រប់ភាគ' : 'Watch all episodes',
    noDownload: isKhmer ? 'មិនមានការទាញយកក្រៅបណ្ដាញ' : 'Offline downloads not included',
    limit: isKhmer ? 'ទាញយកក្រៅបណ្ដាញបាន ១០ ភាគ' : 'Up to 10 episodes offline',
    unlimited: isKhmer ? 'ទាញយកក្រៅបណ្ដាញមិនកំណត់' : 'Unlimited offline downloads',
    month: isKhmer ? '/ ១ ខែ' : '/ month',
    buy: isKhmer ? 'ទិញតាម Telegram' : 'Buy on Telegram',
    active: isKhmer ? 'គណនីរបស់អ្នកមាន VIP សកម្ម' : 'VIP is active on your account',
    expiry: isKhmer ? 'ផុតកំណត់' : 'Expires',
    account: isKhmer ? 'ចូលគណនីមុនទិញ ដើម្បីភ្ជាប់ VIP ទៅគណនីរបស់អ្នក។' : 'Sign in before buying so VIP can be linked to your account.',
    local: isKhmer ? 'កញ្ចប់ Plus រក្សាកម្រិតទាញយក ១០ ភាគនៅលើឧបករណ៍នេះ។' : 'The Plus 10-episode limit applies on this device.',
  };

  return (
    <main className="min-h-[70vh] px-4 py-12 text-white sm:px-6">
      <section className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Crown className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 text-sm text-white/60">{copy.subtitle}</p>
          {isVip && <p className="mt-3 text-sm font-semibold text-emerald-300">{copy.active}{expires ? ` · ${copy.expiry} ${expires}` : ''}</p>}
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map(({ key, price, limit, accent, icon: Icon }) => {
            const name = key[0].toUpperCase() + key.slice(1);
            const feature = limit === 0 ? copy.noDownload : limit === null ? copy.unlimited : copy.limit;
            return (
              <article key={key} className={`flex flex-col rounded-2xl border ${accent} bg-[#151820] p-5 shadow-xl sm:p-6`}>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-amber-300"><Icon className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-lg font-extrabold">{name}</h2>
                    <p className="text-xs text-white/50">{copy.watch}</p>
                  </div>
                </div>
                <p className="mt-6 text-3xl font-black">${price}<span className="ml-1 text-sm font-medium text-white/55">{copy.month}</span></p>
                <ul className="mt-5 flex-1 space-y-3 text-sm text-white/75">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-400" />{copy.watch}</li>
                  <li className="flex items-center gap-2"><Check className={`h-4 w-4 ${limit === 0 ? 'text-white/30' : 'text-emerald-400'}`} />{feature}</li>
                  {limit !== 0 && <li className="flex items-center gap-2 text-xs text-white/50"><Smartphone className="h-3.5 w-3.5" />{copy.local}</li>}
                </ul>
                <a href={telegramUrl(key)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-400">
                  <Send className="h-4 w-4" />{copy.buy}
                </a>
              </article>
            );
          })}
        </div>
        {!user && <p className="mt-5 text-center text-xs text-white/50">{copy.account}</p>}
      </section>
    </main>
  );
}

export default VIPPage;
