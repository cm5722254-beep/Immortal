import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, X, AlertCircle, CheckCircle2, Sparkles, Check } from 'lucide-react';

interface RawChallenge {
  id: string;
  titleKhmer: string;
  titleEnglish: string;
  animeName: string;
  referenceImage: string;
  targetCount: number;
  targetImages: { image: string; label: string }[];
  distractorImages: { image: string; label: string }[];
}

interface TileItem {
  id: string;
  image: string;
  label: string;
  isTarget: boolean;
}

const RAW_CHALLENGES: RawChallenge[] = [
  {
    id: 'dragon_ball',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'Dragon Ball (សង្គ្រាមបាល់នាគ)',
    titleEnglish: 'Select all images of Dragon Ball',
    referenceImage: '/posters/042_dragon-ball_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball 1' },
      { image: '/posters/Dragon%20Ball.jpg', label: 'Dragon Ball 2' },
      { image: '/posters/dragon-ball.jpg', label: 'Dragon Ball 3' },
    ],
    distractorImages: [
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling' },
      { image: '/posters/047_attack-on-titan-season-1_poster.jpg', label: 'Attack on Titan' },
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
      { image: '/posters/002_perfect-world_poster.jpg', label: 'Perfect World' },
      { image: '/posters/043_case-closed-detective-conan_poster.jpg', label: 'Detective Conan' },
      { image: '/posters/045_hunter-x-hunter_poster.jpg', label: 'Hunter x Hunter' },
    ],
  },
  {
    id: 'solo_leveling',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'Solo Leveling (ឡើងកម្រិតទោល)',
    titleEnglish: 'Select all images of Solo Leveling',
    referenceImage: '/posters/046_solo-leveling-season-3_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling 1' },
      { image: '/posters/Solo%20Leveling%20Season%203.jpg', label: 'Solo Leveling 2' },
      { image: '/posters/solo-leveling-season-3.jpg', label: 'Solo Leveling 3' },
    ],
    distractorImages: [
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball' },
      { image: '/posters/004_battle-through-the-heavens_poster.jpg', label: 'Battle Through The Heavens' },
      { image: '/posters/007_swallowed-star_poster.jpg', label: 'Swallowed Star' },
      { image: '/posters/044_tokyo-revengers_poster.jpg', label: 'Tokyo Revengers' },
      { image: '/posters/045_hunter-x-hunter_poster.jpg', label: 'Hunter x Hunter' },
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
    ],
  },
  {
    id: 'renegade_immortal',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'គុជអមតះធៀននី (Renegade Immortal)',
    titleEnglish: 'Select all images of Renegade Immortal',
    referenceImage: '/posters/001_renegade-immortal_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal 1' },
      { image: '/posters/renegade-immortal.jpg', label: 'Renegade Immortal 2' },
      { image: '/posters/066_renegade-immortal-war-of-gods-movie_poster.jpg', label: 'Renegade Immortal Movie' },
    ],
    distractorImages: [
      { image: '/posters/002_perfect-world_poster.jpg', label: 'Perfect World' },
      { image: '/posters/004_battle-through-the-heavens_poster.jpg', label: 'Battle Through The Heavens' },
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball' },
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling' },
      { image: '/posters/041_jade-dynasty-season-4_poster.jpg', label: 'Jade Dynasty' },
      { image: '/posters/029_apotheosis_poster.jpg', label: 'Apotheosis' },
    ],
  },
  {
    id: 'perfect_world',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'ពិភពនៃថាមពលវេទមន្ត (Perfect World)',
    titleEnglish: 'Select all images of Perfect World',
    referenceImage: '/posters/002_perfect-world_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/002_perfect-world_poster.jpg', label: 'Perfect World 1' },
      { image: '/posters/perfect-world.jpg', label: 'Perfect World 2' },
      { image: '/posters/065_perfect-world-flame-empress-movie_poster.jpg', label: 'Flame Empress Movie' },
    ],
    distractorImages: [
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
      { image: '/posters/007_swallowed-star_poster.jpg', label: 'Swallowed Star' },
      { image: '/posters/047_attack-on-titan-season-1_poster.jpg', label: 'Attack on Titan' },
      { image: '/posters/018_slay-the-gods_poster.jpg', label: 'Slay The Gods' },
      { image: '/posters/045_hunter-x-hunter_poster.jpg', label: 'Hunter x Hunter' },
      { image: '/posters/026_martial-universe-season-6_poster.jpg', label: 'Martial Universe' },
    ],
  },
  {
    id: 'swallowed_star',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'លេបផ្កាយ (Swallowed Star)',
    titleEnglish: 'Select all images of Swallowed Star',
    referenceImage: '/posters/007_swallowed-star_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/007_swallowed-star_poster.jpg', label: 'Swallowed Star 1' },
      { image: '/posters/067_swallowed-star-disaster-war-movie_poster.jpg', label: 'Swallowed Star Disaster War' },
      { image: '/posters/069_swallowed-star-war-of-gods-movie_poster.jpg', label: 'Swallowed Star War of Gods' },
    ],
    distractorImages: [
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
      { image: '/posters/002_perfect-world_poster.jpg', label: 'Perfect World' },
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling' },
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball' },
      { image: '/posters/044_tokyo-revengers_poster.jpg', label: 'Tokyo Revengers' },
      { image: '/posters/045_hunter-x-hunter_poster.jpg', label: 'Hunter x Hunter' },
    ],
  },
  {
    id: 'hunter_x_hunter',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'Hunter x Hunter (អ្នកប្រមាញ់)',
    titleEnglish: 'Select all images of Hunter x Hunter',
    referenceImage: '/posters/045_hunter-x-hunter_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/045_hunter-x-hunter_poster.jpg', label: 'Hunter x Hunter 1' },
      { image: '/posters/Hunter%20x%20Hunter.jpg', label: 'Hunter x Hunter 2' },
      { image: '/posters/hunter-x-hunter.jpg', label: 'Hunter x Hunter 3' },
    ],
    distractorImages: [
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball' },
      { image: '/posters/043_case-closed-detective-conan_poster.jpg', label: 'Detective Conan' },
      { image: '/posters/047_attack-on-titan-season-1_poster.jpg', label: 'Attack on Titan' },
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
      { image: '/posters/002_perfect-world_poster.jpg', label: 'Perfect World' },
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling' },
    ],
  },
  {
    id: 'conan',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'កំពូលអ្នកស៊ើបអង្កេតកូណាន់ (Detective Conan)',
    titleEnglish: 'Select all images of Detective Conan',
    referenceImage: '/posters/043_case-closed-detective-conan_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/043_case-closed-detective-conan_poster.jpg', label: 'Conan 1' },
      { image: '/posters/Case%20Closed%20-%20Detective%20Conan.jpg', label: 'Conan 2' },
      { image: '/posters/case-closed-detective-conan.jpg', label: 'Conan 3' },
    ],
    distractorImages: [
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball' },
      { image: '/posters/045_hunter-x-hunter_poster.jpg', label: 'Hunter x Hunter' },
      { image: '/posters/044_tokyo-revengers_poster.jpg', label: 'Tokyo Revengers' },
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling' },
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
      { image: '/posters/004_battle-through-the-heavens_poster.jpg', label: 'BTTH' },
    ],
  },
  {
    id: 'attack_on_titan',
    titleKhmer: 'សូមជ្រើសរើសរូបភាពដែលជារឿង',
    animeName: 'Attack on Titan (ការវាយប្រហារលើទីតាន)',
    titleEnglish: 'Select all images of Attack on Titan',
    referenceImage: '/posters/047_attack-on-titan-season-1_poster.jpg',
    targetCount: 3,
    targetImages: [
      { image: '/posters/047_attack-on-titan-season-1_poster.jpg', label: 'Attack on Titan 1' },
      { image: '/posters/Attack%20on%20Titan%20Season%201.jpg', label: 'Attack on Titan 2' },
      { image: '/posters/attack-on-titan-season-1.jpg', label: 'Attack on Titan 3' },
    ],
    distractorImages: [
      { image: '/posters/044_tokyo-revengers_poster.jpg', label: 'Tokyo Revengers' },
      { image: '/posters/042_dragon-ball_poster.jpg', label: 'Dragon Ball' },
      { image: '/posters/046_solo-leveling-season-3_poster.jpg', label: 'Solo Leveling' },
      { image: '/posters/002_perfect-world_poster.jpg', label: 'Perfect World' },
      { image: '/posters/007_swallowed-star_poster.jpg', label: 'Swallowed Star' },
      { image: '/posters/001_renegade-immortal_poster.jpg', label: 'Renegade Immortal' },
    ],
  },
];

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface ImageCaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImageCaptchaModal: React.FC<ImageCaptchaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [shuffledTiles, setShuffledTiles] = useState<TileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Generate tiles for a challenge index
  const prepareChallenge = useCallback((idx: number) => {
    const raw = RAW_CHALLENGES[idx];
    const targets: TileItem[] = raw.targetImages.map((t, i) => ({
      id: `target_${i}`,
      image: t.image,
      label: t.label,
      isTarget: true,
    }));
    const distractors: TileItem[] = raw.distractorImages.map((d, i) => ({
      id: `distractor_${i}`,
      image: d.image,
      label: d.label,
      isTarget: false,
    }));

    const combined = shuffleArray([...targets, ...distractors]);
    setShuffledTiles(combined);
    setSelectedIds([]);
    setErrorMsg('');
    setIsSuccess(false);
    setIsVerifying(false);
    setIsShaking(false);
  }, []);

  // When modal opens, select a random challenge and shuffle tiles
  useEffect(() => {
    if (isOpen) {
      const randomIdx = Math.floor(Math.random() * RAW_CHALLENGES.length);
      setChallengeIdx(randomIdx);
      prepareChallenge(randomIdx);
    }
  }, [isOpen, prepareChallenge]);

  const currentChallenge = RAW_CHALLENGES[challengeIdx];

  const toggleSelect = (id: string) => {
    if (isVerifying || isSuccess) return;
    setErrorMsg('');
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRefresh = () => {
    if (isVerifying || isSuccess) return;
    const nextIdx = (challengeIdx + 1) % RAW_CHALLENGES.length;
    setChallengeIdx(nextIdx);
    prepareChallenge(nextIdx);
  };

  const handleVerify = () => {
    if (isVerifying || isSuccess) return;

    if (selectedIds.length === 0) {
      setErrorMsg(`សូមជ្រើសរើសរូបភាពយ៉ាងតិច ${currentChallenge.targetCount} សិន!`);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    setTimeout(() => {
      // Find all target IDs
      const targetIds = shuffledTiles.filter((t) => t.isTarget).map((t) => t.id);
      const nonTargetIds = shuffledTiles.filter((t) => !t.isTarget).map((t) => t.id);

      // Must have selected ALL targets AND NO non-targets
      const hasAllTargets = targetIds.every((id) => selectedIds.includes(id));
      const hasNoNonTargets = !nonTargetIds.some((id) => selectedIds.includes(id));

      if (hasAllTargets && hasNoNonTargets) {
        setIsSuccess(true);
        setIsVerifying(false);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 700);
      } else {
        setIsVerifying(false);
        setErrorMsg(`❌ មិនទាន់ត្រឹមត្រូវទេ! សូមជ្រើសរើសរូបភាពទាំង ${currentChallenge.targetCount} នៃរឿងនេះ។`);
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          // Shuffle tiles again for security
          prepareChallenge((challengeIdx + 1) % RAW_CHALLENGES.length);
          setChallengeIdx((prev) => (prev + 1) % RAW_CHALLENGES.length);
        }, 1100);
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Modal Dialog Card */}
      <div
        className={`w-full max-w-[370px] sm:max-w-[420px] bg-[#12070B] border border-amber-500/40 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* ─── Premium Header with Target Anime Showcase ─── */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-4 text-black relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-black flex items-center justify-center transition-colors cursor-pointer"
            title="បិទ"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-black/80 mb-2">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>ការផ្ទៀងផ្ទាត់រូបភាព Anti-Bot</span>
          </div>

          {/* Reference Preview Card */}
          <div className="flex items-center gap-3 bg-black/15 p-2 sm:p-2.5 rounded-2xl border border-black/20">
            <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-xl overflow-hidden border-2 border-black/40 shadow-md shrink-0 bg-black/30">
              <img
                src={currentChallenge.referenceImage}
                alt="រូបគំរូ"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-0.5">
                <span className="text-[8px] font-black text-amber-300 uppercase">គំរូ</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-bold text-black/75 leading-tight">
                {currentChallenge.titleKhmer}៖
              </p>
              <h2 className="text-sm sm:text-base font-black text-black leading-tight truncate">
                {currentChallenge.animeName}
              </h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black text-amber-300 text-[10px] font-extrabold shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" /> រើស {currentChallenge.targetCount} រូបភាព
                </span>
                <span className="text-[10px] text-black/70 font-medium hidden sm:inline truncate">
                  {currentChallenge.titleEnglish}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3x3 Image Grid ─── */}
        <div className="p-3 sm:p-4 bg-[#0A0306]">
          {errorMsg && (
            <div className="mb-2.5 p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-slide-down">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="line-clamp-1">{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="mb-2.5 p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 animate-scale-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>✅ ផ្ទៀងផ្ទាត់ជោគជ័យ! កំពុងបើក Login...</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {shuffledTiles.map((tile) => {
              const isSelected = selectedIds.includes(tile.id);
              return (
                <button
                  type="button"
                  key={tile.id}
                  onClick={() => toggleSelect(tile.id)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 group cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 ring-2 ring-amber-400/60 scale-[0.96] shadow-[0_0_18px_rgba(245,158,11,0.6)]'
                      : 'border-white/10 hover:border-white/40 hover:scale-[0.98] bg-white/5'
                  }`}
                >
                  <img
                    src={tile.image}
                    alt={tile.label}
                    className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                      isSelected ? 'brightness-70' : ''
                    }`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallbackDiv = parent.querySelector('.tile-fallback');
                        if (fallbackDiv) fallbackDiv.classList.remove('hidden');
                      }
                    }}
                  />

                  {/* Fallback Icon if poster image fails */}
                  <div className="tile-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-[#1e0a12] p-1 text-center">
                    <span className="text-xl">🎬</span>
                    <span className="text-[9px] text-gray-300 font-bold mt-1 line-clamp-1">{tile.label}</span>
                  </div>

                  {/* Selected Overlay Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-500/35 flex items-center justify-center animate-scale-in backdrop-blur-[1px]">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-black flex items-center justify-center font-black shadow-lg shadow-black/50">
                        <Check className="w-5 h-5 stroke-[3.5]" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selection Counter Bar */}
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400 px-1">
            <span>
              បានជ្រើសរើស៖{' '}
              <strong className={selectedIds.length === currentChallenge.targetCount ? 'text-emerald-400' : 'text-amber-400'}>
                {selectedIds.length} / {currentChallenge.targetCount}
              </strong>
            </span>
            <span className="text-[10px] text-gray-400">
              {selectedIds.length === currentChallenge.targetCount
                ? '✓ រួចរាល់ចុច "ផ្ទៀងផ្ទាត់"'
                : `សូមរើសឱ្យបាន ${currentChallenge.targetCount} រូបភាព`}
            </span>
          </div>
        </div>

        {/* ─── Footer Actions ─── */}
        <div className="p-3 sm:p-4 bg-[#12070B] border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isVerifying || isSuccess}
            className="text-xs text-gray-400 hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
            title="ប្ដូររូបសំណួរថ្មី"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">ប្ដូររូបថ្មី</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 transition-colors cursor-pointer font-medium"
            >
              បោះបង់
            </button>
            <button
              type="button"
              onClick={handleVerify}
              disabled={isVerifying || isSuccess}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>កំពុងពិនិត្យ...</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ជោគជ័យ</span>
                </>
              ) : (
                <span>ផ្ទៀងផ្ទាត់ (Verify)</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
