import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Download,
  HelpCircle,
  History,
  Send,
  UserCheck,
} from 'lucide-react';
import { translate, useLanguageStore } from '../store/languageStore';

const FAQ = [
  [
    'How do I join VIP?',
    'Open VIP Membership, choose a plan, and follow the payment instructions shown for that plan. Your membership is activated after payment verification.',
  ],
  [
    'What payment methods are supported?',
    'Available KHQR and bank methods are shown in the secure checkout for your region. If you need assistance, contact support directly on Telegram.',
  ],
  [
    'What should I do if payment failed?',
    'Do not submit duplicate payments. Keep your receipt screenshot and send it to support with your account email or username.',
  ],
  [
    'How do I cancel automatic renewal?',
    'MerDonghua VIP plans are one-time manual payments with zero hidden automatic renewals.',
  ],
  [
    'Where is my watch history saved?',
    'Open History from the navigation bar or Profile menu. Your last watched episode and playback timestamp are saved automatically so you can resume anytime.',
  ],
];

export function HelpPage() {
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);
  const [open, setOpen] = useState<number | null>(0);

  const quickLinks = [
    { to: '/vip', label: t('Manage VIP'), icon: Crown },
    { to: '/account', label: t('Account information'), icon: UserCheck },
    { to: '/history', label: t('Watch history'), icon: History },
    { to: '/downloads', label: t('My downloads'), icon: Download },
  ];

  return (
    <main className="min-h-screen bg-slate-50/60 text-slate-900 pb-24 md:pb-14 px-4 py-6 sm:py-8 max-w-3xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200/80">
        <Link
          to="/profile"
          aria-label={t('Back')}
          className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200/90 flex items-center justify-center text-slate-700 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900">
            {t('Help and Feedback')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'km' ? 'មជ្ឈមណ្ឌលជំនួយ និងសំណួរដែលសួរញឹកញាប់' : 'Support center & frequently asked questions'}
          </p>
        </div>
      </div>

      {/* Self-service quick grid */}
      <section className="bg-white rounded-3xl border border-slate-200/85 p-5 shadow-xs space-y-3.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('Self-service')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {quickLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="p-3.5 rounded-2xl bg-slate-50/90 hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-200 flex flex-col items-start gap-2 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="bg-white rounded-3xl border border-slate-200/85 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">
            {language === 'km' ? 'សំណួរដែលសួរញឹកញាប់' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {FAQ.map(([question, answer], index) => {
            const isOpen = open === index;
            return (
              <article key={question} className="py-3 first:pt-1 last:pb-1">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="w-full flex items-center justify-between gap-3 text-left text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer py-1"
                >
                  <span>{t(question)}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs sm:text-[13px] text-slate-500 leading-relaxed pr-6">
                    {t(answer)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Direct Support CTA */}
      <a
        href="https://t.me/watchflixanimeadmin"
        target="_blank"
        rel="noreferrer"
        className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-sm shadow-blue-600/20 transition-all"
      >
        <Send className="w-4 h-4" />
        <span>{t('Contact support on Telegram')}</span>
      </a>
    </main>
  );
}
