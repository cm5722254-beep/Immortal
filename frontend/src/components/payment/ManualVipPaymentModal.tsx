import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, X, Crown } from 'lucide-react';
import api from '../../services/api';

interface ManualPaymentSettings {
  enabled: boolean;
  method: 'khqr' | 'link' | 'both';
  display_name: string;
  instructions: string;
  payment_link: string;
  qr_image_url: string;
  merchant_name: string;
  currency: 'KHR' | 'USD';
  accent_color: string;
  background_color: string;
}

interface ManualVipPaymentModalProps {
  planKey: string;
  planTitle: string;
  priceKhr: number;
  onClose: () => void;
}

const DEFAULT_SETTINGS: ManualPaymentSettings = {
  enabled: false,
  method: 'khqr',
  display_name: 'VIP Membership',
  instructions: '',
  payment_link: '',
  qr_image_url: '',
  merchant_name: '',
  currency: 'KHR',
  accent_color: '#2563EB',
  background_color: '#FFFFFF',
};

export function ManualVipPaymentModal({ planKey, planTitle, priceKhr, onClose }: ManualVipPaymentModalProps) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/payment/settings')
      .then((response) => setSettings({ ...DEFAULT_SETTINGS, ...response.data }))
      .catch(() => setError('មិនអាចទាញយកព័ត៌មានទូទាត់បានទេ។ សូមព្យាយាមម្ដងទៀត។'))
      .finally(() => setLoading(false));
  }, []);

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/payment/manual/submit', {
        plan_type: planKey,
        reference: reference.trim(),
        proof_url: proofUrl.trim(),
      });
      setSubmitted(true);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || 'បញ្ជូនភស្តុតាងមិនបានសម្រេច។ សូមចូលគណនីមុន។');
    } finally {
      setSubmitting(false);
    }
  };

  const copyAmount = async () => {
    await navigator.clipboard.writeText(String(priceKhr));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-md animate-fade-in"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="relative my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl text-slate-900 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          aria-label="Close payment panel"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5 p-6 sm:p-7">
          <header>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">
              <Crown className="h-3.5 w-3.5 text-amber-600" /> Secure Checkout
            </span>
            <h2 className="mt-2 pr-8 font-display text-xl font-black text-slate-900">{settings.display_name}</h2>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{planTitle}</p>
          </header>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : error && !settings.enabled ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</p>
          ) : !settings.enabled ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">ការទូទាត់ VIP មិនទាន់បើកនៅឡើយទេ។</p>
          ) : submitted ? (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <h3 className="font-display text-base font-black text-slate-900">បានទទួលសំណើទូទាត់</h3>
              <p className="text-xs sm:text-sm text-slate-600">Owner នឹងពិនិត្យប្រតិបត្តិការ មុនពេលបើក VIP ជូនលោកអ្នក។</p>
              <button
                onClick={onClose}
                className="mt-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                យល់ព្រម
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">ចំនួនទឹកប្រាក់ត្រូវបង់</p>
                  <p className="mt-0.5 font-display text-2xl font-black text-blue-600">{priceKhr.toLocaleString()} ៛</p>
                  {settings.merchant_name && <p className="mt-0.5 text-xs text-slate-500">ទទួលដោយ៖ <strong className="text-slate-800">{settings.merchant_name}</strong></p>}
                </div>
                <button
                  type="button"
                  onClick={copyAmount}
                  title="Copy amount"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-blue-600" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {(settings.method === 'khqr' || settings.method === 'both') && settings.qr_image_url && (
                <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <img src={settings.qr_image_url} alt="KHQR payment code" className="max-h-60 max-w-full rounded-xl object-contain" />
                </div>
              )}
              {(settings.method === 'link' || settings.method === 'both') && settings.payment_link && (
                <a
                  href={settings.payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  បើកទំព័រទូទាត់ <ExternalLink className="h-4 w-4 text-blue-600" />
                </a>
              )}
              {settings.instructions && <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-600">{settings.instructions}</p>}

              <form onSubmit={submitPayment} className="space-y-3.5 border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-700">
                  លេខយោងប្រតិបត្តិការ (Transaction Reference)
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    required
                    minLength={4}
                    maxLength={120}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="បញ្ចូលលេខយោងពីកម្មវិធីធនាគារ"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Link រូបបង្កាន់ដៃ (ស្រេចចិត្ត)
                  <input
                    type="url"
                    value={proofUrl}
                    onChange={(event) => setProofUrl(event.target.value)}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="https://..."
                  />
                </label>
                {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-3.5 text-sm font-bold text-white shadow-xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />} បញ្ជូនសម្រាប់ពិនិត្យ
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
