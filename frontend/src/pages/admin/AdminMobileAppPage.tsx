import { useState } from 'react';
import {
  Smartphone, Package, Download, QrCode, Bell, Shield,
  CheckCircle2, AlertCircle, ExternalLink, RefreshCw,
  Zap, Lock, Camera, Wifi, HardDrive, ChevronRight
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';

// Current APK info
const APK_INFO = {
  name: 'MerDonghua',
  packageId: 'com.namianime.app',
  version: '1.5',
  versionCode: 5,
  minSdk: 'Android 7.0 (API 24)',
  targetSdk: 'Android 14 (API 34)',
  size: '~8.5 MB',
  downloadUrl: 'https://namianime.vercel.app/download/nami-anime.apk',
  changeLog: [
    'Updated MerDonghua brand identity and clean layout',
    'Apple iOS 27 Liquid Glass White interface design',
    'Calm ocean blue accent color system',
    'Full-screen immersive mode (edge-to-edge)',
    'System-adaptive status bar and navigation bar',
    'Screenshot protection for regular users',
    'Admin can toggle screen capture via AndroidSecurity bridge',
  ],
};

const features = [
  { icon: Shield, label: 'Screenshot Protection', desc: 'Blocks screen recording for regular users', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200/70' },
  { icon: Lock, label: 'Admin Toggle Security', desc: 'Admin can enable/disable screen capture via JS bridge', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200/70' },
  { icon: Camera, label: 'Adaptive Status Bar', desc: 'Clean edge-to-edge immersive UI with smooth transitions', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200/70' },
  { icon: Wifi, label: 'Capacitor WebView', desc: 'Loads live site with automatic cloud updates', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200/70' },
  { icon: HardDrive, label: 'Offline Cache', desc: 'Service worker caches assets for faster load', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200/70' },
  { icon: Zap, label: 'Hardware Accelerated', desc: 'Smooth 60fps video + UI animations', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200/70' },
];

export function AdminMobileAppPage() {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(APK_INFO.downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout title="Mobile App Management" section="mobile">
      <div className="space-y-6 max-w-5xl animate-fade-in">

        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Smartphone className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-black text-2xl text-slate-900">MerDonghua Android App</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  v{APK_INFO.version}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                  Code {APK_INFO.versionCode}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Package: <span className="font-mono text-blue-600 font-semibold">{APK_INFO.packageId}</span>
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                <span>Min: {APK_INFO.minSdk}</span>
                <span>Target: {APK_INFO.targetSdk}</span>
                <span>Size: {APK_INFO.size}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href={APK_INFO.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
              >
                <Download className="w-4 h-4" /> Download APK
              </a>
              <button
                onClick={() => setShowQr(!showQr)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" /> QR Code
              </button>
            </div>
          </div>

          {/* QR Code Panel */}
          {showQr && (
            <div className="mt-5 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(APK_INFO.downloadUrl)}&bgcolor=FFFFFF&color=0F172A&margin=10`}
                alt="APK QR Code"
                className="w-40 h-40 rounded-2xl border border-slate-200 bg-white shadow-2xs"
              />
              <div className="space-y-2 text-sm">
                <p className="text-slate-900 font-bold">Scan to Download APK</p>
                <p className="text-slate-500 text-xs">Share this QR code with users to download the Android app directly</p>
                <div className="flex items-center gap-2 mt-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                  <span className="text-[10px] font-mono text-slate-600 flex-1 truncate">{APK_INFO.downloadUrl}</span>
                  <button onClick={copyLink} className="text-blue-600 hover:text-blue-700 text-[11px] font-bold shrink-0 cursor-pointer">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Grid: Features + Changelog */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* App Features */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" /> App Features & Security
            </h2>
            <div className="space-y-2.5">
              {features.map((f) => (
                <div key={f.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80">
                  <div className={`w-8 h-8 rounded-lg ${f.bg} border ${f.border} flex items-center justify-center shrink-0`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{f.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Changelog */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" /> Version {APK_INFO.version} — Changelog
            </h2>
            <div className="space-y-2">
              {APK_INFO.changeLog.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-700">{item}</span>
                </div>
              ))}
            </div>

            {/* Build Instructions */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" /> Build New APK
              </p>
              <div className="space-y-1 font-mono text-[11px] text-slate-600">
                <p><span className="text-blue-600 font-bold">$</span> npm run build</p>
                <p><span className="text-blue-600 font-bold">$</span> npx cap sync android</p>
                <p><span className="text-blue-600 font-bold">$</span> npx cap open android</p>
                <p className="text-slate-500 italic">Then: Build &gt; Generate Signed APK in Android Studio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Push Notifications Panel */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-600" /> Push Notifications
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
              Firebase FCM Ready
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Push notifications via Firebase Cloud Messaging (FCM). Add <span className="font-mono text-sky-700 font-semibold text-xs">google-services.json</span> to enable.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-0 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>No <span className="font-mono font-semibold">google-services.json</span> found — Push Notifications disabled</span>
              </div>
            </div>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Firebase Console
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Smartphone, label: 'Capacitor Config', desc: 'capacitor.config.ts', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200/70' },
            { icon: Shield, label: 'MainActivity', desc: 'com.namianime.app', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200/70' },
            { icon: Package, label: 'Build Gradle', desc: 'app/build.gradle', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200/70' },
            { icon: HardDrive, label: 'Android Res', desc: 'Icons & Splash', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200/70' },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/50 rounded-2xl p-4 shadow-xs cursor-default group transition-all"
            >
              <div className={`w-9 h-9 rounded-xl border ${item.bg} flex items-center justify-center mb-2.5`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className="text-xs font-bold text-slate-900">{item.label}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-2" />
            </div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}
