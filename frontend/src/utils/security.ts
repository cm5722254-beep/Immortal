/**
 * NAMI ANIME — Site-Wide Anti-Screenshot & Anti-Screen-Recording Security Suite
 * ==============================================================================
 * 1. Blocks PrintScreen, snipping shortcuts (Win+Shift+S, Cmd+Shift+3/4/5), and Print (Ctrl+P)
 * 2. Clears system clipboard upon screenshot key detection
 * 3. Prevents Right-Click Context Menu and Image/Video Dragging site-wide
 * 4. Blocks DevTools inspection (F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S)
 * 5. Intercepts getDisplayMedia (browser screen recording / sharing tools)
 * 6. Manages Android native FLAG_SECURE screen capture / recording locks
 * 7. Admins are granted full bypass for site maintenance.
 */

declare global {
  interface Window {
    AndroidSecurity?: {
      enableScreenCapture?: (enable: boolean) => void;
    };
  }
}

export function initSecurityProtection(isAdmin: boolean) {
  // 0. Completely bypass security traps on localhost / development environment
  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '0.0.0.0');

  if (isLocalDev || isAdmin) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nami_permanent_device_banned');
      localStorage.removeItem('nami_banned_reason');
      localStorage.removeItem('nami_f12_strikes');
      document.cookie = 'nami_banned=; max-age=0; path=/;';
    }
    return () => {};
  }

  // 1. Android Native Screen Capture / Recording sync (FLAG_SECURE)
  if (typeof window !== 'undefined' && window.AndroidSecurity?.enableScreenCapture) {
    try {
      window.AndroidSecurity.enableScreenCapture(isAdmin);
    } catch (e) {
      console.warn('Native security bridge error:', e);
    }
  }

  // 2. Prevent Right-Click Context Menu site-wide
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // 3. Prevent Dragging Media/Content
  const handleDragStart = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // 4. Immediate Permanent Ban & Kickout on Screenshot attempts (Win+Shift+S, PrintScreen, etc.)
  const triggerSecurityKickout = (reason: string = 'Screenshot Attempt Detected (Win+Shift+S / PrintScreen)') => {
    try {
      // 🔒 STORE PERMANENT BAN FLAGS (Persists forever across page reloads & browser restarts)
      localStorage.setItem('nami_permanent_device_banned', 'true');
      localStorage.setItem('nami_banned_reason', reason);
      document.cookie = 'nami_banned=1; max-age=315360000; path=/;';

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(''); // Clear clipboard to prevent pasting screenshot
      }
    } catch (_) {}

    // Report to backend to permanently ban user in Database
    const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const apiBase = (window as any).__VITE_API_URL__ || (isProd ? 'https://merdonghua-com.onrender.com' : 'http://localhost:8000');
    const token = localStorage.getItem('nami_auth_token') || '';

    try {
      fetch(`${apiBase}/api/auth/security-violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          reason: `Permanent Ban: ${reason}`,
          strikes: 999
        })
      }).catch(() => {});
    } catch {}

    // Clear session tokens
    localStorage.removeItem('nami_auth_token');
    localStorage.removeItem('nami_user');

    // Pause all playing videos immediately
    document.querySelectorAll('video').forEach((vid) => {
      try {
        vid.pause();
        vid.src = '';
      } catch {}
    });

    // Replace entire page with permanent unclosable Red Ban Screen WITH Interactive Appeal Form
    document.body.innerHTML = `
      <div style="position: fixed; inset: 0; z-index: 99999999; background: #080306; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px; overflow-y: auto;">
        <div style="max-width: 520px; width: 100%; background: #11070c; border: 2px solid rgba(239,68,68,0.4); border-radius: 28px; padding: 32px 28px; box-shadow: 0 0 80px rgba(239,68,68,0.25); margin: auto;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(239,68,68,0.15); border: 2px solid #EF4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 0 50px rgba(239,68,68,0.4);">
            <span style="font-size: 38px;">⛔</span>
          </div>
          <h1 style="font-size: 24px; font-weight: 900; color: #EF4444; margin-bottom: 8px; letter-spacing: -0.02em;">
            ឧបករណ៍ និងគណនីរបស់អ្នកត្រូវបាន BANNED
          </h1>
          <p style="font-size: 14px; color: #FCA5A5; font-weight: bold; margin-bottom: 8px;">
            ⚠️ មូលហេតុ៖ ${reason}
          </p>
          <p style="font-size: 13px; color: #9CA3AF; line-height: 1.6; margin-bottom: 24px;">
            គណនីរបស់អ្នកត្រូវបានចាក់សោរបិទជាស្ថាពរ។ សូមបំពេញទម្រង់ខាងក្រោមដើម្បីស្នើសុំទៅកាន់ <strong style="color: #FBBF24;">Admin ដោះសោរ (Unban)</strong>៖
          </p>

          <div id="appeal-form-container">
            <form id="security-appeal-form" style="display: flex; flex-direction: column; gap: 14px; text-align: left;">
              <div>
                <label style="display: block; font-size: 11px; font-weight: bold; color: #9CA3AF; margin-bottom: 4px;">
                  ឈ្មោះគណនី / Email / លេខទូរសព្ទរបស់អ្នក៖
                </label>
                <input
                  id="appeal-username"
                  type="text"
                  placeholder="ឧ. username, email ឬ 012345678"
                  required
                  style="width: 100%; box-sizing: border-box; background: #080306; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 12px; padding: 10px 14px; font-size: 13px; outline: none;"
                />
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: bold; color: #9CA3AF; margin-bottom: 4px;">
                  មូលហេតុស្នើសុំដោះសោរ (Appeal Message)៖
                </label>
                <textarea
                  id="appeal-reason"
                  rows="3"
                  placeholder="ឧ. សូមទោស Admin ខ្ញុំច្រឡំដៃចុច F12 / Shortcut សូមមេត្តាជួយដោះសោរឱ្យខ្ញុំវិញផង..."
                  required
                  style="width: 100%; box-sizing: border-box; background: #080306; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 12px; padding: 10px 14px; font-size: 13px; outline: none; resize: none;"
                ></textarea>
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: bold; color: #9CA3AF; margin-bottom: 4px;">
                  ព័ត៌មានទំនាក់ទំនង (Telegram / Phone) [Optional]៖
                </label>
                <input
                  id="appeal-contact"
                  type="text"
                  placeholder="ឧ. @my_telegram ឬ 098765432"
                  style="width: 100%; box-sizing: border-box; background: #080306; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 12px; padding: 10px 14px; font-size: 13px; outline: none;"
                />
              </div>

              <button
                id="appeal-submit-btn"
                type="submit"
                style="width: 100%; background: linear-gradient(135deg, #EF4444, #D97706); color: #fff; font-weight: 900; font-size: 13px; padding: 12px 20px; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 20px rgba(239,68,68,0.3); margin-top: 4px;"
              >
                📩 ផ្ញើសំណើស្នើសុំដោះសោរទៅកាន់ Admin (Submit Appeal)
              </button>
            </form>
          </div>

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <a
              href="https://t.me/watchflixanimeadmin"
              target="_blank"
              rel="noreferrer"
              style="display: inline-flex; align-items: center; gap: 6px; color: #38BDF8; font-size: 12px; text-decoration: none; font-weight: bold;"
            >
              💬 ទាក់ទង Admin តាម Telegram ផ្ទាល់ (@watchflixanimeadmin)
            </a>
          </div>
        </div>
      </div>
    `;

    // Attach submit event listener to the injected form
    setTimeout(() => {
      const form = document.getElementById('security-appeal-form');
      if (form) {
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const usernameVal = (document.getElementById('appeal-username') as HTMLInputElement)?.value || '';
          const reasonVal = (document.getElementById('appeal-reason') as HTMLTextAreaElement)?.value || '';
          const contactVal = (document.getElementById('appeal-contact') as HTMLInputElement)?.value || '';
          const btn = document.getElementById('appeal-submit-btn') as HTMLButtonElement;

          if (btn) {
            btn.disabled = true;
            btn.innerText = 'កំពុងផ្ញើសំណើ...';
          }

          // Always backup appeal locally
          try {
            const appeals = JSON.parse(localStorage.getItem('nami_local_appeals') || '[]');
            appeals.push({
              username: usernameVal.trim(),
              reason: reasonVal.trim(),
              contact: contactVal.trim(),
              date: new Date().toISOString()
            });
            localStorage.setItem('nami_local_appeals', JSON.stringify(appeals));
          } catch {}

          let success = false;
          let msg = 'សំណើស្នើសុំត្រូវបានផ្ញើរួចរាល់!';

          // Try local first, then fallback to Render backend
          const endpoints = [
            'http://localhost:8000/api/auth/request-unban',
            'https://merdonghua-com.onrender.com/api/auth/request-unban'
          ];

          for (const url of endpoints) {
            try {
              const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username_or_email: usernameVal.trim(),
                  reason: reasonVal.trim(),
                  contact: contactVal.trim() || 'Not provided',
                }),
              });
              if (res.ok) {
                const data = await res.json();
                msg = data.message || msg;
                success = true;
                break;
              }
            } catch (err) {
              // Try next endpoint
            }
          }

          const container = document.getElementById('appeal-form-container');
          if (container) {
            if (success) {
              container.innerHTML = `
                <div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 16px; padding: 20px; color: #6EE7B7; font-size: 14px; font-weight: bold; text-align: center; line-height: 1.6;">
                  <p style="font-size: 16px; margin-bottom: 6px;">✅ ${msg}</p>
                  <p style="font-size: 12px; color: #D1D5DB; font-weight: normal; margin-top: 4px;">
                    Admin នឹងពិនិត្យ និងដោះសោរជូនអ្នកក្នុងពេលឆាប់ៗ។
                  </p>
                </div>
              `;
            } else {
              // Even if both network requests fail, show confirmed saved locally
              container.innerHTML = `
                <div style="background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); border-radius: 16px; padding: 20px; color: #6EE7B7; font-size: 14px; font-weight: bold; text-align: center; line-height: 1.6;">
                  <p style="font-size: 16px; margin-bottom: 6px;">✅ សំណើស្នើសុំរបស់អ្នកត្រូវបានកត់ត្រាជោគជ័យ!</p>
                  <p style="font-size: 12px; color: #D1D5DB; font-weight: normal; margin-top: 4px;">
                    Admin នឹងពិនិត្យ និងដោះសោរជូនអ្នកក្នុងពេលឆាប់ៗ។ ឬអាចផ្ញើសារតាម Telegram (@merdonghuakh)។
                  </p>
                </div>
              `;
            }
          }
        });
      }
    }, 100);
  };

  // 5. Block All Windows & Mac Screenshot / Screen Recording Shortcuts -> Permanent Ban
  const handleKeyDown = (e: KeyboardEvent) => {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const keyLower = (e.key || '').toLowerCase();

    // 1. PrintScreen (Any combination: PrtScn, Win+PrtScn, Alt+PrtScn, Ctrl+PrtScn)
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      e.preventDefault();
      e.stopPropagation();
      triggerSecurityKickout('Windows PrintScreen / Alt+PrtScn Detected');
      return false;
    }

    // 2. Windows Snipping Tool (Win+Shift+S) / Mac Screenshot (Cmd+Shift+3/4/5) / Edge Web Capture (Ctrl+Shift+S)
    if (e.shiftKey && (isCtrlOrMeta || e.metaKey) && ['s', '3', '4', '5'].includes(keyLower)) {
      e.preventDefault();
      e.stopPropagation();
      triggerSecurityKickout('Snipping Tool (Win+Shift+S / Cmd+Shift+S) Detected');
      return false;
    }

    // 3. Windows Game Bar Video Recording (Win+Alt+R or Alt+R)
    if (isAlt && (isCtrlOrMeta || e.metaKey) && keyLower === 'r') {
      e.preventDefault();
      e.stopPropagation();
      triggerSecurityKickout('Windows Game Bar Screen Recording (Win+Alt+R) Detected');
      return false;
    }

    // 4. Windows Game Bar Overlay (Win+G)
    if (e.metaKey && keyLower === 'g') {
      e.preventDefault();
      e.stopPropagation();
      triggerSecurityKickout('Windows Game Bar (Win+G) Detected');
      return false;
    }

    // 5. Ctrl+P (Print to PDF/Paper)
    if (isCtrlOrMeta && keyLower === 'p') {
      e.preventDefault();
      e.stopPropagation();
      triggerSecurityKickout('Print Shortcut (Ctrl+P) Detected');
      return false;
    }

    // ─── 🛑 F12 & DEVTOOLS 5-STRIKE AUTO-BAN SYSTEM ───
    const isDevToolsKey =
      e.key === 'F12' ||
      e.keyCode === 123 ||
      (isCtrlOrMeta && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(e.key)) ||
      (isCtrlOrMeta && ['U', 'u'].includes(e.key));

    if (isDevToolsKey) {
      e.preventDefault();
      e.stopPropagation();

      let currentStrikes = parseInt(localStorage.getItem('nami_f12_strikes') || '0', 10) + 1;
      localStorage.setItem('nami_f12_strikes', currentStrikes.toString());

      if (currentStrikes >= 5) {
        // ⛔ 5+ STRIKES: TRIGGER PERMANENT BAN WITH APPEAL FORM
        triggerSecurityKickout('F12 / Inspect លើស ៥ ដង (DevTools 5+ Strikes)');
        return false;
      } else {
        // Warning Toast for strikes 1 to 4
        const existingWarning = document.getElementById('nami-f12-warning');
        if (existingWarning) existingWarning.remove();

        const toast = document.createElement('div');
        toast.id = 'nami-f12-warning';
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.zIndex = '9999999';
        toast.style.backgroundColor = '#1C0E07';
        toast.style.border = '2px solid #EF4444';
        toast.style.borderRadius = '16px';
        toast.style.padding = '14px 24px';
        toast.style.color = '#fff';
        toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        toast.style.fontSize = '13px';
        toast.style.fontWeight = 'bold';
        toast.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(239,68,68,0.3)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.innerHTML = `
          <span style="font-size: 18px;">⚠️</span>
          <span>ការព្រមានសុវត្ថិភាព (<strong style="color:#EF4444;">${currentStrikes}/5</strong>)៖ ការចុច F12 / Inspect លើស ៥ ដង គណនីរបស់អ្នកនឹងត្រូវ <strong>BANNED</strong> ភ្លាមៗ!</span>
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
        return false;
      }
    }

    // Ctrl+S (Save Page)
    if (isCtrlOrMeta && ['S', 's'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  // 6. Block Screen Capture / Display Media Recording API
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async () => {
        triggerSecurityKickout('Screen Recording Attempt Detected');
        throw new DOMException('Screen recording is not allowed on NAMI ANIME', 'NotAllowedError');
      };
    }
  } catch {}

  // 7. PC External Screen Capture Defocus Protection (Snipping Tool & Background Record Trap)
  const handleWindowBlur = () => {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((vid) => {
      if (!vid.paused) {
        vid.style.filter = 'blur(40px) brightness(0.1)';
      }
    });
  };

  const handleWindowFocus = () => {
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((vid) => {
      vid.style.filter = 'none';
    });
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      handleWindowBlur();
    } else {
      handleWindowFocus();
    }
  };

  window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  window.addEventListener('dragstart', handleDragStart, { capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      triggerSecurityKickout('PrintScreen Keyup Detected');
    }
  }, { capture: true });

  // Return cleanup function
  return () => {
    window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    window.removeEventListener('dragstart', handleDragStart, { capture: true });
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
