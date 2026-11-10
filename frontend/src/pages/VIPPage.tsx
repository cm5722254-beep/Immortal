import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, Check, Clock3, Crown, Download, LoaderCircle, Play, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useLanguageStore } from '../store/languageStore';
import { ManualVipPaymentModal } from '../components/payment/ManualVipPaymentModal';

interface VipPlan {
  key: string;
  title: string;
  days: number;
  amount_usd: number;
  amount_khr: number;
  description: string;
  badge?: string | null;
  can_download: boolean;
  offline_download_limit?: number | null;
}

interface PaymentSettings {
  enabled: boolean;
  method: 'khqr' | 'link' | 'both';
  payment_link?: string;
  qr_image_url?: string;
  currency: 'KHR' | 'USD';
}

interface PaymentHistoryItem {
  transaction_id: string;
  plan_title: string;
  amount: number;
  currency: string;
  amount_khr: number;
  status: string;
  created_at: string;
}

const initialSettings: PaymentSettings = { enabled: false, method: 'khqr', currency: 'KHR' };

export function VIPPage() {
  const { user, isVip, isAuthenticated } = useAuthStore();
  const language = useLanguageStore((state) => state.language);
  const location = useLocation();
  const isKhmer = language === 'km';
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [settings, setSettings] = useState<PaymentSettings>(initialSettings);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);

  useEffect(() => {
    let alive = true;
    const historyRequest = isAuthenticated
      ? api.get<PaymentHistoryItem[]>('/payment/history').catch(() => ({ data: [] as PaymentHistoryItem[] }))
      : Promise.resolve({ data: [] as PaymentHistoryItem[] });
    Promise.all([api.get<VipPlan[]>('/payment/plans'), api.get<PaymentSettings>('/payment/settings'), historyRequest])
      .then(([planResponse, settingsResponse, historyResponse]) => {
        if (!alive) return;
        setPlans(Array.isArray(planResponse.data) ? planResponse.data : []);
        setSettings({ ...initialSettings, ...(settingsResponse.data || {}) });
        setPaymentHistory(Array.isArray(historyResponse.data) ? historyResponse.data : []);
      })
      .catch(() => {
        if (alive) setLoadError(isKhmer ? 'មិនអាចផ្ទុកគម្រោង VIP បានទេ។ សូមព្យាយាមម្ដងទៀត។' : 'VIP plans could not be loaded. Please try again.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isKhmer, isAuthenticated]);

  const paymentAvailable = useMemo(() => {
    if (!settings.enabled) return false;
    const hasQr = Boolean(settings.qr_image_url?.trim());
    const hasLink = Boolean(settings.payment_link?.trim());
    return (settings.method === 'khqr' && hasQr) || (settings.method === 'link' && hasLink) || (settings.method === 'both' && (hasQr || hasLink));
  }, [settings]);

  const activePlanName = plans.find((plan) => plan.key === user?.vip_plan)?.title || user?.vip_plan;
  const expires = user?.vip_expires_at
    ? new Date(user.vip_expires_at).toLocaleDateString(isKhmer ? 'km-KH' : 'en-US')
    : null;

  return (
    <main className="vip-page min-h-[75vh] bg-slate-50/60 px-4 py-7 text-slate-900 sm:px-6 sm:py-10 pb-24 md:pb-14">
      <section className="mx-auto max-w-6xl">
        {/* Clean iOS 27 Frosted White Header */}
        <header className="vip-hero relative isolate mb-8 overflow-hidden rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 sm:px-8 sm:py-9 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 h-72 w-72 rounded-full bg-blue-500/8 blur-3xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex min-h-8 items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3 text-xs font-bold text-blue-700">
                <Crown aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" /> MerDonghua VIP
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {isKhmer ? 'ជ្រើសរើសសមាជិកភាព VIP' : 'Choose your VIP membership'}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-500">
                {isKhmer
                  ? 'ទស្សនាគ្រប់រឿង និងគ្រប់ភាគកម្រិត 4K Ultra HD ដោយគ្មានដែនកំណត់។'
                  : 'Unlock instant 4K Ultra HD streaming across every series and episode.'}
              </p>
            </div>
            {isVip && (
              <div className="min-w-52 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" aria-live="polite">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  {isKhmer ? 'VIP សកម្ម' : 'VIP active'}
                </p>
                {activePlanName && <p className="mt-1 text-sm text-slate-900 font-semibold">{activePlanName}</p>}
                {expires && <p className="mt-1 text-xs text-slate-500">{isKhmer ? 'ផុតកំណត់' : 'Expires'} · {expires}</p>}
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-3xl border border-slate-200/80 bg-white" role="status">
            <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
            <span className="sr-only">{isKhmer ? 'កំពុងផ្ទុក' : 'Loading VIP plans'}</span>
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm font-medium" role="alert">
            <AlertCircle className="mb-2 h-5 w-5" />{loadError}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-slate-500 text-sm">
            {isKhmer ? 'មិនមានគម្រោង VIP ដែលអាចជ្រើសរើសបានទេ។' : 'There are no VIP plans available right now.'}
          </div>
        ) : (
          <>
            {!paymentAvailable && (
              <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800" role="status">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <span>{isKhmer ? 'ការទូទាត់ VIP មិនទាន់បើកទេ។ អ្នកអាចមើលគម្រោងបាន ប៉ុន្តែមិនអាចដាក់សំណើទូទាត់នៅពេលនេះទេ។' : 'VIP checkout is currently unavailable. You can review plans, but payment submission is disabled.'}</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = Boolean(isVip && user?.vip_plan === plan.key);
                const isFeatured = Boolean(plan.badge);
                const Icon = plan.can_download ? Download : Play;
                return (
                  <article
                    key={plan.key}
                    className={`vip-plan-card relative flex min-w-0 flex-col rounded-[26px] border p-5 sm:p-6 transition-all ${
                      isFeatured
                        ? 'border-blue-300 bg-white ring-2 ring-blue-500/10 shadow-[0_14px_34px_rgba(37,99,235,0.08)]'
                        : 'border-slate-200/85 bg-white shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute right-4 top-4 max-w-[45%] truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-3 pr-16">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-extrabold leading-snug text-slate-900">{plan.title}</h2>
                        <p className="mt-0.5 text-xs text-slate-500">{plan.days} {isKhmer ? 'ថ្ងៃ' : plan.days === 1 ? 'day' : 'days'}</p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-3xl font-black tracking-tight text-slate-900">
                        ${plan.amount_usd.toFixed(2)} <span className="text-xs font-semibold text-slate-400">USD</span>
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        {plan.amount_khr.toLocaleString(isKhmer ? 'km-KH' : 'en-US')} ៛
                      </p>
                    </div>
                    <p className="mt-3 min-h-12 text-sm leading-relaxed text-slate-500">{plan.description}</p>

                    <ul className="mt-4 flex-1 space-y-2.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{isKhmer ? `សុពលភាព ${plan.days} ថ្ងៃ` : `${plan.days} days of access`}</span>
                      </li>
                      {plan.can_download && (
                        <li className="flex items-start gap-2.5">
                          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span>
                            {plan.offline_download_limit
                              ? (isKhmer ? `ទាញយកក្រៅបណ្ដាញបាន ${plan.offline_download_limit} ភាគ` : `Up to ${plan.offline_download_limit} offline downloads`)
                              : (isKhmer ? 'អាចទាញយកក្រៅបណ្ដាញ' : 'Offline downloads included')}
                          </span>
                        </li>
                      )}
                    </ul>

                    {isCurrent ? (
                      <div className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700" aria-current="true">
                        <ShieldCheck aria-hidden="true" className="h-4 w-4" />{isKhmer ? 'គម្រោងបច្ចុប្បន្ន' : 'Current plan'}
                      </div>
                    ) : isAuthenticated ? (
                      <button
                        type="button"
                        disabled={!paymentAvailable}
                        onClick={() => setSelectedPlan(plan)}
                        className="mt-6 min-h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm shadow-blue-600/20 cursor-pointer"
                      >
                        {isKhmer ? 'បន្តទៅការទូទាត់' : 'Continue to payment'}
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        state={{ from: location.pathname }}
                        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 transition-colors"
                      >
                        {isKhmer ? 'ចូលគណនីដើម្បីបន្ត' : 'Sign in to continue'}
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}

        {isAuthenticated && paymentHistory.length > 0 && (
          <section className="mt-8 rounded-3xl border border-slate-200/85 bg-white p-5 sm:p-6 shadow-xs" aria-labelledby="vip-payment-history-title">
            <h2 id="vip-payment-history-title" className="text-base sm:text-lg font-bold text-slate-900">
              {isKhmer ? 'ប្រវត្តិការទូទាត់ VIP' : 'VIP payment history'}
            </h2>
            <div className="mt-3 divide-y divide-slate-100">
              {paymentHistory.slice(0, 5).map((payment) => {
                const status = payment.status.toUpperCase();
                const paid = status === 'PAID' || status === 'APPROVED';
                const pending = status === 'PENDING';
                const label = paid ? (isKhmer ? 'បានបញ្ជាក់' : 'Approved') : pending ? (isKhmer ? 'កំពុងពិនិត្យ' : 'Pending review') : (isKhmer ? 'បរាជ័យ / បដិសេធ' : 'Failed / rejected');
                return (
                  <div key={payment.transaction_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">{payment.plan_title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {new Date(payment.created_at).toLocaleDateString(isKhmer ? 'km-KH' : 'en-US')} · {payment.amount_khr.toLocaleString(isKhmer ? 'km-KH' : 'en-US')} ៛
                      </p>
                    </div>
                    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${
                      paid
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : pending
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${paid ? 'bg-emerald-500' : pending ? 'bg-amber-500' : 'bg-red-500'}`} />
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </section>

      {selectedPlan && paymentAvailable && (
        <ManualVipPaymentModal
          planKey={selectedPlan.key}
          planTitle={selectedPlan.title}
          priceKhr={selectedPlan.amount_khr}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </main>
  );
}

export default VIPPage;
