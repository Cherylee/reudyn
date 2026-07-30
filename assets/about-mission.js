/**
 * About scroll storytelling — Hypershell-style scrub (scroll-linked).
 * Ref: https://hypershell.cn/pages/about-us
 * Their GSAP ScrollTrigger: text fades with scrub from "top 56%" over ~400px;
 * hero heading exits up + blur overlay ramps with scroll progress.
 */

/**
 * @returns {EventTarget[]}
 */
function getAboutScrollTargets() {
  /** @type {Set<EventTarget>} */
  const targets = new Set([window]);
  const wrapper = document.querySelector('.page-wrapper');
  if (wrapper) targets.add(wrapper);
  return [...targets];
}

/**
 * @param {number} value
 * @param {number} start
 * @param {number} end
 */
function ramp(value, start, end) {
  if (end === start) return value >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (value - start) / (end - start)));
}

/**
 * @param {number} t
 */
function clamp01(t) {
  return Math.min(1, Math.max(0, t));
}

class AboutMissionComponent extends HTMLElement {
  /** @type {HTMLElement | null} */
  #banner = null;

  /** @type {HTMLElement | null} */
  #bannerContent = null;

  /** @type {HTMLElement | null} */
  #bannerBlur = null;

  /** @type {HTMLElement | null} */
  #inner = null;

  /** @type {HTMLElement | null} */
  #team = null;

  /** @type {NodeListOf<HTMLElement> | HTMLElement[]} */
  #titles = [];

  /** @type {NodeListOf<HTMLElement> | HTMLElement[]} */
  #media = [];

  /** @type {NodeListOf<HTMLElement> | HTMLElement[]} */
  #subs = [];

  /** @type {NodeListOf<HTMLElement> | HTMLElement[]} */
  #bodies = [];

  /** @type {(() => void) | null} */
  #onScroll = null;

  /** @type {number} */
  #raf = 0;

  /** @type {EventTarget[]} */
  #targets = [];

  /** Keep in sync with CSS `.about-mission__inner { top: 68vh }` */
  #stickyVh = 0.68;

  connectedCallback() {
    this.#banner = document.querySelector('[data-about-banner]');
    this.#bannerContent = this.#banner?.querySelector('.about-banner__content') ?? null;
    this.#bannerBlur = this.#banner?.querySelector('.about-banner__blur') ?? null;
    this.#inner = this.querySelector('.about-mission__inner');
    this.#team = document.querySelector('.about-team');
    this.#titles = this.querySelectorAll('.about-mission__reveal--title');
    this.#media = this.querySelectorAll('.about-mission__reveal--media');
    this.#subs = this.querySelectorAll('.about-mission__reveal--subtitle');
    this.#bodies = this.querySelectorAll('.about-mission__reveal--body');

    this.classList.add('about-mission--js');
    this.#applyMissionScrub(0);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#applyMissionScrub(1);
      this.#applyBanner(0, 0);
      return;
    }

    this.#onScroll = () => {
      if (this.#raf) return;
      this.#raf = requestAnimationFrame(() => {
        this.#raf = 0;
        this.#update();
      });
    };

    this.#targets = getAboutScrollTargets();
    for (const target of this.#targets) {
      target.addEventListener('scroll', this.#onScroll, { passive: true });
    }
    window.addEventListener('resize', this.#onScroll, { passive: true });
    this.#update();
  }

  disconnectedCallback() {
    if (this.#onScroll) {
      for (const target of this.#targets) {
        target.removeEventListener('scroll', this.#onScroll);
      }
      window.removeEventListener('resize', this.#onScroll);
    }
    if (this.#raf) {
      cancelAnimationFrame(this.#raf);
      this.#raf = 0;
    }
  }

  /**
   * Hypershell text scrub:
   *   start: top 56%, end: +=400 (pc) / +=300 (mob), opacity = progress
   * Adapted to sticky rest at 68vh: scrub over ~400px ending at sticky.
   * @param {number} progress 0–1
   */
  #applyMissionScrub(progress) {
    const p = clamp01(progress);

    // Slight stagger like layered copy entering (still scrub-linked)
    const titleP = clamp01(p / 0.75);
    const mediaP = clamp01((p - 0.04) / 0.75);
    const subP = clamp01((p - 0.08) / 0.75);
    const bodyP = clamp01((p - 0.12) / 0.75);

    this.#paintReveal(this.#titles, titleP, 40);
    this.#paintReveal(this.#media, mediaP, 40);
    this.#paintReveal(this.#subs, subP, 32);
    this.#paintReveal(this.#bodies, bodyP, 32);

    this.classList.toggle('is-visible', p > 0.02);
  }

  /**
   * @param {NodeListOf<HTMLElement> | HTMLElement[] | ArrayLike<HTMLElement>} nodes
   * @param {number} p
   * @param {number} fromY
   */
  #paintReveal(nodes, p, fromY) {
    const opacity = p;
    const y = (1 - p) * fromY;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      el.style.opacity = opacity.toFixed(3);
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
  }

  /**
   * Hypershell hero scrub:
   *   d = progress/0.8 → heading yPercent -400*d, opacity 1-d
   *   blur from progress 0.38 over 0.4 → blur 22px, rgba 0.5
   * @param {number} progress 0–1 overall section progress
   * @param {number} headingExit 0–1
   */
  #applyBanner(progress, headingExit) {
    const p = clamp01(progress);
    const exit = clamp01(headingExit);

    // Blur ramp mirrors HS: begins mid-scroll
    const blurP = p <= 0.38 ? 0 : clamp01((p - 0.38) / 0.4);

    if (this.#banner) {
      this.#banner.style.setProperty('--about-banner-progress', blurP.toFixed(3));
      this.#banner.classList.toggle('about-banner--active', p > 0.02);
    }

    // Direct blur paint (stronger, HS-like) in case CSS var alone feels weak
    if (this.#bannerBlur) {
      const blurPx = (blurP * 22).toFixed(1);
      this.#bannerBlur.style.backdropFilter = `blur(${blurPx}px)`;
      this.#bannerBlur.style.webkitBackdropFilter = `blur(${blurPx}px)`;
      this.#bannerBlur.style.background = 'transparent';
    }

    if (this.#bannerContent) {
      // HS uses yPercent ~-400 of heading height; approximate with vh for sticky hero
      const yVh = (-42 * exit).toFixed(2);
      this.#bannerContent.style.transform = `translate(-50%, calc(-50% + ${yVh}vh))`;
      this.#bannerContent.style.opacity = (1 - exit).toFixed(3);
    }
  }

  #update() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (viewportHeight <= 0) return;

    const stickyY = viewportHeight * this.#stickyVh;
    const innerTop = (this.#inner ?? this).getBoundingClientRect().top;

    // Appear sooner: start as content peeks in, finish ~120–160px before sticky rest
    const fadeStartY = viewportHeight * 0.96;
    const fadeEndY = stickyY + (viewportHeight >= 750 ? 40 : 24);
    const raw = 1 - ramp(innerTop, fadeEndY, fadeStartY);
    // Front-load opacity so it reads clearly within the first wheel ticks
    const missionP = Math.pow(clamp01(raw), 0.55);
    this.#applyMissionScrub(missionP);

    // Banner progress from mission section travel (and keep blur when Team covers)
    const sectionTop = this.getBoundingClientRect().top;
    let bannerP = 1 - ramp(sectionTop, viewportHeight * 0.35, viewportHeight * 1.05);
    let headingExit = clamp01(bannerP / 0.8);

    if (this.#team) {
      const teamTop = this.#team.getBoundingClientRect().top;
      if (teamTop < viewportHeight * 0.92) {
        bannerP = Math.max(bannerP, 1);
        headingExit = 1;
      }
    }

    this.#applyBanner(bannerP, headingExit);
  }
}

if (!customElements.get('about-mission-component')) {
  customElements.define('about-mission-component', AboutMissionComponent);
}
