import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, LoaderCircle, X } from 'lucide-react';
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
  accent_color: '#D5A63C',
  background_color: '#101318',
};

export function ManualVipPaymentModal({ planKey, planTitle, priceKhr, onClose }: ManualVipPaymentModalProps) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="relative my-auto w-full max-w-lg overflow-hidden border border-white/10 shadow-2xl" style={{ backgroundColor: settings.background_color, borderRadius: 8, color: '#f7f7f7' }}>
        <div className="h-1" style={{ backgroundColor: settings.accent_color }} />
        <button onClick={onClose} className="absolute right-3 top-3 p-2 text-gray-400 hover:text-white" aria-label="Close payment panel"><X className="h-5 w-5" /></button>
        <div className="space-y-5 p-5 sm:p-7">
          <header>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: settings.accent_color }}>SECURE MANUAL CHECKOUT</p>
            <h2 className="mt-1 pr-8 text-xl font-black">{settings.display_name}</h2>
            <p className="mt-1 text-sm text-gray-400">{planTitle}</p>
          </header>

          {loading ? (
            <div className="flex justify-center py-12"><LoaderCircle className="h-7 w-7 animate-spin" style={{ color: settings.accent_color }} /></div>
          ) : error ? (
            <p className="border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</p>
          ) : !settings.enabled ? (
            <p className="border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">ការទូទាត់ VIP មិនទាន់បើកនៅឡើយទេ។</p>
          ) : submitted ? (
            <div className="space-y-3 border border-emerald-400/30 bg-emerald-400/10 p-5 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" />
              <h3 className="font-bold text-emerald-100">បានទទួលសំណើទូទាត់</h3>
              <p className="text-sm text-gray-300">Owner នឹងពិនិត្យប្រតិបត្តិការ មុនពេលបើក VIP។</p>
              <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-black" style={{ backgroundColor: settings.accent_color }}>បិទ</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-xs text-gray-400">ត្រូវបង់</p>
                  <p className="mt-0.5 text-2xl font-black" style={{ color: settings.accent_color }}>{priceKhr.toLocaleString()} ៛</p>
                  {settings.merchant_name && <p className="mt-1 text-xs text-gray-400">ទទួលដោយ {settings.merchant_name}</p>}
                </div>
                <button onClick={copyAmount} title="Copy amount" className="border border-white/10 p-2 text-gray-300 hover:text-white"><Copy className="h-4 w-4" /></button>
              </div>

              {(settings.method === 'khqr' || settings.method === 'both') && settings.qr_image_url && (
                <div className="flex justify-center bg-white p-3">
                  <img src={settings.qr_image_url} alt="KHQR payment code" className="max-h-64 max-w-full object-contain" />
                </div>
              )}
              {(settings.method === 'link' || settings.method === 'both') && settings.payment_link && (
                <a href={settings.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10">
                  បើកទំព័រទូទាត់ <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {settings.instructions && <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{settings.instructions}</p>}

              <form onSubmit={submitPayment} className="space-y-3 border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold text-gray-300">លេខយោងប្រតិបត្តិការ (Transaction reference)
                  <input value={reference} onChange={(event) => setReference(event.target.value)} required minLength={4} maxLength={120} className="mt-1.5 w-full border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/40" placeholder="បញ្ចូលលេខយោងពីកម្មវិធីធនាគារ" />
                </label>
                <label className="block text-xs font-semibold text-gray-300">Link រូបបង្កាន់ដៃ (ស្រេចចិត្ត)
                  <input type="url" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} className="mt-1.5 w-full border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-white/40" placeholder="https://..." />
                </label>
                {error && <p className="text-sm text-rose-300">{error}</p>}
                <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-black text-black disabled:opacity-60" style={{ backgroundColor: settings.accent_color }}>
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
