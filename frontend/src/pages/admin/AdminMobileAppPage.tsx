import { useState } from 'react';
import {
  Smartphone, Package, Download, QrCode, Bell, Shield,
  CheckCircle2, AlertCircle, ExternalLink, RefreshCw,
  Zap, Lock, Camera, Wifi, HardDrive, ChevronRight
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';

// Current APK info
const APK_INFO = {
  name: 'NAMI ANIME',
  packageId: 'com.namianime.app',
  version: '1.5',
  versionCode: 5,
  minSdk: 'Android 7.0 (API 24)',
  targetSdk: 'Android 14 (API 34)',
  size: '~8.5 MB',
  downloadUrl: 'https://namianime.vercel.app/download/nami-anime.apk',
  changeLog: [
    'Rebranded from Mer Donghua → NAMI ANIME',
    'New dark AMOLED black theme (#0A0A0F)',
    'Amber/gold accent color system',
    'Full-screen immersive mode (edge-to-edge)',
    'Dark status bar + navigation bar',
    'Screenshot protection for regular users',
    'Admin can toggle screen capture via AndroidSecurity bridge',
  ],
};

const features = [
  { icon: Shield, label: 'Screenshot Protection', desc: 'Blocks screen recording for regular users', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { icon: Lock, label: 'Admin Toggle Security', desc: 'Admin can enable/disable screen capture via JS bridge', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { icon: Camera, label: 'Dark Status Bar', desc: 'Pure black immersive UI — no white flash', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { icon: Wifi, label: 'Capacitor WebView', desc: 'Loads live site: namianime.vercel.app', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { icon: HardDrive, label: 'Offline Cache', desc: 'Service worker caches assets for faster load', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: Zap, label: 'Hardware Accelerated', desc: 'Smooth 60fps video + UI animations', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
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
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-dark-card to-dark-card p-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-xl shadow-emerald-500/10">
              <Smartphone className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display font-black text-2xl text-white">NAMI ANIME Android App</h1>
                <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">v{APK_INFO.version}</span>
                <span className="badge bg-dark-muted text-gray-400 text-[10px]">Code {APK_INFO.versionCode}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Package: <span className="font-mono text-emerald-300">{APK_INFO.packageId}</span></p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
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
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
              >
                <Download className="w-4 h-4" /> Download APK
              </a>
              <button
                onClick={() => setShowQr(!showQr)}
                className="px-4 py-2.5 rounded-xl bg-dark-muted border border-dark-border text-gray-300 text-xs font-semibold flex items-center gap-2 hover:border-emerald-500/40 transition-all"
              >
                <QrCode className="w-4 h-4" /> QR Code
              </button>
            </div>
          </div>

          {/* QR Code Panel */}
          {showQr && (
            <div className="mt-5 pt-5 border-t border-dark-border flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
              {/* QR via Google Charts API */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(APK_INFO.downloadUrl)}&bgcolor=0A0A0F&color=FBBF24&margin=10`}
                alt="APK QR Code"
                className="w-40 h-40 rounded-2xl border border-emerald-500/30 bg-dark-muted"
              />
              <div className="space-y-2 text-sm">
                <p className="text-white font-bold">Scan to Download APK</p>
                <p className="text-gray-400 text-xs">Share this QR code with users to download the Android app directly</p>
                <div className="flex items-center gap-2 mt-3 bg-dark-muted rounded-xl px-3 py-2 border border-dark-border">
                  <span className="text-[10px] font-mono text-gray-400 flex-1 truncate">{APK_INFO.downloadUrl}</span>
                  <button onClick={copyLink} className="text-emerald-400 text-[10px] font-bold shrink-0">
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2-Column Grid: Features + Changelog */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* App Features */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" /> App Features & Security
            </h2>
            <div className="space-y-2.5">
              {features.map((f) => (
                <div key={f.label} className={`flex items-start gap-3 p-3 rounded-xl ${f.bg} border ${f.border}`}>
                  <div className={`w-8 h-8 rounded-lg ${f.bg} border ${f.border} flex items-center justify-center shrink-0`}>
                    <f.icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${f.color}`}>{f.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Changelog */}
          <div className="card p-5 space-y-4">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" /> Version {APK_INFO.version} — Changelog
            </h2>
            <div className="space-y-2">
              {APK_INFO.changeLog.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 py-2 border-b border-dark-border/40 last:border-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-300">{item}</span>
                </div>
              ))}
            </div>

            {/* Build Instructions */}
            <div className="mt-4 p-4 rounded-xl bg-dark-muted/60 border border-dark-border">
              <p className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-brand-400" /> Build New APK
              </p>
              <div className="space-y-1 font-mono text-[11px] text-gray-400">
                <p><span className="text-brand-400">$</span> npm run build</p>
                <p><span className="text-brand-400">$</span> npx cap sync android</p>
                <p><span className="text-brand-400">$</span> npx cap open android</p>
                <p className="text-gray-500 italic">Then: Build → Generate Signed APK in Android Studio</p>
              </div>
            </div>
          </div>
        </div>

        {/* Push Notifications Panel */}
        <div className="card p-5 border-sky-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-400" /> Push Notifications
            </h2>
            <span className="badge bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px]">
              Firebase FCM Ready
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Push notifications via Firebase Cloud Messaging (FCM). Add <span className="font-mono text-sky-300 text-xs">google-services.json</span> to enable.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-0 p-3 rounded-xl bg-dark-muted/60 border border-dark-border">
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No <span className="font-mono">google-services.json</span> found — Push Notifications disabled</span>
              </div>
            </div>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-500/25 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Firebase Console
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Smartphone, label: 'Capacitor Config', desc: 'capacitor.config.ts', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { icon: Shield, label: 'MainActivity', desc: 'com.namianime.app', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { icon: Package, label: 'Build Gradle', desc: 'app/build.gradle', color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
            { icon: HardDrive, label: 'Android Res', desc: 'Icons & Splash', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          ].map((item) => (
            <div key={item.label} className={`card p-4 ${item.bg} border ${item.border} cursor-default group hover:scale-105 transition-all`}>
              <item.icon className={`w-5 h-5 ${item.color} mb-2`} />
              <p className="text-xs font-bold text-white">{item.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
              <ChevronRight className="w-3 h-3 text-gray-600 mt-2" />
            </div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
}
