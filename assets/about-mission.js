/**
 * About storytelling — one section, shared sticky banner.
 * Mission panel scrolls over the stage; blur ramps as mission appears.
 * Sticky ends with this section, so Team follows without an empty hole.
 */

/**
 * @returns {number}
 */
function getAboutScrollY() {
  const wrapper = document.querySelector('.page-wrapper');
  const wrapperY = wrapper instanceof HTMLElement ? wrapper.scrollTop : 0;
  const windowY = window.scrollY || document.documentElement.scrollTop || 0;
  return Math.max(wrapperY, windowY);
}

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
  #stage = null;

  /** @type {HTMLElement | null} */
  #intro = null;

  /** @type {HTMLElement | null} */
  #panel = null;

  /** @type {HTMLElement | null} */
  #inner = null;

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

  /** Keep in sync with CSS `.about-mission__inner { top: 48vh }` */
  #stickyVh = 0.48;

  /** @type {boolean} */
  #isMobile = false;

  /** @type {number} */
  #lastMissionP = -1;

  /** @type {number} */
  #lastBannerP = -1;

  /** @type {number} */
  #lastExit = -1;

  connectedCallback() {
    this.#stage = this.querySelector('[data-about-banner]');
    this.#intro = this.querySelector('[data-about-intro]');
    this.#panel = this.querySelector('.about-mission__panel');
    this.#inner = this.querySelector('.about-mission__inner');
    this.#titles = this.querySelectorAll('.about-mission__reveal--title');
    this.#media = this.querySelectorAll('.about-mission__reveal--media');
    this.#subs = this.querySelectorAll('.about-mission__reveal--subtitle');
    this.#bodies = this.querySelectorAll('.about-mission__reveal--body');
    this.#isMobile = window.matchMedia('(max-width: 749px)').matches;
    this.#stickyVh = this.#isMobile ? 0.36 : 0.48;

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
    window.addEventListener('resize', this.#onResize, { passive: true });
    this.#update();
  }

  disconnectedCallback() {
    if (this.#onScroll) {
      for (const target of this.#targets) {
        target.removeEventListener('scroll', this.#onScroll);
      }
    }
    window.removeEventListener('resize', this.#onResize);
    if (this.#raf) {
      cancelAnimationFrame(this.#raf);
      this.#raf = 0;
    }
  }

  #onResize = () => {
    this.#isMobile = window.matchMedia('(max-width: 749px)').matches;
    this.#stickyVh = this.#isMobile ? 0.36 : 0.48;
    this.#lastMissionP = -1;
    this.#lastBannerP = -1;
    this.#lastExit = -1;
    if (this.#onScroll) this.#onScroll();
  };

  /**
   * @param {number} progress 0–1
   */
  #applyMissionScrub(progress) {
    const p = clamp01(progress);
    if (Math.abs(p - this.#lastMissionP) < 0.004) return;
    this.#lastMissionP = p;

    const titleP = clamp01(p / 0.75);
    const mediaP = clamp01((p - 0.04) / 0.75);
    const subP = clamp01((p - 0.08) / 0.75);
    const bodyP = clamp01((p - 0.12) / 0.75);

    this.#paintReveal(this.#titles, titleP, 40);
    this.#paintReveal(this.#media, mediaP, 40);
    this.#paintReveal(this.#subs, subP, 32);
    this.#paintReveal(this.#bodies, bodyP, 32);

    this.classList.toggle('is-visible', p > 0.02);

    if (p >= 0.999) {
      this.classList.add('about-mission--settled');
    } else {
      this.classList.remove('about-mission--settled');
    }
  }

  /**
   * @param {NodeListOf<HTMLElement> | HTMLElement[] | ArrayLike<HTMLElement>} nodes
   * @param {number} p
   * @param {number} fromY
   */
  #paintReveal(nodes, p, fromY) {
    const opacity = p.toFixed(3);
    const y = ((1 - p) * fromY).toFixed(2);
    const transform = p >= 0.999 ? 'none' : `translate3d(0, ${y}px, 0)`;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      el.style.opacity = opacity;
      el.style.transform = transform;
    }
  }

  /**
   * Blur via CSS var only — never write backdrop-filter inline.
   * @param {number} progress 0–1
   * @param {number} headingExit 0–1
   */
  #applyBanner(progress, headingExit) {
    const p = clamp01(progress);
    const exit = clamp01(headingExit);

    if (Math.abs(p - this.#lastBannerP) < 0.004 && Math.abs(exit - this.#lastExit) < 0.004) {
      return;
    }
    this.#lastBannerP = p;
    this.#lastExit = exit;

    const blurStart = this.#isMobile ? 0.2 : 0.28;
    const blurSpan = this.#isMobile ? 0.55 : 0.45;
    const blurP = p <= blurStart ? 0 : clamp01((p - blurStart) / blurSpan);

    if (this.#stage) {
      this.#stage.style.setProperty('--about-banner-progress', blurP.toFixed(3));
      this.style.setProperty('--about-banner-progress', blurP.toFixed(3));
    }

    if (this.#intro) {
      if (exit >= 0.999) {
        this.#intro.style.opacity = '0';
        this.#intro.style.transform = 'translate(-50%, calc(-50% - 42vh))';
        this.#intro.style.visibility = 'hidden';
      } else {
        const yVh = (-42 * exit).toFixed(2);
        this.#intro.style.visibility = '';
        this.#intro.style.transform = `translate(-50%, calc(-50% + ${yVh}vh))`;
        this.#intro.style.opacity = (1 - exit).toFixed(3);
      }
    }
  }

  #update() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (viewportHeight <= 0) return;

    const scrollY = getAboutScrollY();
    if (scrollY < 8) {
      this.#applyMissionScrub(0);
      this.#applyBanner(0, 0);
      return;
    }

    const panel = this.#panel ?? this;
    const panelTop = panel.getBoundingClientRect().top;
    const innerTop = (this.#inner ?? panel).getBoundingClientRect().top;

    const stickyY = viewportHeight * this.#stickyVh;
    const fadeStartY = viewportHeight * (this.#isMobile ? 1.05 : 1.22);
    const fadeEndY = stickyY + (this.#isMobile ? 12 : 20);
    const raw = 1 - ramp(innerTop, fadeEndY, fadeStartY);
    const missionP = Math.pow(clamp01(raw), 0.38);
    this.#applyMissionScrub(missionP);

    // Blur + intro exit as mission panel rises over the shared stage
    let bannerP = 0;
    let headingExit = 0;
    if (panelTop < viewportHeight * 0.98) {
      bannerP = 1 - ramp(panelTop, viewportHeight * 0.28, viewportHeight * 0.98);
      headingExit = clamp01(bannerP / 0.75);
    }
    this.#applyBanner(bannerP, headingExit);
  }
}

if (!customElements.get('about-mission-component')) {
  customElements.define('about-mission-component', AboutMissionComponent);
}
