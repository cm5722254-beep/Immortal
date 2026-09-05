import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void; auto_select?: boolean }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, any>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function GoogleSignInButton({
  text = 'continue_with',
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const isNative = Capacitor.isNativePlatform();

  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '61487303458-hlnh49s0hpbngi74dc8jqcvivcn48152.apps.googleusercontent.com';

  const handleNativeGoogleSignIn = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setStatusText('កំពុងបើក Google Login...');

      // 15-second timeout protection for native Google Sign-In dialog
      const authPromise = FirebaseAuthentication.signInWithGoogle({
        scopes: ['profile', 'email'],
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Google Sign-In មិនឆ្លើយតបក្នុងរយៈពេលកំណត់ (Timed out)។ សូមព្យាយាមម្តងទៀត។')), 15000)
      );

      const result: any = await Promise.race([authPromise, timeoutPromise]);

      const idToken = result?.credential?.idToken || result?.user?.idToken;

      if (idToken) {
        setStatusText('កំពុងផ្ទៀងផ្ទាត់ជាមួយ Server...');
        await loginWithGoogle(idToken);
        onSuccess?.();
      } else {
        onError?.('មិនអាចទទួលបាន Token ពី Google ទេ។ សូមពិនិត្យមើលការកំណត់ក្នុង Firebase Console។');
      }
    } catch (err: any) {
      console.error('Native Google Auth Error:', err);
      const msg = err?.message || 'Google Sign-In បរាជ័យ';
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        onError?.(`Google Auth error: ${msg}`);
      }
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  useEffect(() => {
    if (isNative) return;

    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      window.location.replace(window.location.href.replace('127.0.0.1', 'localhost'));
      return;
    }

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else if (window.google?.accounts?.id) {
      initGoogle();
    }

    function initGoogle() {
      if (!window.google?.accounts?.id) return;
      if (!clientId) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (response.credential) {
            try {
              setLoading(true);
              setStatusText('កំពុងផ្ទៀងផ្ទាត់ជាមួយ Server...');
              await loginWithGoogle(response.credential);
              onSuccess?.();
            } catch (err: any) {
              onError?.(err?.response?.data?.detail || 'Google sign-in failed');
            } finally {
              setLoading(false);
              setStatusText('');
            }
          }
        },
      });

      if (btnRef.current) {
        btnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(btnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: text,
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        });
      }
    }
  }, [clientId, text, loginWithGoogle, onSuccess, onError, isNative]);

  if (isNative) {
    return (
      <div className="w-full flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleNativeGoogleSignIn}
          className="w-full max-w-[320px] flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-full py-3 px-5 transition-all duration-200 shadow-lg border border-gray-300 active:scale-95 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="text-sm font-semibold">
            {loading ? (statusText || 'កំពុងដំណើរការ...') : 'Continue with Google'}
          </span>
        </button>
        {statusText && <p className="text-[11px] text-amber-400 animate-pulse font-medium">{statusText}</p>}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-2">
      {clientId ? (
        <div ref={btnRef} className="w-full flex justify-center min-h-[44px]" />
      ) : (
        <button
          type="button"
          onClick={() => onError?.('Google Client ID is not configured yet.')}
          className="w-full max-w-[320px] flex items-center justify-center gap-3 bg-dark-card border border-dark-border rounded-xl py-2.5 px-4 text-sm font-semibold text-gray-200"
        >
          Continue with Google
        </button>
      )}
      {statusText && <p className="text-[11px] text-amber-400 animate-pulse font-medium">{statusText}</p>}
    </div>
  );
}
