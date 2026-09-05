import axios from 'axios';
import api from './api';
import type { PaymentTransactionResponse, PaymentStatusCheck } from '../types';

const MENG_API_BASE = 'https://mengsmm.store/api/v1/';
const MENG_API_TOKEN = '1590108099:36dfa58ec89bda8f089044bd7fe87bda';

export const PLAN_PRICES: Record<string, { title: string; days: number; amount: number; khr: number }> = {
  '1month': { title: '1 Month VIP Access', days: 30, amount: 2.50, khr: 10000 },
  '3month': { title: '3 Months VIP Access', days: 90, amount: 7.50, khr: 30000 },
  '6month': { title: '6 Months VIP Access', days: 180, amount: 15.00, khr: 60000 },
  '1year': { title: '1 Year VIP Access', days: 365, amount: 25.00, khr: 100000 },
};

// CRC16-CCITT implementation for NBC Bakong & ACLEDA KHQR
function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvTag(tag: string, value: string): string {
  const lengthStr = value.length.toString().padStart(2, '0');
  return `${tag}${lengthStr}${value}`;
}

export const OFFICIAL_CANADIA_STATIC_KHQR = '00020101021129530016cadikhppxxx@cadi011301300006325280212Canadia Bank5204000053031165802KH5914KAING BUNCHHAY6010Phnom Penh6304745D';

export function generateOfficialBakongKHQR(amountKhr: number, billNumber: string): string {
  const tag00 = formatEmvTag('00', '01');
  const tag01 = formatEmvTag('01', '12'); // Dynamic KHQR

  // Tag 29: Canadia Bank / Bakong Info for KAING BUNCHHAY (0130000632528 | KHR)
  const sub00 = formatEmvTag('00', 'cadikhppxxx@cadi');
  const sub01 = formatEmvTag('01', '0130000632528');
  const sub02 = formatEmvTag('02', 'Canadia Bank');
  const tag29 = formatEmvTag('29', `${sub00}${sub01}${sub02}`);

  const tag52 = formatEmvTag('52', '0000');
  const tag53 = formatEmvTag('53', '116'); // 116 = KHR (Cambodian Riel - Canadia Bank Account)
  const tag54 = formatEmvTag('54', Math.round(amountKhr).toString());
  const tag58 = formatEmvTag('58', 'KH');
  const tag59 = formatEmvTag('59', 'KAING BUNCHHAY');
  const tag60 = formatEmvTag('60', 'Phnom Penh');

  const add01 = formatEmvTag('01', billNumber.slice(0, 25));
  const add02 = formatEmvTag('02', '0130000632528');
  const add03 = formatEmvTag('03', 'MerDonghua');
  const tag62 = formatEmvTag('62', `${add01}${add02}${add03}`);

  const raw = `${tag00}${tag01}${tag29}${tag52}${tag53}${tag54}${tag58}${tag59}${tag60}${tag62}6304`;
  const crc = crc16Ccitt(raw);
  return `${raw}${crc}`;
}

export async function createKHQROrder(planKey: string): Promise<{
  data: PaymentTransactionResponse;
  isDirectGateway: boolean;
}> {
  const plan = PLAN_PRICES[planKey] || PLAN_PRICES['1month'];
  const timestamp = Date.now();
  const billNumber = `MD${timestamp.toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

  // Try standard backend API first
  try {
    const res = await api.post<PaymentTransactionResponse>('/payment/create', {
      plan_type: planKey,
      currency: 'KHR',
    });
    if (res.data) {
      const encodedQr = encodeURIComponent(OFFICIAL_CANADIA_STATIC_KHQR);
      return {
        data: {
          ...res.data,
          amount: plan.amount,
          amount_khr: plan.khr,
          plan_title: plan.title,
          khqr_string: OFFICIAL_CANADIA_STATIC_KHQR,
          deeplink: `bakong://khqr?qr=${encodedQr}`,
        },
        isDirectGateway: false,
      };
    }
  } catch (err: any) {
    console.warn('Backend /payment/create fallback to Direct Bakong KHQR...', err);
  }

  // Official Static KHQR for Canadia Bank (KAING BUNCHHAY - 013 000 063 2528 | KHR)
  const encodedQr = encodeURIComponent(OFFICIAL_CANADIA_STATIC_KHQR);

  const fallbackTransaction: PaymentTransactionResponse = {
    transaction_id: `TXN_${billNumber}`,
    bill_number: billNumber,
    plan_type: planKey,
    plan_title: plan.title,
    duration_days: plan.days,
    amount: plan.amount,
    currency: 'KHR',
    amount_khr: plan.khr,
    status: 'PENDING',
    khqr_string: OFFICIAL_CANADIA_STATIC_KHQR,
    deeplink: `bakong://khqr?qr=${encodedQr}`,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  return { data: fallbackTransaction, isDirectGateway: true };
}

export async function checkKHQRStatus(
  transactionId: string,
  billNumber: string,
  isDirectGateway: boolean = false
): Promise<PaymentStatusCheck> {

  // If we're using the standard backend
  if (!isDirectGateway) {
    try {
      const res = await api.get<PaymentStatusCheck>(`/payment/status/${transactionId}`);
      return res.data;
    } catch (e) {
      console.warn('Backend status check error, trying gateway check fallback...', e);
    }
  }

  // Gateway direct check
  const checkUrl = `${MENG_API_BASE}?type=check_md5&bill_number=${billNumber}&api_token=${MENG_API_TOKEN}`;
  const gwRes = await axios.get(checkUrl, { timeout: 10000 });
  const data = gwRes.data || {};
  const rawStatus = (data.status || '').toUpperCase();

  const isPaid = rawStatus === 'SUCCESS' || rawStatus === 'PAID';
  const isExpired = rawStatus === 'EXPIRED';

  return {
    transaction_id: transactionId,
    status: isPaid ? 'PAID' : isExpired ? 'EXPIRED' : 'PENDING',
    is_vip_active: isPaid,
    paid_at: isPaid ? new Date().toISOString() : undefined,
    message: isPaid ? 'Payment Verified Successfully' : 'Waiting for scan',
  };
}

export const TELEGRAM_NOTIFY_CONFIG = {
  botToken: '8817663313:AAGSEO0bxx-EIgmQDlhY6xcjL7DuheOKQ-s',
  chatId: '-1004355858315',
};

export async function sendPaymentAlertToTelegramGroup(data: {
  username?: string;
  planTitle: string;
  amountUsd: number;
  amountKhr: number;
  billNumber: string;
  transactionId: string;
  durationDays: number;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('km-KH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const message =
`👑 <b>ការទូទាត់ VIP ជោគជ័យ (NEW VIP PAYMENT)</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>អតិថិជន:</b> <code>${data.username || 'VIP Member'}</code>
💎 <b>គម្រោង:</b> <b>${data.planTitle}</b>
💵 <b>ទឹកប្រាក់:</b> <b>$${data.amountUsd.toFixed(2)}</b> (≈ ${data.amountKhr.toLocaleString()} ៛)
🧾 <b>Bill Number:</b> <code>${data.billNumber}</code>
🆔 <b>Transaction ID:</b> <code>${data.transactionId}</code>
🏦 <b>ទូទាត់តាម:</b> Canadia Bank / NBC Bakong KHQR (KAING BUNCHHAY)
⏳ <b>សុពលភាព:</b> ${data.durationDays} ថ្ងៃ
📅 <b>កាលបរិច្ឆេទ:</b> ${dateStr} ម៉ោង ${timeStr}
━━━━━━━━━━━━━━━━━━━━━
✨ <i>ប្រព័ន្ធបានបើកសិទ្ធិ VIP លើគណនីដោយស្វ័យប្រវត្តិរួចរាល់ 100%!</i>`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_NOTIFY_CONFIG.botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_NOTIFY_CONFIG.chatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Failed to send Telegram VIP payment notification:', err);
  }
}

// ─── 🍿 MOVIE PAY-PER-VIEW HELPERS ($1.00) ───
const PURCHASED_MOVIES_KEY = 'nami_purchased_movies';

export function getPurchasedMovies(): string[] {
  try {
    const raw = localStorage.getItem(PURCHASED_MOVIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isMoviePurchased(movieSlug: string): boolean {
  if (!movieSlug) return false;
  const list = getPurchasedMovies();
  return list.includes(movieSlug);
}

export function markMoviePurchased(movieSlug: string): void {
  if (!movieSlug) return;
  const list = getPurchasedMovies();
  if (!list.includes(movieSlug)) {
    list.push(movieSlug);
    localStorage.setItem(PURCHASED_MOVIES_KEY, JSON.stringify(list));
  }
}

export function createMovieKHQROrder(movieSlug: string, movieTitle: string): {
  data: PaymentTransactionResponse;
  isDirectGateway: boolean;
} {
  const timestamp = Date.now();
  const billNumber = `MOV${timestamp.toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
  const amount = 1.00;
  const khr = 4000;

  // Use Official Canadia Bank static KHQR (KAING BUNCHHAY - 013 000 063 2528 | KHR)
  const encodedQr = encodeURIComponent(OFFICIAL_CANADIA_STATIC_KHQR);

  const transaction: PaymentTransactionResponse = {
    transaction_id: `TXN_${billNumber}`,
    bill_number: billNumber,
    plan_type: `movie_${movieSlug}`,
    plan_title: `🍿 រឿងភាពយន្ត Movie: ${movieTitle}`,
    duration_days: 0, // Lifetime access to this movie
    amount: amount,
    currency: 'KHR',
    amount_khr: khr,
    status: 'PENDING',
    khqr_string: OFFICIAL_CANADIA_STATIC_KHQR,
    deeplink: `bakong://khqr?qr=${encodedQr}`,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  };

  return { data: transaction, isDirectGateway: true };
}

export async function sendMoviePaymentAlertToTelegramGroup(data: {
  movieTitle: string;
  movieSlug: string;
  billNumber: string;
  transactionId: string;
  username?: string;
}) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('km-KH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const message =
`🍿 <b>ការទិញរឿង MOVIE ជោគជ័យ (MOVIE PURCHASED)</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>អតិថិជន:</b> <code>${data.username || 'Movie Buyer'}</code>
🎬 <b>ចំណងជើងរឿង:</b> <b>${data.movieTitle}</b>
💵 <b>តម្លៃលក់:</b> <b>$1.00</b> (≈ 4,000 ៛)
🧾 <b>Bill Number:</b> <code>${data.billNumber}</code>
🆔 <b>Transaction ID:</b> <code>${data.transactionId}</code>
🏦 <b>ទូទាត់តាម:</b> Canadia Bank / NBC Bakong KHQR (KAING BUNCHHAY)
⏳ <b>សិទ្ធិទស្សនា:</b> មួយជីវិត (Lifetime Access)
📅 <b>កាលបរិច្ឆេទ:</b> ${dateStr} ម៉ោង ${timeStr}
━━━━━━━━━━━━━━━━━━━━━
✨ <i>ប្រព័ន្ធបានបើកសិទ្ធិមើលរឿង Movie នេះដោយស្វ័យប្រវត្តិរួចរាល់ 100%!</i>`;

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_NOTIFY_CONFIG.botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_NOTIFY_CONFIG.chatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('Failed to send Telegram movie payment notification:', err);
  }
}


