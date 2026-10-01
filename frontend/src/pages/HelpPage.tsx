import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Headphones, Mail, MessageCircle } from 'lucide-react';

const FAQ = [
  ['How do I join VIP?', 'Open VIP Membership, choose a plan, and follow the payment instructions shown for that plan. Your membership is activated after payment review.'],
  ['What payment methods are supported?', 'Available methods are shown in the secure checkout for your region. If no method is available, contact support before sending payment.'],
  ['What should I do if payment failed?', 'Do not pay again immediately. Keep your receipt and contact support with your account name and transaction details.'],
  ['How do I cancel automatic renewal?', 'Huang Anime plans are processed as manual payments. There is no automatic renewal unless the checkout explicitly says otherwise.'],
  ['Where are my downloads?', 'Open Me → Downloads. Downloads are stored on this device and may not be available in a different browser or device.'],
];

export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  return <main className="mini-help-page">
    <div className="mini-page-title"><Link to="/profile" aria-label="Back"><ArrowLeft /></Link><h1>Help and Feedback</h1></div>
    <section className="mini-help-self"><h2>Self-service</h2><div><Link to="/vip"><Headphones />Manage VIP</Link><Link to="/account"><MessageCircle />Account information</Link><Link to="/history"><MessageCircle />Watch history</Link><Link to="/downloads"><MessageCircle />My downloads</Link></div></section>
    <section className="mini-faq"><h2>Payment</h2>{FAQ.slice(0, 3).map(([question, answer], index) => <article key={question}><button onClick={() => setOpen(open === index ? null : index)}>{question}<ChevronDown className={open === index ? 'rotated' : ''} /></button>{open === index && <p>{answer}</p>}</article>)}</section>
    <section className="mini-faq"><h2>Playback and account</h2>{FAQ.slice(3).map(([question, answer], index) => <article key={question}><button onClick={() => setOpen(open === index + 3 ? null : index + 3)}>{question}<ChevronDown className={open === index + 3 ? 'rotated' : ''} /></button>{open === index + 3 && <p>{answer}</p>}</article>)}</section>
    <a className="mini-support-link" href="https://t.me/watchflixanimeadmin" target="_blank" rel="noreferrer"><Mail /> Contact support on Telegram</a>
  </main>;
}
