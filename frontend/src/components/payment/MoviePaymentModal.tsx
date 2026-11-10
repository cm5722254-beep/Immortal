import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Film, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Sparkles, 
  AlertCircle, 
  RefreshCw,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { 
  createMovieKHQROrder, 
  checkKHQRStatus, 
  markMoviePurchased, 
  sendMoviePaymentAlertToTelegramGroup,
  CANADIA_AUTOFILL_KHQR_MAP
} from '../../services/paymentService';
import type { PaymentTransactionResponse } from '../../types';

interface MoviePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieSlug: string;
  movieTitle: string;
  posterUrl?: string;
  onPaymentSuccess?: () => void;
}

export const MoviePaymentModal: React.FC<MoviePaymentModalProps> = ({
  isOpen,
  onClose,
  movieSlug,
  movieTitle,
  posterUrl,
  onPaymentSuccess,
}) => {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransactionResponse | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(180);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    createOrder();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, movieSlug]);

  const createOrder = () => {
    setLoading(true);
    setError(null);
    setIsPaid(false);
    setIsExpired(false);
    setTimeLeft(180);

    try {
      const { data } = createMovieKHQROrder(movieSlug, movieTitle);
      setTransaction(data);
      startPolling(data.transaction_id, data.bill_number);
      startCountdown();
    } catch (err: any) {
      console.error('Failed to create Movie KHQR payment:', err);
      setError(err?.message || 'មិនអាចបង្កើត KHQR បានទេ សូមព្យាយាមម្ដងទៀត');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPolling = (transactionId: string, billNumber: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const result = await checkKHQRStatus(transactionId, billNumber, true);

        if (result.status === 'PAID') {
          handleSuccess();
        } else if (result.status === 'EXPIRED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setIsExpired(true);
        }
      } catch (err) {
        console.warn('Movie status poll warning:', err);
      }
    }, 2500);
  };

  const handleSuccess = async () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsPaid(true);

    // Save purchase locally
    markMoviePurchased(movieSlug);

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 140,
        spread: 85,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EF4444', '#10B981', '#6366F1', '#3B82F6'],
      });
    } catch (_) {}

    // Send Telegram alert via @namianimepay_bot to group
    if (transaction) {
      sendMoviePaymentAlertToTelegramGroup({
        movieTitle,
        movieSlug,
        billNumber: transaction.bill_number,
        transactionId: transaction.transaction_id,
        username: user?.username || 'Guest',
      });
    }

    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  const activeKhqr: string = CANADIA_AUTOFILL_KHQR_MAP['movie'] || transaction?.khqr_string || '';

  const handleCopyKhqr = () => {
    navigator.clipboard.writeText(activeKhqr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-md bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-[28px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.16)] text-slate-900 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
            <Film className="w-3.5 h-3.5 text-blue-600" /> ទិញទស្សនារឿង Movie ដាច់ដោយឡែក
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 font-display">
            ទូទាត់ប្រាក់តាម KHQR Code
          </h3>
          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-medium leading-relaxed">
            <strong className="text-slate-900">ស្កេនបានគ្រប់ធនាគារ៖</strong> ABA, Canadia, ACLEDA, Wing, Bakong និងគ្រប់ App ធនាគារទាំងអស់!
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-9 h-9 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">កំពុងបង្កើត Movie KHQR Code ($1.00)...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={createOrder}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> ព្យាយាមម្ដងទៀត
            </button>
          </div>
        )}

        {/* SUCCESS State */}
        {!loading && !error && isPaid && (
          <div className="py-6 text-center space-y-5 animate-scale-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="relative w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-11 h-11 stroke-[2.2]" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> ការទូទាត់ជោគជ័យ 100%
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-display">
                សូមអបអរសាទរ!
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                លោកអ្នកបានដោះសោរទស្សនារឿង <strong className="text-blue-600 font-bold">{movieTitle}</strong> ដោយជោគជ័យ!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">រឿង:</span>
                <span className="font-bold text-slate-900 line-clamp-1">{movieTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ទឹកប្រាក់:</span>
                <span className="font-bold text-slate-900">$1.00 USD (≈ 4,000 ៛)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">គណនីទទួល (Receiver):</span>
                <span className="font-bold text-emerald-700">KAING BUNCHHAY (013 000 063 2528)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">សិទ្ធិ:</span>
                <span className="font-bold text-blue-600">ទស្សនាបានរហូត (Lifetime)</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> ចាប់ផ្ដើមទស្សនារឿងឥឡូវនេះ
            </button>
          </div>
        )}

        {/* ACTIVE QR & PAYMENT FLOW */}
        {!loading && !error && !isPaid && transaction && (
          <div className="space-y-4">
            {/* Movie Info & Price Tag */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt={movieTitle}
                    className="w-11 h-14 object-cover rounded-lg border border-slate-200 shrink-0 shadow-xs"
                  />
                )}
                <div className="space-y-0.5 min-w-0">
                  <div className="text-[11px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Film className="w-3 h-3 text-blue-600" /> Movie Pay-Per-View
                  </div>
                  <div className="text-xs text-slate-900 font-bold truncate">
                    {movieTitle}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">
                    ទិញម្តងទស្សនាបានរហូត
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black font-display text-slate-900">
                  $1.00
                </div>
                <div className="text-[10px] text-slate-500 font-bold">
                  ≈ 4,000 ៛
                </div>
              </div>
            </div>

            {/* KHQR Card Box */}
            <div className="relative mx-auto max-w-[260px] bg-white rounded-2xl p-4 shadow-md border-2 border-[#E1251B] flex flex-col items-center overflow-hidden">
              <div className="w-full bg-[#E1251B] -mt-4 -mx-4 mb-3 py-1 px-4 rounded-t-[14px] flex items-center justify-between">
                <span className="text-[11px] font-black text-white tracking-widest uppercase">KHQR</span>
                <span className="text-[9px] font-bold text-white/90">BAKONG & ALL BANKS</span>
              </div>

              <div className={`p-2 bg-white rounded-xl relative transition-all ${isExpired ? 'blur-sm grayscale opacity-30' : ''}`}>
                <QRCodeSVG
                  value={activeKhqr}
                  size={190}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: '/canadia-qr-logo.png',
                    height: 36,
                    width: 36,
                    excavate: true,
                  }}
                />
              </div>

              {isExpired && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 animate-fade-in">
                  <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-2">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">QR Code បានផុតសុពលភាព</h4>
                  <p className="text-[10px] text-slate-500 mb-3">សុពលភាព 3 នាទីបានបញ្ចប់ សូមចុចបង្កើតកូដថ្មី</p>
                  <button
                    onClick={createOrder}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> បង្កើត QR ថ្មី
                  </button>
                </div>
              )}

              {/* Real Canadia Bank Merchant Label */}
              <div className="text-center mt-2 space-y-0.5">
                <p className="text-[12px] font-black text-slate-950 tracking-wider uppercase">KAING BUNCHHAY</p>
                <p className="text-[10px] text-slate-600 font-bold">013 000 063 2528 (Canadia Bank • KHR)</p>
                <p className="text-[9px] text-slate-400 font-mono font-medium">{transaction.bill_number}</p>
              </div>
            </div>

            {/* Countdown and Polling */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <RefreshCw className={`w-3.5 h-3.5 ${isExpired ? 'text-slate-400' : 'animate-spin text-blue-600'}`} />
                <span className="text-[11px] font-medium">
                  {isExpired ? 'QR ផុតសុពលភាព' : 'កំពុងរង់ចាំការស្កេន...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>{formattedTime}</span>
                </div>
                <button
                  onClick={createOrder}
                  title="Refresh QR Code"
                  className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`bakong://khqr?qr=${encodeURIComponent(activeKhqr)}`}
                className="py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 transition active:scale-[0.98] text-center"
              >
                <Smartphone className="w-4 h-4 text-white" /> ស្កេនជាមួយ App ធនាគារ
              </a>

              <button
                type="button"
                onClick={handleCopyKhqr}
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                <span>{copied ? 'បានចម្លង!' : 'ចម្លង KHQR'}</span>
              </button>
            </div>

            {/* Official Security Footer */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-center text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> គាំទ្រការទូទាត់តាមរយៈ Canadia Bank, ABA, ACLEDA, Wing & NBC Bakong
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
