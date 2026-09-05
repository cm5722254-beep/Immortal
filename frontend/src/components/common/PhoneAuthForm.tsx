import { useState, useRef, useEffect } from 'react';
import { Smartphone, Check, ArrowRight, RotateCcw, AlertCircle, ShieldCheck } from 'lucide-react';
import { formatPhoneNumber, sendPhoneOtp, type PhoneAuthSession } from '../../utils/firebase';
import { useAuthStore } from '../../store/authStore';

interface PhoneAuthFormProps {
  onSuccess: () => void;
  onError?: (msg: string) => void;
}

export function PhoneAuthForm({ onSuccess, onError }: PhoneAuthFormProps) {
  const { loginWithPhone, isLoading } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [session, setSession] = useState<PhoneAuthSession | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            setCanResend(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const formatted = formatPhoneNumber(phoneNumber);
    if (formatted.length < 9) {
      setError('សូមបញ្ចូលលេខទូរសព្ទឱ្យបានត្រឹមត្រូវ (ឧទាហរណ៍៖ 012 345 678)');
      return;
    }

    setSending(true);
    try {
      const authSession = await sendPhoneOtp(formatted, 'recaptcha-container');
      setSession(authSession);
      setStep('otp');
      setCountdown(60);
      setCanResend(false);
      // Focus first OTP input
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      const msg = err?.message || 'បរាជ័យក្នុងការផ្ញើសារ OTP សូមព្យាយាមម្ដងទៀត';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Paste handling
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Move to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('សូមបញ្ចូលលេខកូដសម្ងាត់ OTP ឱ្យគ្រប់ ៦ ខ្ទង់');
      return;
    }

    setSending(true);
    try {
      let idToken = '';
      if (session) {
        const result = await session.confirm(otpCode);
        idToken = result.user?.getIdToken ? await result.user.getIdToken() : 'verified';
      }

      const formatted = formatPhoneNumber(phoneNumber);
      await loginWithPhone(formatted, idToken, displayName.trim() || undefined);
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'លេខកូដ OTP មិនត្រឹមត្រូវទេ សូមពិនិត្យម្ដងទៀត';
      setError(msg);
      if (onError) onError(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA container for Firebase */}
      <div id="recaptcha-container" />

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5 animate-slide-down">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="label text-xs">លេខទូរសព្ទ (Phone Number)</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-gray-400">
                <span className="text-sm font-bold text-amber-400">🇰🇭 +855</span>
                <span className="text-dark-border">|</span>
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="12 345 678 (Smart / Cellcard / Metfone)"
                className="input pl-24 text-sm font-semibold"
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              យើងនឹងផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់តាមសារ SMS ដើម្បីផ្ទៀងផ្ទាត់
            </p>
          </div>

          <div>
            <label className="label text-xs">ឈ្មោះគណនី (ស្រេចចិត្ត - Display Name)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ឧទាហរណ៍៖ Dara_Nami"
              className="input text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={sending || isLoading || !phoneNumber.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Smartphone className="w-4 h-4" /> ផ្ញើលេខកូដ OTP តាម SMS <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5 animate-scale-in">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white">បញ្ចូលលេខកូដសម្ងាត់ OTP</p>
            <p className="text-xs text-gray-400">
              បានផ្ញើទៅកាន់លេខ <span className="font-mono text-amber-300 font-bold">{formatPhoneNumber(phoneNumber)}</span>
            </p>
          </div>

          {/* Test OTP Helper Banner */}
          {session?.generatedOtp && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between gap-2 animate-bounce">
              <div className="text-xs">
                <span>🔑 លេខកូដ OTP តេស្ត៖ </span>
                <strong className="font-mono text-sm tracking-wider text-white bg-black/40 px-2 py-0.5 rounded-lg border border-amber-400/40">
                  {session.generatedOtp}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setOtp(session.generatedOtp!.split(''))}
                className="px-2.5 py-1 rounded-xl bg-amber-500 text-black text-[11px] font-black hover:scale-105 transition-all shadow"
              >
                បំពេញស្វ័យប្រវត្ត
              </button>
            </div>
          )}

          {/* 6 Digit Input boxes */}
          <div className="flex items-center justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-11 h-12 text-center text-xl font-bold font-mono rounded-xl bg-dark-bg border-2 border-dark-border focus:border-amber-400 focus:bg-amber-500/10 text-white outline-none transition-all shadow-inner"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
              className="text-gray-400 hover:text-white underline transition-colors"
            >
              ប្តូរលេខទូរសព្ទ
            </button>

            {canResend ? (
              <button
                type="button"
                onClick={handleSendOtp}
                className="text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> ផ្ញើម្ដងទៀត
              </button>
            ) : (
              <span className="font-mono text-gray-500">
                ផ្ញើម្ដងទៀតក្នុង ({countdown}s)
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={sending || isLoading || otp.join('').length < 6}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {sending || isLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" /> ផ្ទៀងផ្ទាត់ & ចូលគណនី (Confirm OTP)
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
