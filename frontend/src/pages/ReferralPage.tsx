import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Gift, Share2, Star, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function ReferralPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const code = user ? `HUANG${String(user.id).slice(-6)}` : '';
  const inviteUrl = code ? `${window.location.origin}/?ref=${encodeURIComponent(code)}` : `${window.location.origin}/login`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Join Huang Anime', text: `Watch anime with me. Use my invite code ${code}`, url: inviteUrl });
      else { await navigator.clipboard.writeText(inviteUrl); setCopied(true); }
    } catch { /* User cancelled the share sheet. */ }
  };
  const copyCode = async () => {
    await navigator.clipboard.writeText(code || inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <main className="mini-referral-page">
    <div className="mini-page-title"><Link to="/profile" aria-label="Back"><ArrowLeft /></Link><h1>Friend Referral Rewards</h1></div>
    <section className="mini-referral-hero"><Gift /><h2>Invite a friend<br />to earn VIP rewards</h2><p>Share your invite link and invite friends to join Huang Anime.</p><button onClick={share}><Share2 /> Invite friends now</button></section>
    <section className="mini-referral-card"><span>Invite code</span><strong>{user ? code : 'Sign in to get your code'}</strong><button disabled={!user} onClick={copyCode}>{copied ? <Check /> : <Copy />}{copied ? 'Copied' : 'Copy code'}</button></section>
    <section className="mini-referral-progress"><div><Users /><span>Referral progress</span><strong>0 / 10</strong></div><p>Reward tracking will update here when referrals are verified by the service.</p><div className="mini-reward-steps">{[1, 3, 5, 7, 10].map((n) => <span key={n}><Star />{n}<small>{n === 1 ? '5' : n * 5} days</small></span>)}</div></section>
    <Link to="/vip" className="mini-settings-row">VIP privileges <span>View plans ›</span></Link>
  </main>;
}
