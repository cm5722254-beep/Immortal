/**
 * MER DONGHUA — Khmer Title Mapping & Localization Utility
 * =========================================================
 * Provides authentic Khmer translation names for Chinese Donghua,
 * Japanese Anime, and Asian Drama series.
 */

export const KHMER_TITLE_MAP: Record<string, { khmer: string; pinyin?: string }> = {
  // Popular 3D Donghua
  'renegade immortal': { khmer: 'ស៊ាននី (仙逆)', pinyin: 'Xian Ni' },
  'xian ni': { khmer: 'ស៊ាននី (仙逆)', pinyin: 'Xian Ni' },
  'battle through the heavens': { khmer: 'ប្រយុទ្ធបំបែកមេឃ (斗破苍穹)', pinyin: 'Doupo Cangqiong' },
  'doupo cangqiong': { khmer: 'ប្រយុទ្ធបំបែកមេឃ (斗破苍穹)', pinyin: 'Doupo Cangqiong' },
  'perfect world': { khmer: 'ពិភពលោកឥតខ្ចោះ (完美世界)', pinyin: 'Wanmei Shijie' },
  'wanmei shijie': { khmer: 'ពិភពលោកឥតខ្ចោះ (完美世界)', pinyin: 'Wanmei Shijie' },
  'soul land': { khmer: 'ដីគោកព្រលឹង (斗罗大陆)', pinyin: 'Douluo Dalu' },
  'douluo dalu': { khmer: 'ដីគោកព្រលឹង (斗罗大陆)', pinyin: 'Douluo Dalu' },
  'soul land 2': { khmer: 'ដីគោកព្រលឹង វគ្គ ២ (និកាយថាង)', pinyin: 'Douluo Dalu II' },
  'soul land 2: the peerless tang clan': { khmer: 'ដីគោកព្រលឹង វគ្គ ២ (និកាយថាង)', pinyin: 'Douluo Dalu II' },
  'swallowed star': { khmer: 'លេបត្របាក់ផ្កាយ (吞噬星空)', pinyin: 'Tunshi Xingkong' },
  'tunshi xingkong': { khmer: 'លេបត្របាក់ផ្កាយ (吞噬星空)', pinyin: 'Tunshi Xingkong' },
  'throne of seal': { khmer: 'បល្ល័ង្កត្រាទេវៈ (神印王座)', pinyin: 'Shen Yin Wangzuo' },
  'shen yin wangzuo': { khmer: 'បល្ល័ង្កត្រាទេវៈ (神印王座)', pinyin: 'Shen Yin Wangzuo' },
  'a record of a mortal\'s journey to immortality': { khmer: 'ដំណើរមនុស្សសាមញ្ញកសាងបារមី (凡人修仙传)', pinyin: 'Fanren Xiu Xian Zhuan' },
  'fanren xiu xian zhuan': { khmer: 'ដំណើរមនុស្សសាមញ្ញកសាងបារមី (凡人修仙传)', pinyin: 'Fanren Xiu Xian Zhuan' },
  'the great ruler': { khmer: 'មហាកំពូលអ្នកត្រួតត្រា (大主宰)', pinyin: 'Da Zhu Zai' },
  'da zhu zai': { khmer: 'មហាកំពូលអ្នកត្រួតត្រា (大主宰)', pinyin: 'Da Zhu Zai' },
  'jade dynasty': { khmer: 'ជូស៊ាន ក្របខ័ណ្ឌទេវលោក (诛仙)', pinyin: 'Zhu Xian' },
  'zhu xian': { khmer: 'ជូស៊ាន ក្របខ័ណ្ឌទេវលោក (诛仙)', pinyin: 'Zhu Xian' },
  'shrouding the heavens': { khmer: 'បិទបាំងផ្ទៃមេឃ (遮天)', pinyin: 'Zhetian' },
  'zhetian': { khmer: 'បិទបាំងផ្ទៃមេឃ (遮天)', pinyin: 'Zhetian' },
  'a will eternal': { khmer: 'ឆន្ទៈអមតៈ (一念永恒)', pinyin: 'Yi Nian Yong Heng' },
  'yi nian yong heng': { khmer: 'ឆន្ទៈអមតៈ (一念永恒)', pinyin: 'Yi Nian Yong Heng' },
  'martial universe': { khmer: 'ក្បាច់គុណកក្រើកមេឃ (武动乾坤)', pinyin: 'Wu Dong Qian Kun' },
  'wu dong qian kun': { khmer: 'ក្បាច់គុណកក្រើកមេឃ (武动乾坤)', pinyin: 'Wu Dong Qian Kun' },
  'the demon hunter': { khmer: 'អ្នកប្រមាញ់បិសាច (沧元图)', pinyin: 'Cang Yuan Tu' },
  'cang yuan tu': { khmer: 'អ្នកប្រមាញ់បិសាច (沧元图)', pinyin: 'Cang Yuan Tu' },
  'sword of coming': { khmer: 'កំពូលអ្នកដាវបំបែកឋានសួគ៌ (剑来)', pinyin: 'Jian Lai' },
  'jian lai': { khmer: 'កំពូលអ្នកដាវបំបែកឋានសួគ៌ (剑来)', pinyin: 'Jian Lai' },
  'tales of herding gods': { khmer: 'រឿងព្រេងឃ្វាលទេវតា (牧神记)', pinyin: 'Mu Shen Ji' },
  'mu shen ji': { khmer: 'រឿងព្រេងឃ្វាលទេវតា (牧神记)', pinyin: 'Mu Shen Ji' },
  'lord of mysteries': { khmer: 'អាថ៌កំបាំងនៃព្រះអម្ចាស់ (诡秘之主)', pinyin: 'Gui Mi Zhi Zhu' },
  'ling cage': { khmer: 'ទ្រុងវិញ្ញាណ (灵笼)', pinyin: 'Ling Long' },
  'alian among immortal': { khmer: 'អាទិទេពប្រឆាំងមេឃ (逆天邪神)', pinyin: 'Against the Gods' },
  'against the gods': { khmer: 'អាទិទេពប្រឆាំងមេឃ (逆天邪神)', pinyin: 'Ni Tian Xie Shen' },
  'my senior brother is too steady': { khmer: 'បងធំប្រយ័ត្នប្រយែងហួសហេតុ', pinyin: 'Wo Shi Xiong Shi Zai Tai Wen Jian Le' },
  'the alchemist\'s rise': { khmer: 'ការងើបឡើងនៃគ្រូឱសថទិព្វ', pinyin: 'Lian Dan Shi' },
  'legend of xianwu': { khmer: 'រឿងព្រេងក្បាច់គុនស៊ានវូ (仙武帝尊)', pinyin: 'Xian Wu Di Zun' },
  'tomb of fallen gods': { khmer: 'ផ្នូរទេវតា (神墓)', pinyin: 'Shen Mu' },
  'demon\'s ascension': { khmer: 'ម្ចាស់និកាយបិសាច (魔道祖师)', pinyin: 'Mo Dao Zu Shi' },
  'eclipse of illusion': { khmer: 'សូរ្យគ្រាសនៃស្រមោល (幻月录)', pinyin: 'Huan Yue Lu' },
  'sword and fairy 3': { khmer: 'អ្នកដាវទេព វគ្គ ៣ (仙剑奇侠传3)', pinyin: 'Xian Jian 3' },
  'the all-devouring whale: homecoming': { khmer: 'ត្រីបាឡែនលេបត្របាក់មហាសមុទ្រ', pinyin: 'Tun Tian Jing' },
  'back as immortal lord': { khmer: 'ការវិលត្រឡប់នៃអម្ចាស់អមតៈ', pinyin: 'Chong Sheng Wei Xian' },
  'divine manifestation': { khmer: 'ទេវតាបង្ហាញឫទ្ធិ', pinyin: 'Shen Ji' },

  // Japanese Anime
  'solo leveling': { khmer: 'ការឡើង Level តែឯកឯង (Solo Leveling)' },
  'one piece': { khmer: 'រឿង វ័នភីស (One Piece)' },
  'naruto': { khmer: 'រឿង ណារូតូ (Naruto)' },
  'jujutsu kaisen': { khmer: 'មន្តអាគមសង្គ្រាម (Jujutsu Kaisen)' },
  'demon slayer': { khmer: 'ដាវពិឃាតបិសាច (Demon Slayer)' },
  'kimetsu no yaiba': { khmer: 'ដាវពិឃាតបិសាច (Kimetsu no Yaiba)' },
  'attack on titan': { khmer: 'ការវាយលុកនៃយក្ស (Attack on Titan)' },
  'dragon ball': { khmer: 'បាល់នាគ (Dragon Ball)' },
  'bleach': { khmer: 'ទេវតាសេចក្តីស្លាប់ (Bleach)' },
};

/**
 * Returns the best localized Khmer title for a series.
 * Checks if the title itself has Khmer, or matches against the dictionary.
 */
export function getKhmerTitle(title?: string, altTitle?: string): string {
  if (!title) return altTitle || '';

  // 1. If title itself already has Khmer characters, return it
  if (/[\u1780-\u17FF]/.test(title)) {
    return title;
  }

  // 2. If altTitle already has Khmer characters, return it
  if (altTitle && /[\u1780-\u17FF]/.test(altTitle)) {
    return altTitle;
  }

  // 3. Normalize for lookup
  const cleanTitle = title.toLowerCase().trim().replace(/season\s*\d+/i, '').trim();
  const matched = KHMER_TITLE_MAP[cleanTitle];
  if (matched) {
    return matched.khmer;
  }

  // 4. Check partial key matches
  for (const [k, v] of Object.entries(KHMER_TITLE_MAP)) {
    if (cleanTitle.includes(k) || k.includes(cleanTitle)) {
      return v.khmer;
    }
  }

  // 5. Fallback to altTitle if available, otherwise original title
  return altTitle || title;
}

/**
 * Returns a dual display with Khmer title prominent and English title secondary.
 */
export function getFormattedTitle(title?: string, altTitle?: string): { mainTitle: string; subTitle: string } {
  const rawTitle = title || '';
  const rawAlt = altTitle || '';
  
  const khmer = getKhmerTitle(rawTitle, rawAlt);
  
  if (khmer && khmer !== rawTitle) {
    return {
      mainTitle: khmer,
      subTitle: rawTitle + (rawAlt && !khmer.includes(rawAlt) ? ` • ${rawAlt}` : ''),
    };
  }

  return {
    mainTitle: rawTitle,
    subTitle: rawAlt,
  };
}
