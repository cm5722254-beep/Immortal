import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Crown, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Copy, 
  Check, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { createKHQROrder, checkKHQRStatus, sendPaymentAlertToTelegramGroup } from '../../services/paymentService';
import type { PaymentTransactionResponse } from '../../types';

interface AcledaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planKey: string;
  onPaymentSuccess?: () => void;
}

export const AcledaPaymentModal: React.FC<AcledaPaymentModalProps> = ({
  isOpen,
  onClose,
  planKey,
  onPaymentSuccess,
}) => {
  const { fetchMe } = useAuthStore();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<PaymentTransactionResponse | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(180); // 3 mins (matching Dynamic KHQR Tag 99 expiry)
  const [isExpired, setIsExpired] = useState<boolean>(false);
  
  const isDirectGatewayRef = useRef<boolean>(false);
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Initialize or create payment order when modal opens
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
  }, [isOpen, planKey]);

  const createOrder = async () => {
    setLoading(true);
    setError(null);
    setIsPaid(false);
    setIsExpired(false);
    setTimeLeft(180);

    try {
      const { data, isDirectGateway } = await createKHQROrder(planKey);
      isDirectGatewayRef.current = isDirectGateway;
      setTransaction(data);
      startPolling(data.transaction_id, data.bill_number);
      startCountdown();
    } catch (err: any) {
      console.error('Failed to create KHQR payment:', err);
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

  const startPolling = (txnId: string, billNo: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await checkKHQRStatus(txnId, billNo, isDirectGatewayRef.current);
        if (res.status === 'PAID') {
          handleSuccess();
        } else if (res.status === 'EXPIRED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setIsExpired(true);
        }
      } catch (err) {
        console.warn('Status poll warning:', err);
      }
    }, 2500);
  };


  const handleSuccess = async () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setIsPaid(true);

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899'],
      });
    } catch (_) {}

    // Optimistically update local user state to VIP
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      useAuthStore.setState({
        user: {
          ...currentUser,
          is_vip: true,
          is_vip_active: true,
          vip_plan: planKey,
        },
        isVip: true,
      });
    } else {
      useAuthStore.setState({ isVip: true });
    }
    localStorage.setItem('is_vip_active', 'true');

    // Send instant notification to Telegram Group via @namianimepay_bot
    if (transaction) {
      sendPaymentAlertToTelegramGroup({
        username: currentUser?.username || 'Guest',
        planTitle: transaction.plan_title,
        amountUsd: transaction.amount,
        amountKhr: transaction.amount_khr,
        billNumber: transaction.bill_number,
        transactionId: transaction.transaction_id,
        durationDays: transaction.duration_days,
      });
    }

    // Attempt backend sync
    try {
      await fetchMe();
    } catch (_) {}

    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  const handleCopyKhqr = () => {
    if (!transaction?.khqr_string) return;
    navigator.clipboard.writeText(transaction.khqr_string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-md bg-gradient-to-b from-[#18131e] via-[#120e18] to-[#0d0913] border border-amber-500/40 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-white ring-1 ring-amber-400/20 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/25 border border-red-500/50 text-red-400 text-xs font-black mb-2 shadow-lg shadow-red-950/40">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping inline-block" />
            KHQR គ្រប់ធនាគារទាំងអស់
          </div>
          <h2 className="text-xl font-black font-display text-white">
            ទូទាត់ប្រាក់តាម KHQR Code
          </h2>
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold leading-relaxed">
            📢 <strong>ស្កេនបានគ្រប់ធនាគារ៖</strong> ABA, Canadia, ACLEDA, Wing, Bakong និងគ្រប់ App ធនាគារទាំងអស់!
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-9 h-9 text-amber-400 animate-spin" />
            <p className="text-sm font-semibold text-gray-300">កំពុងបង្កើត KHQR Code...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={createOrder}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" /> ព្យាយាមម្ដងទៀត
            </button>
          </div>
        )}

        {/* SUCCESS State */}
        {!loading && !error && isPaid && (
          <div className="py-6 text-center space-y-5 animate-scale-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-black shadow-[0_0_30px_rgba(245,158,11,0.6)]">
                <Crown className="w-10 h-10 fill-black stroke-[1.5]" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> ការទូទាត់ជោគជ័យ 100%
              </span>
              <h3 className="text-2xl font-black text-white font-display">
                សូមអបអរសាទរ!
              </h3>
              <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
                គណនីរបស់អ្នកត្រូវបានដំឡើងទៅជា <strong className="text-amber-400">VIP MEMBER</strong> ដោយស្វ័យប្រវត្តិរួចរាល់ហើយ!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">គម្រោង:</span>
                <span className="font-bold text-amber-300">{transaction?.plan_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ទឹកប្រាក់:</span>
                <span className="font-bold text-white">${transaction?.amount.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">គណនីទទួល (Receiver):</span>
                <span className="font-bold text-emerald-400">KAING BUNCHHAY (013 000 063 2528)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">លេខកូដប្រតិបត្តិការ:</span>
                <span className="font-mono text-gray-300 text-[11px]">{transaction?.transaction_id}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black shadow-[0_8px_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> ចាប់ផ្ដើមទស្សនា VIP ឥឡូវនេះ
            </button>
          </div>
        )}

        {/* ACTIVE QR & PAYMENT FLOW */}
        {!loading && !error && !isPaid && transaction && (
          <div className="space-y-4">
            {/* Price & Plan Tag */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/30">
              <div className="space-y-0.5">
                <div className="text-[11px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-amber-400" /> {transaction.plan_title}
                </div>
                <div className="text-xs text-gray-400">
                  {transaction.duration_days > 0 ? `សមាជិក ${transaction.duration_days} ថ្ងៃ` : 'សមាជិកមួយជីវិត'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black font-display text-amber-400">
                  ${transaction.amount.toFixed(2)}
                </div>
                <div className="text-[10px] text-gray-400 font-bold">
                  ≈ {transaction.amount_khr.toLocaleString()} ៛
                </div>
              </div>
            </div>

            {/* KHQR Card Box with Red KHQR Header Style */}
            <div className="relative mx-auto max-w-[260px] bg-white rounded-2xl p-4 shadow-[0_10px_35px_rgba(239,68,68,0.25)] border-2 border-[#E1251B] flex flex-col items-center overflow-hidden">
              {/* KHQR Official Banner Tag */}
              <div className="w-full bg-[#E1251B] -mt-4 -mx-4 mb-3 py-1 px-4 rounded-t-[14px] flex items-center justify-between">
                <span className="text-[11px] font-black text-white tracking-widest uppercase">KHQR</span>
                <span className="text-[9px] font-bold text-white/90">BAKONG & ALL BANKS</span>
              </div>

              {/* QR Code Canvas */}
              <div className={`p-2 bg-white rounded-xl relative transition-all ${isExpired ? 'blur-sm grayscale opacity-30' : ''}`}>
                <QRCodeSVG
                  value={transaction.khqr_string || '00020101021129530016cadikhppxxx@cadi011301300006325280212Canadia Bank5204000053031165802KH5914KAING BUNCHHAY6010Phnom Penh6304745D'}
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

              {/* Expired Overlay */}
              {isExpired && (
                <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center z-10 animate-fade-in">
                  <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">QR Code បានផុតសុពលភាព</h4>
                  <p className="text-[10px] text-gray-300 mb-3">សុពលភាព 3 នាទីបានបញ្ចប់ សូមចុចបង្កើតកូដថ្មី</p>
                  <button
                    onClick={createOrder}
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 transition active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> បង្កើត QR ថ្មី
                  </button>
                </div>
              )}

              {/* Real Canadia Bank Merchant Label */}
              <div className="text-center mt-2 space-y-0.5">
                <p className="text-[12px] font-black text-gray-950 tracking-wider uppercase">KAING BUNCHHAY</p>
                <p className="text-[10px] text-gray-700 font-bold">013 000 063 2528 (Canadia Bank • KHR)</p>
                <p className="text-[9px] text-gray-500 font-medium font-mono">{transaction.bill_number}</p>
              </div>
            </div>

            {/* Live Polling Status & Countdown */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <RefreshCw className={`w-3.5 h-3.5 ${isExpired ? 'text-gray-500' : 'animate-spin text-amber-400'}`} />
                <span className="text-[11px] font-medium">
                  {isExpired ? 'QR ផុតសុពលភាព' : 'កំពុងរង់ចាំការស្កេន...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-mono text-[11px] text-gray-300 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className={timeLeft < 60 ? 'text-red-400 font-bold' : ''}>{formattedTime}</span>
                </div>
                <button
                  type="button"
                  onClick={createOrder}
                  title="បង្កើត QR ថ្មីឡើងវិញ"
                  className="p-1 rounded-lg bg-white/10 hover:bg-amber-500/20 text-gray-300 hover:text-amber-400 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mobile Actions: Deep Links & Copy */}
            <div className="space-y-2 pt-1">
              {/* Universal Bakong Deeplink */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`bakong://khqr?qr=${encodeURIComponent(transaction.khqr_string || '')}`}
                  className="py-3 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-1.5 border border-emerald-400/30 shadow-lg shadow-emerald-950/30 transition active:scale-[0.98]"
                >
                  <Smartphone className="w-4 h-4 text-white" /> ស្កេនជាមួយ App ធនាគារ
                </a>
                <button
                  type="button"
                  onClick={handleCopyKhqr}
                  className="py-3 px-3 rounded-xl font-semibold text-xs bg-white/10 hover:bg-white/15 text-gray-200 flex items-center justify-center gap-1.5 border border-white/10 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> បានចម្លង!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-400" /> ចម្លង KHQR
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Official Security Footer */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-center text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> គាំទ្រការទូទាត់តាមរយៈ Canadia Bank, ABA, ACLEDA, Wing & NBC Bakong
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

