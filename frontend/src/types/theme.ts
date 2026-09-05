export interface SiteTheme {
  id: string;
  name: string;
  name_en: string;
  bg_base: string;
  bg_card: string;
  bg_card_subtle: string;
  border: string;
  accent: string;
  description: string;
}

export const SITE_THEMES: SiteTheme[] = [
  {
    id: 'midnight-slate',
    name: 'Midnight Slate (លំនាំដើម)',
    name_en: 'Midnight Slate (Default)',
    bg_base: '#0A0E17',
    bg_card: '#111726',
    bg_card_subtle: '#161F33',
    border: '#1E283C',
    accent: '#E8452C',
    description: 'The signature dark cinematic look with orange-red glow',
  },
  {
    id: 'pure-obsidian',
    name: 'OLED Pure Obsidian (ខ្មៅសុទ្ធ)',
    name_en: 'OLED Pure Obsidian',
    bg_base: '#040404',
    bg_card: '#101010',
    bg_card_subtle: '#181818',
    border: '#262626',
    accent: '#E8452C',
    description: 'Deepest OLED pitch black for ultra contrast and battery efficiency',
  },
  {
    id: 'dragon-blood',
    name: 'Dragon Blood (ក្រហមឈាមនាគ)',
    name_en: 'Dragon Blood Burgundy',
    bg_base: '#120609',
    bg_card: '#1C0B10',
    bg_card_subtle: '#281017',
    border: '#3B1622',
    accent: '#FF3355',
    description: 'Fierce imperial burgundy dark background with fiery crimson accents',
  },
  {
    id: 'cyber-purple',
    name: 'Cyber Neon Purple (ស្វាយ Cyber)',
    name_en: 'Cyber Neon Purple',
    bg_base: '#0D071B',
    bg_card: '#160C2C',
    bg_card_subtle: '#221344',
    border: '#361F66',
    accent: '#A855F7',
    description: 'Electrifying cyberpunk deep violet atmosphere',
  },
  {
    id: 'jade-dynasty',
    name: 'Jade Dynasty (បៃតងត្បូងមរកត)',
    name_en: 'Jade Dynasty Emerald',
    bg_base: '#04130D',
    bg_card: '#082016',
    bg_card_subtle: '#0E2F21',
    border: '#184734',
    accent: '#10B981',
    description: 'Mystical ancient emerald jade with luminous forest glow',
  },
  {
    id: 'ocean-sapphire',
    name: 'Ocean Sapphire (ខៀវទឹកសមុទ្រ)',
    name_en: 'Ocean Sapphire Deep Blue',
    bg_base: '#050E1E',
    bg_card: '#0A1830',
    bg_card_subtle: '#0F2445',
    border: '#183866',
    accent: '#38BDF8',
    description: 'Calm and rich abyssal ocean sapphire blue',
  },
  {
    id: 'imperial-gold',
    name: 'Imperial Gold (មាសរាជវាំង)',
    name_en: 'Imperial Amber Gold',
    bg_base: '#130D06',
    bg_card: '#1F160A',
    bg_card_subtle: '#2C1F0E',
    border: '#423016',
    accent: '#F59E0B',
    description: 'Prestigious dark bronze and royal golden amber highlights',
  },
  {
    id: 'cyber-cobalt',
    name: 'Cyber Cobalt (ខៀវអគ្គិសនី)',
    name_en: 'Cyber Cobalt Neon',
    bg_base: '#06121C',
    bg_card: '#0B1E2E',
    bg_card_subtle: '#102B42',
    border: '#1B4263',
    accent: '#06B6D4',
    description: 'Futuristic neon cyan with high-tech cobalt midnight background',
  },
  {
    id: 'velvet-rose',
    name: 'Velvet Rose (ផ្កាកុលាប Velvet)',
    name_en: 'Velvet Rose & Magenta',
    bg_base: '#140711',
    bg_card: '#200C1B',
    bg_card_subtle: '#2E1227',
    border: '#451B3B',
    accent: '#F43F5E',
    description: 'Seductive velvet dark rose magenta ambiance',
  },
  {
    id: 'titanium-gunmetal',
    name: 'Titanium Carbon (ប្រផេះដែកថែប)',
    name_en: 'Titanium Gunmetal Carbon',
    bg_base: '#0D1016',
    bg_card: '#141922',
    bg_card_subtle: '#1C2330',
    border: '#2C3647',
    accent: '#94A3B8',
    description: 'Sleek industrial titanium and stealth carbon steel',
  },
];
