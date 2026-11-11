import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Rocket,
  Sparkles,
  Star,
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { triggerHaptic } from '../../utils/telegram';

export interface SpaceHeroSlide {
  id: string | number;
  title: string;
  slug?: string;
  image_url?: string;
  poster_url?: string;
  banner_url?: string;
  type?: string;
  rating?: number | string;
  episode_count?: number;
  description?: string;
  link_url?: string;
}

interface SpaceCosmos3DHeroProps {
  slides: SpaceHeroSlide[];
  onQuickSelectSlide?: (slide: SpaceHeroSlide) => void;
}

interface OrbitPlanet {
  name: string;
  orbitRx: number;
  orbitRy: number;
  orbitTilt: number;
  speed: number;
  phase: number;
  radius: number;
  baseColor: string;
  lightColor: string;
  shadowColor: string;
  rimColor: string;
  hasRing?: boolean;
  ringColor?: string;
  hasMoon?: boolean;
}

interface StarParticle {
  xNorm: number;
  yNorm: number;
  size: number;
  depth: number;
  twinkleOffset: number;
}

const DEFAULT_FALLBACK_SLIDES: SpaceHeroSlide[] = [
  {
    id: 'cosmos-1',
    title: 'MerDonghua 3D Cosmic Cinema',
    image_url: '/banner-fallback.jpg',
    type: 'DONGHUA',
    rating: '9.8',
    episode_count: 120,
    description: 'ទស្សនារឿងភាគចិន 3D និង Anime ច្បាស់ត្រជាក់ភ្នែក 4K ភ្លាមៗដោយឥតគិតថ្លៃ។',
  },
];

function draw3DSpaceship(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  time: number,
  tiltX: number,
  tiltY: number,
  isGreyMode: boolean,
) {
  ctx.save();
  const hoverY = Math.sin(time * 2.2) * 5.5 * scale;
  const pitch = Math.sin(time * 1.4) * 0.04 + tiltY * 0.14;
  const roll = Math.cos(time * 1.1) * 0.04 + tiltX * 0.18;

  ctx.translate(cx, cy + hoverY);
  ctx.rotate(roll);
  ctx.scale(scale, scale * (1 - Math.abs(pitch) * 0.15));

  const hullMain = isGreyMode ? '#E2E8F0' : '#FFFFFF';
  const hullMid = isGreyMode ? '#94A3B8' : '#CBD5E1';
  const hullShadow = isGreyMode ? '#475569' : '#64748B';
  const hullEdge = isGreyMode ? '#CBD5E1' : '#1E293B';
  const accentBlue = isGreyMode ? '#38BDF8' : '#2563EB';
  const accentBright = isGreyMode ? '#7DD3FC' : '#3B82F6';

  // Soft thruster engine bloom behind rear engines
  const thrusterGlow = ctx.createRadialGradient(0, 26, 2, 0, 32, 48);
  thrusterGlow.addColorStop(0, isGreyMode ? 'rgba(56, 189, 248, 0.72)' : 'rgba(37, 99, 235, 0.45)');
  thrusterGlow.addColorStop(0.5, isGreyMode ? 'rgba(59, 130, 246, 0.25)' : 'rgba(96, 165, 250, 0.18)');
  thrusterGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = thrusterGlow;
  ctx.beginPath();
  ctx.arc(0, 30, 48, 0, Math.PI * 2);
  ctx.fill();

  // Animated dual plasma ion plumes (pulsing rings)
  const pulse = 0.85 + Math.sin(time * 16) * 0.15;
  [-15, 15].forEach((tx) => {
    const flameGrad = ctx.createLinearGradient(tx, 18, tx, 56 * pulse);
    flameGrad.addColorStop(0, '#FFFFFF');
    flameGrad.addColorStop(0.35, accentBright);
    flameGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(tx - 5.5, 18);
    ctx.lineTo(tx + 5.5, 18);
    ctx.lineTo(tx, 54 * pulse);
    ctx.closePath();
    ctx.fill();
  });

  // Back Rear Delta Wings (Left & Right 3D faceted)
  // Left wing
  ctx.beginPath();
  ctx.moveTo(-14, -4);
  ctx.lineTo(-68, 22);
  ctx.lineTo(-62, 30);
  ctx.lineTo(-16, 18);
  ctx.closePath();
  const leftWingGrad = ctx.createLinearGradient(-68, 12, -14, 18);
  leftWingGrad.addColorStop(0, accentBlue);
  leftWingGrad.addColorStop(0.2, hullMid);
  leftWingGrad.addColorStop(1, hullMain);
  ctx.fillStyle = leftWingGrad;
  ctx.fill();
  ctx.strokeStyle = hullEdge;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(14, -4);
  ctx.lineTo(68, 22);
  ctx.lineTo(62, 30);
  ctx.lineTo(16, 18);
  ctx.closePath();
  const rightWingGrad = ctx.createLinearGradient(14, 18, 68, 12);
  rightWingGrad.addColorStop(0, hullShadow);
  rightWingGrad.addColorStop(0.8, hullMid);
  rightWingGrad.addColorStop(1, accentBlue);
  ctx.fillStyle = rightWingGrad;
  ctx.fill();
  ctx.strokeStyle = hullEdge;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Wingtip energy beacons
  ctx.fillStyle = accentBright;
  ctx.beginPath();
  ctx.arc(-66, 25, 2.8, 0, Math.PI * 2);
  ctx.arc(66, 25, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Twin engine pods (3D cylinders)
  [-15, 15].forEach((tx, idx) => {
    ctx.beginPath();
    ctx.roundRect(tx - 6.5, 6, 13, 15, 3);
    ctx.fillStyle = idx === 0 ? hullMid : hullShadow;
    ctx.fill();
    ctx.strokeStyle = hullEdge;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glowing thruster nozzle ring
    ctx.fillStyle = accentBright;
    ctx.beginPath();
    ctx.ellipse(tx, 21, 5.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Main 3D Fuselage Body — Left lit facet
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(-19, 8);
  ctx.lineTo(-11, 24);
  ctx.lineTo(0, 20);
  ctx.closePath();
  const bodyLit = ctx.createLinearGradient(-19, -20, 0, 15);
  bodyLit.addColorStop(0, hullMain);
  bodyLit.addColorStop(1, hullMid);
  ctx.fillStyle = bodyLit;
  ctx.fill();
  ctx.strokeStyle = hullEdge;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Main 3D Fuselage Body — Right shaded facet
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(19, 8);
  ctx.lineTo(11, 24);
  ctx.lineTo(0, 20);
  ctx.closePath();
  const bodyDark = ctx.createLinearGradient(0, -20, 19, 15);
  bodyDark.addColorStop(0, hullMid);
  bodyDark.addColorStop(1, hullShadow);
  ctx.fillStyle = bodyDark;
  ctx.fill();
  ctx.strokeStyle = hullEdge;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Forward Racing Stripe Trim
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(-4.5, -24);
  ctx.lineTo(0, -22);
  ctx.lineTo(4.5, -24);
  ctx.closePath();
  ctx.fillStyle = accentBlue;
  ctx.fill();

  // 3D Glass Cockpit Canopy
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.quadraticCurveTo(10, -10, 6.5, 8);
  ctx.lineTo(0, 10);
  ctx.lineTo(-6.5, 8);
  ctx.quadraticCurveTo(-10, -10, 0, -24);
  ctx.closePath();
  const canopyGrad = ctx.createLinearGradient(-7, -20, 7, 8);
  canopyGrad.addColorStop(0, '#E0F2FE');
  canopyGrad.addColorStop(0.4, accentBright);
  canopyGrad.addColorStop(1, '#1E3A8A');
  ctx.fillStyle = canopyGrad;
  ctx.fill();
  ctx.strokeStyle = isGreyMode ? '#93C5FD' : '#1E293B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Canopy specular highlight streak
  ctx.beginPath();
  ctx.moveTo(-2, -19);
  ctx.quadraticCurveTo(-5, -10, -3.5, 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center Dorsal Fin
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(-3, 24);
  ctx.lineTo(3, 24);
  ctx.closePath();
  ctx.fillStyle = accentBlue;
  ctx.fill();

  ctx.restore();
}

function draw3DPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  planet: OrbitPlanet,
  time: number,
  isGreyMode: boolean,
) {
  ctx.save();
  ctx.translate(x, y);

  // Outer atmospheric halo
  const halo = ctx.createRadialGradient(0, 0, r * 0.75, 0, 0, r * 1.48);
  halo.addColorStop(0, planet.rimColor);
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.48, 0, Math.PI * 2);
  ctx.fill();

  // Back half of Saturn-style 3D ring (behind sphere)
  if (planet.hasRing) {
    ctx.save();
    ctx.rotate(-0.34);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.15, r * 0.56, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = planet.ringColor || 'rgba(147, 197, 253, 0.7)';
    ctx.lineWidth = Math.max(2.2, r * 0.24);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.72, r * 0.44, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = isGreyMode ? 'rgba(241, 245, 249, 0.45)' : 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  // 3D Lit Sphere Body
  const sphereGrad = ctx.createRadialGradient(
    -r * 0.36,
    -r * 0.36,
    r * 0.1,
    0,
    0,
    r,
  );
  sphereGrad.addColorStop(0, planet.lightColor);
  sphereGrad.addColorStop(0.58, planet.baseColor);
  sphereGrad.addColorStop(1, planet.shadowColor);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = sphereGrad;
  ctx.fill();

  // Subtle surface latitude bands clipped to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(-r, -r * 0.42, r * 2, r * 0.16);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
  ctx.fillRect(-r, r * 0.12, r * 2, r * 0.18);
  ctx.restore();

  // Sharp sphere rim outline for clarity in White mode
  ctx.strokeStyle = isGreyMode ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Front half of Saturn-style 3D ring (drawn in front of sphere)
  if (planet.hasRing) {
    ctx.save();
    ctx.rotate(-0.34);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.15, r * 0.56, 0, 0, Math.PI);
    ctx.strokeStyle = planet.ringColor || 'rgba(147, 197, 253, 0.85)';
    ctx.lineWidth = Math.max(2.2, r * 0.24);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.72, r * 0.44, 0, 0, Math.PI);
    ctx.strokeStyle = isGreyMode ? 'rgba(241, 245, 249, 0.55)' : 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.stroke();
    ctx.restore();
  }

  // Orbiting mini moon
  if (planet.hasMoon) {
    const moonAngle = time * 1.9 + planet.phase;
    const mx = Math.cos(moonAngle) * r * 1.65;
    const my = Math.sin(moonAngle) * r * 0.55;
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(2.5, r * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = isGreyMode ? '#E2E8F0' : '#475569';
    ctx.fill();
  }

  ctx.restore();
}

export function SpaceCosmos3DHero({
  slides: rawSlides,
  onQuickSelectSlide,
}: SpaceCosmos3DHeroProps) {
  const { activeThemeId } = useThemeStore();
  const language = useLanguageStore((s) => s.language);
  const isGreyMode = activeThemeId !== 'pure-white';

  const slides = useMemo(
    () => (rawSlides && rawSlides.length > 0 ? rawSlides : DEFAULT_FALLBACK_SLIDES),
    [rawSlides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const containerRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerTiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused]);

  const goPrev = () => {
    triggerHaptic('light');
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    triggerHaptic('light');
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  // Interactive 3D Space Canvas (Central 3D Spaceship + Orbiting 3D Planets + Cosmos Stars)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars: StarParticle[] = Array.from({ length: 68 }, (_, i) => ({
      xNorm: ((i * 73 + 19) % 100) / 100,
      yNorm: ((i * 41 + 11) % 100) / 100,
      size: (i % 3) * 0.7 + 0.8,
      depth: 0.35 + ((i * 17) % 10) / 15,
      twinkleOffset: i * 0.7,
    }));

    const planets: OrbitPlanet[] = [
      {
        name: 'Saturnia',
        orbitRx: 0.34,
        orbitRy: 0.14,
        orbitTilt: -0.18,
        speed: 0.24,
        phase: 0.45,
        radius: 21,
        lightColor: '#BAE6FD',
        baseColor: '#2563EB',
        shadowColor: '#1E3A8A',
        rimColor: 'rgba(59, 130, 246, 0.36)',
        hasRing: true,
        ringColor: 'rgba(96, 165, 250, 0.78)',
      },
      {
        name: 'Aetheris',
        orbitRx: 0.42,
        orbitRy: 0.18,
        orbitTilt: 0.14,
        speed: -0.17,
        phase: 2.3,
        radius: 17,
        lightColor: '#A5F3FC',
        baseColor: '#0284C7',
        shadowColor: '#0F172A',
        rimColor: 'rgba(6, 182, 212, 0.34)',
        hasMoon: true,
      },
      {
        name: 'Helios',
        orbitRx: 0.24,
        orbitRy: 0.11,
        orbitTilt: 0.22,
        speed: 0.32,
        phase: 4.1,
        radius: 13,
        lightColor: '#FDE68A',
        baseColor: '#EA580C',
        shadowColor: '#7C2D12',
        rimColor: 'rgba(249, 115, 22, 0.35)',
      },
      {
        name: 'Selene',
        orbitRx: 0.46,
        orbitRy: 0.12,
        orbitTilt: -0.09,
        speed: -0.13,
        phase: 5.5,
        radius: 11,
        lightColor: '#E9D5FF',
        baseColor: '#7C3AED',
        shadowColor: '#3B0764',
        rimColor: 'rgba(139, 92, 246, 0.34)',
      },
    ];

    let rafId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(320, rect.width);
      height = Math.max(360, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const startTime = performance.now();

    const renderFrame = (now: number) => {
      const t = (now - startTime) * 0.001;
      const tilt = pointerTiltRef.current;
      tilt.x += (tilt.targetX - tilt.x) * 0.08;
      tilt.y += (tilt.targetY - tilt.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      // Center of the cosmic spacecraft stage (upper-center focal dome)
      const isCompact = width < 640;
      const shipX = width * 0.5 + tilt.x * 16;
      const shipY = (isCompact ? 96 : 114) + tilt.y * 8;
      const shipScale = isCompact ? 0.84 : Math.min(1.18, Math.max(0.92, width / 1100));

      // 1. Subtle Orbital Guide Rings centered on the Spaceship
      ctx.save();
      ctx.translate(shipX, shipY);
      [
        { rx: width * 0.34, ry: isCompact ? 46 : 64, rot: -0.18 + tilt.y * 0.04 },
        { rx: width * 0.43, ry: isCompact ? 58 : 82, rot: 0.14 - tilt.y * 0.04 },
        { rx: width * 0.22, ry: isCompact ? 30 : 42, rot: 0.22 },
      ].forEach((orb) => {
        ctx.save();
        ctx.rotate(orb.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, orb.rx, orb.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isGreyMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(37, 99, 235, 0.15)';
        ctx.setLineDash([5, 7]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      // 2. Twinkling 3D Parallax Stars
      stars.forEach((star) => {
        const px = star.xNorm * width + tilt.x * 18 * star.depth;
        const py = star.yNorm * height + tilt.y * 10 * star.depth;
        const alpha = 0.22 + 0.48 * (0.5 + 0.5 * Math.sin(t * 2.1 + star.twinkleOffset));
        ctx.fillStyle = isGreyMode
          ? `rgba(226, 232, 240, ${alpha})`
          : `rgba(37, 99, 235, ${alpha * 0.65})`;
        ctx.beginPath();
        ctx.arc(px, py, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Compute 3D Positions of Orbiting Planets & Depth-Sort relative to Spaceship (z=0)
      type Renderable =
        | { kind: 'ship'; z: number }
        | { kind: 'planet'; z: number; x: number; y: number; r: number; planet: OrbitPlanet };

      const queue: Renderable[] = [{ kind: 'ship', z: 0 }];

      planets.forEach((planet) => {
        const angle = t * planet.speed + planet.phase;
        const rx = width * planet.orbitRx;
        const ry = (isCompact ? 290 : 380) * planet.orbitRy;

        const localX = Math.cos(angle) * rx;
        const localY = Math.sin(angle) * ry;
        const zDepth = Math.sin(angle); // -1 = back behind ship, +1 = front of ship

        const cosT = Math.cos(planet.orbitTilt + tilt.y * 0.05);
        const sinT = Math.sin(planet.orbitTilt + tilt.y * 0.05);
        const rotX = localX * cosT - localY * sinT;
        const rotY = localX * sinT + localY * cosT;

        const perspectiveScale = 0.78 + (zDepth + 1) * 0.22;
        const scaledR = planet.radius * (isCompact ? 0.74 : 1.0) * perspectiveScale;

        queue.push({
          kind: 'planet',
          z: zDepth,
          x: shipX + rotX,
          y: shipY + rotY * 0.85,
          r: scaledR,
          planet,
        });
      });

      queue.sort((a, b) => a.z - b.z);

      queue.forEach((item) => {
        if (item.kind === 'ship') {
          draw3DSpaceship(ctx, shipX, shipY, shipScale, t, tilt.x, tilt.y, isGreyMode);
        } else {
          draw3DPlanet(ctx, item.x, item.y, item.r, item.planet, t, isGreyMode);
        }
      });

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [isGreyMode]);

  const activeSlide = slides[activeIndex] || slides[0];
  const watchHref = activeSlide.slug ? `/watch/${activeSlide.slug}/1` : activeSlide.link_url || '/explore';
  const detailHref = activeSlide.slug ? `/anime/${activeSlide.slug}` : activeSlide.link_url || '/explore';

  const getOffset = (idx: number) => {
    const total = slides.length;
    if (total <= 1) return 0;
    let diff = idx - activeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        pointerTiltRef.current.targetX = Math.max(-1, Math.min(1, nx));
        pointerTiltRef.current.targetY = Math.max(-1, Math.min(1, ny));
      }}
      onMouseLeave={() => {
        pointerTiltRef.current.targetX = 0;
        pointerTiltRef.current.targetY = 0;
      }}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const dx = endX - touchStartXRef.current;
        touchStartXRef.current = null;
        if (dx > 40) goPrev();
        else if (dx < -40) goNext();
      }}
      className={`relative w-full overflow-hidden rounded-[28px] sm:rounded-[34px] border transition-colors duration-300 select-none ${
        isGreyMode
          ? 'bg-gradient-to-b from-[#1E2430] via-[#262D3B] to-[#2E3440] border-[#4C566A] shadow-[0_24px_60px_rgba(15,23,42,0.38)]'
          : 'bg-gradient-to-b from-[#FFFFFF] via-[#F1F6FF] to-[#E6F0FF] border-slate-200/90 shadow-[0_20px_50px_rgba(37,99,235,0.08)]'
      }`}
    >
      {/* Subtle Nebula Glow Backdrop */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-[320px] w-[640px] rounded-full blur-3xl ${
          isGreyMode ? 'bg-sky-500/12' : 'bg-blue-500/10'
        }`}
      />

      {/* Interactive 3D Spaceship & Orbiting Planets Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0"
      />

      {/* Foreground Aerospace Layout */}
      <div className="relative z-10 flex flex-col">
        {/* Top Unobstructed Cosmos Corridor: Spaceship Centered & Clear */}
        <div className="flex items-start justify-between px-4 sm:px-7 pt-4 sm:pt-5 h-[168px] sm:h-[205px]">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold backdrop-blur-md ${
              isGreyMode
                ? 'bg-[#2E3440]/85 border-[#4C566A] text-sky-300'
                : 'bg-white/90 border-slate-200 text-blue-700 shadow-xs'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 shrink-0" />
            <span>
              {language === 'km'
                ? 'MerDonghua ចក្រវាល 3D • មើលភ្លាមៗឥតគិតថ្លៃ'
                : 'MerDonghua Cosmos 3D • Instant Free Play'}
            </span>
          </div>

          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold backdrop-blur-md ${
              isGreyMode
                ? 'bg-[#2E3440]/85 border-[#4C566A] text-slate-200'
                : 'bg-white/90 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'km' ? '4K សំឡេងខ្មែរច្បាស់' : '4K Khmer Dub & Sub'}</span>
          </div>
        </div>

        {/* 3D Perspective Story Banner Slider */}
        <div
          className="px-3 sm:px-6 pb-5 sm:pb-7"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="relative h-[245px] sm:h-[305px] lg:h-[330px] flex items-center justify-center"
            style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
          >
            {slides.map((slide, idx) => {
              const offset = getOffset(idx);
              const absOffset = Math.abs(offset);
              const isVisible = slides.length <= 3 || absOffset <= 2;
              if (!isVisible) return null;

              const isCenter = offset === 0;
              const translateX = offset * 62;
              const translateZ = isCenter ? 60 : -Math.abs(offset) * 110;
              const rotateY = offset === 0 ? 0 : offset > 0 ? -22 : 22;
              const scale = isCenter ? 1 : absOffset === 1 ? 0.84 : 0.68;
              const opacity = isCenter ? 1 : absOffset === 1 ? 0.78 : 0;

              const bannerImage =
                slide.banner_url || slide.image_url || slide.poster_url || '/banner-fallback.jpg';

              return (
                <div
                  key={`${slide.id}-${idx}`}
                  onClick={() => {
                    if (!isCenter) {
                      triggerHaptic('light');
                      setActiveIndex(idx);
                    } else if (onQuickSelectSlide) {
                      onQuickSelectSlide(slide);
                    }
                  }}
                  style={{
                    transform: `translate3d(${translateX}%, 0, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: 30 - absOffset * 10,
                    transformStyle: 'preserve-3d',
                  }}
                  className={`absolute w-[88%] sm:w-[68%] md:w-[58%] lg:w-[50%] max-w-[660px] h-full rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 ease-out border ${
                    isCenter
                      ? isGreyMode
                        ? 'border-sky-400/50 shadow-[0_22px_50px_rgba(15,23,42,0.55)] cursor-default'
                        : 'border-blue-500/35 shadow-[0_22px_48px_rgba(37,99,235,0.18)] cursor-default'
                      : isGreyMode
                        ? 'border-[#4C566A] shadow-xl cursor-pointer hover:opacity-95'
                        : 'border-slate-200 shadow-lg cursor-pointer hover:opacity-95'
                  }`}
                >
                  <img
                    src={bannerImage}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />

                  {/* Crisp High-Contrast Info Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/35 to-slate-950/10" />

                  {/* Top Slide Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-white/95 text-slate-900 text-[10px] sm:text-xs font-black tracking-wide shadow-sm">
                      {slide.type === 'ANIME'
                        ? 'ANIME 2D'
                        : slide.type === 'MOVIE'
                          ? 'MOVIE 4K'
                          : slide.type === 'DRAMA'
                            ? 'DRAMA'
                            : 'DONGHUA 3D'}
                    </span>

                    {slide.rating && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 text-amber-400 text-[10px] sm:text-xs font-bold border border-white/15 backdrop-blur-md">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {slide.rating}
                      </span>
                    )}
                  </div>

                  {/* Center Active Banner Details + Instant Watch Button */}
                  {isCenter && (
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5 flex flex-col gap-2.5">
                      <div>
                        <h2 className="font-display font-black text-base sm:text-xl lg:text-2xl text-white line-clamp-1 drop-shadow-sm">
                          {slide.title}
                        </h2>
                        {slide.description && (
                          <p className="hidden sm:block text-xs text-slate-200/90 line-clamp-1 mt-0.5">
                            {slide.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={watchHref}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('medium');
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/35 transition-transform active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                          <span>{language === 'km' ? 'ចុចមើលភ្លាមៗ' : 'Watch Now'}</span>
                        </Link>

                        {slide.slug && (
                          <Link
                            to={detailHref}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('light');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-900 text-xs font-bold shadow-sm transition-all active:scale-95"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>{language === 'km' ? 'ព័ត៌មានរឿង' : 'Details'}</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Slider Prev/Next Controls */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous Slide"
                  className={`absolute left-1 sm:left-3 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full border backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                    isGreyMode
                      ? 'bg-[#2E3440]/90 hover:bg-blue-600 text-white border-[#4C566A] shadow-lg'
                      : 'bg-white/95 hover:bg-blue-600 text-slate-800 hover:text-white border-slate-200 shadow-md'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next Slide"
                  className={`absolute right-1 sm:right-3 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full border backdrop-blur-md flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                    isGreyMode
                      ? 'bg-[#2E3440]/90 hover:bg-blue-600 text-white border-[#4C566A] shadow-lg'
                      : 'bg-white/95 hover:bg-blue-600 text-slate-800 hover:text-white border-slate-200 shadow-md'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* High-Contrast Pagination Dots */}
          {slides.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {slides.slice(0, 10).map((_, idx) => {
                const isActive = idx === activeIndex % Math.min(slides.length, 10);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveIndex(idx);
                    }}
                    aria-label={`Slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'w-8 bg-blue-600 shadow-xs'
                        : isGreyMode
                          ? 'w-2 bg-slate-500/60 hover:bg-slate-400'
                          : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
export default SpaceCosmos3DHero;
