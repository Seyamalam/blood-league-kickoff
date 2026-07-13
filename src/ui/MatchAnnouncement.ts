export type MatchAnnouncementKind =
  'kickoff' | 'goal' | 'halftime' | 'bloodMoon' | 'finalGoal' | 'finalWhistle';

interface AnnouncementStyle {
  title: string;
  subtitle: string;
  color: string;
  glow: string;
  duration: number;
}

const ANNOUNCEMENTS: Readonly<Record<MatchAnnouncementKind, AnnouncementStyle>> = Object.freeze({
  kickoff: {
    title: 'KICKOFF',
    subtitle: 'THE NIGHT BEGINS',
    color: '#f4f1e9',
    glow: 'rgba(241, 59, 96, .72)',
    duration: 1.8,
  },
  goal: {
    title: 'GOAL',
    subtitle: 'THE CROWD HUNGERS',
    color: '#ffd76a',
    glow: 'rgba(255, 190, 55, .78)',
    duration: 1.9,
  },
  halftime: {
    title: 'HALFTIME',
    subtitle: 'CHOOSE YOUR FORMATION',
    color: '#f4f1e9',
    glow: 'rgba(120, 145, 255, .66)',
    duration: 2.2,
  },
  bloodMoon: {
    title: 'BLOOD MOON',
    subtitle: 'THE CURSE DEEPENS',
    color: '#ff355d',
    glow: 'rgba(255, 20, 66, .88)',
    duration: 2.35,
  },
  finalGoal: {
    title: 'FINAL GOAL',
    subtitle: 'ONE LAST CHANCE',
    color: '#ffd76a',
    glow: 'rgba(255, 49, 93, .84)',
    duration: 2.2,
  },
  finalWhistle: {
    title: 'FINAL WHISTLE',
    subtitle: 'FULL TIME',
    color: '#f4f1e9',
    glow: 'rgba(255, 215, 106, .74)',
    duration: 2.6,
  },
});

/** A single pooled, pointer-transparent announcement surface. */
export class MatchAnnouncement {
  private readonly container: HTMLDivElement;
  private readonly rule: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly subtitle: HTMLDivElement;
  private age = 0;
  private duration = 0;
  private active = false;
  private disposed = false;

  constructor(root: HTMLElement) {
    this.container = document.createElement('div');
    this.rule = document.createElement('div');
    this.title = document.createElement('div');
    this.subtitle = document.createElement('div');

    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'assertive');
    this.container.setAttribute('aria-hidden', 'true');
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '8',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'scale(.84)',
      willChange: 'opacity, transform',
      textAlign: 'center',
      fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif",
    });
    Object.assign(this.title.style, {
      fontSize: 'clamp(56px, 10vw, 132px)',
      fontWeight: '900',
      fontStyle: 'italic',
      lineHeight: '.82',
      letterSpacing: '-.025em',
      textShadow: '0 8px 32px #000',
    });
    Object.assign(this.rule.style, {
      width: 'min(480px, 62vw)',
      height: '2px',
      marginBottom: '16px',
      background: 'linear-gradient(90deg, transparent, currentColor, transparent)',
      transformOrigin: 'center',
    });
    Object.assign(this.subtitle.style, {
      marginTop: '16px',
      color: '#d7d1d7',
      fontFamily: 'Arial, sans-serif',
      fontSize: 'clamp(9px, 1.25vw, 14px)',
      fontWeight: '800',
      letterSpacing: '.34em',
      textShadow: '0 2px 10px #000',
    });
    this.container.append(this.rule, this.title, this.subtitle);
    root.append(this.container);
  }

  show(kind: MatchAnnouncementKind, subtitle?: string, duration?: number): void {
    if (this.disposed) return;
    const presentation = ANNOUNCEMENTS[kind];
    this.title.textContent = presentation.title;
    this.subtitle.textContent = subtitle ?? presentation.subtitle;
    this.title.style.color = presentation.color;
    this.rule.style.color = presentation.color;
    this.title.style.textShadow = `0 8px 32px #000, 0 0 42px ${presentation.glow}`;
    this.duration = safeDuration(duration, presentation.duration);
    this.age = 0;
    this.active = true;
    this.container.style.display = 'flex';
    this.container.setAttribute('aria-hidden', 'false');
    this.updateVisuals(0);
  }

  update(dt: number): void {
    if (!this.active || this.disposed) return;
    this.age += Number.isFinite(dt) ? Math.max(0, Math.min(0.1, dt)) : 0;
    if (this.age >= this.duration) {
      this.hide();
      return;
    }
    this.updateVisuals(this.age / this.duration);
  }

  reset(): void {
    if (this.disposed) return;
    this.hide();
    this.title.textContent = '';
    this.subtitle.textContent = '';
  }

  dispose(): void {
    if (this.disposed) return;
    this.hide();
    this.container.remove();
    this.disposed = true;
  }

  private updateVisuals(progress: number): void {
    const intro = easeOutCubic(Math.min(1, progress / 0.16));
    const outro = progress > 0.72 ? 1 - easeInCubic((progress - 0.72) / 0.28) : 1;
    const visibility = Math.max(0, Math.min(intro, outro));
    const overshoot = Math.sin(Math.min(1, progress / 0.2) * Math.PI) * 0.035;
    this.container.style.opacity = visibility.toFixed(3);
    this.container.style.transform = `scale(${(0.84 + intro * 0.16 + overshoot).toFixed(3)})`;
    this.rule.style.transform = `scaleX(${visibility.toFixed(3)})`;
    this.subtitle.style.opacity = Math.max(0, Math.min(1, intro * 1.25 - 0.2)).toFixed(3);
  }

  private hide(): void {
    this.active = false;
    this.age = 0;
    this.container.style.display = 'none';
    this.container.style.opacity = '0';
    this.container.setAttribute('aria-hidden', 'true');
  }
}

function safeDuration(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value) ? fallback : Math.max(0.6, Math.min(8, value));
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped ** 3;
}
