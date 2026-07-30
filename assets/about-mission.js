/**
 * About scroll storytelling — Hypershell-style scrub (scroll-linked).
 * Mobile-safe: avoid per-frame backdrop-filter writes; release sticky banner
 * when Team enters so content stays visible and GPU work stops.
 */

/**
 * Desktop (≥990) scrolls `.page-wrapper`; mobile scrolls the window.
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
  #banner = null;

  /** @type {HTMLElement | null} */
  #bannerSection = null;

  /** @type {HTMLElement | null} */
  #bannerContent = null;

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

  /** @type {boolean} */
  #released = false;

  connectedCallback() {
    this.#banner = document.querySelector('[data-about-banner]');
    this.#bannerSection =
      this.#banner?.closest('.about-banner-section') ??
      document.querySelector('.shopify-section.about-banner-section');
    this.#bannerContent = this.#banner?.querySelector('.about-banner__content') ?? null;
    this.#inner = this.querySelector('.about-mission__inner');
    this.#team = document.querySelector('.about-team');
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
   * Blur via CSS var only — never write backdrop-filter inline (mobile GPU killer).
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

    // Lighter blur ramp on mobile; still CSS-driven
    const blurStart = this.#isMobile ? 0.45 : 0.38;
    const blurSpan = this.#isMobile ? 0.5 : 0.4;
    const blurP = p <= blurStart ? 0 : clamp01((p - blurStart) / blurSpan);

    if (this.#banner) {
      this.#banner.style.setProperty('--about-banner-progress', blurP.toFixed(3));
      this.#banner.classList.toggle('about-banner--active', p > 0.02);
    }

    if (this.#bannerContent) {
      if (exit >= 0.999) {
        this.#bannerContent.style.opacity = '0';
        this.#bannerContent.style.transform = 'translate(-50%, calc(-50% - 42vh))';
        this.#bannerContent.style.visibility = 'hidden';
      } else {
        const yVh = (-42 * exit).toFixed(2);
        this.#bannerContent.style.visibility = '';
        this.#bannerContent.style.transform = `translate(-50%, calc(-50% + ${yVh}vh))`;
        this.#bannerContent.style.opacity = (1 - exit).toFixed(3);
      }
    }
  }

  /**
   * Pause expensive blur when Team covers the hero (desktop keeps sticky).
   * @param {boolean} paused
   */
  #setBannerBlurPaused(paused) {
    this.#bannerSection?.classList.toggle('about-banner-section--blur-paused', paused);

    if (paused && this.#banner) {
      this.#banner.style.setProperty('--about-banner-progress', '0');
      this.#lastBannerP = -1;
    }
  }

  /**
   * Mobile only: unstick banner so Team scrolls up instead of an empty sticky hero.
   * @param {boolean} released
   */
  #setBannerReleased(released) {
    if (released === this.#released) return;
    this.#released = released;
    this.#bannerSection?.classList.toggle('about-banner-section--released', released);

    if (released && this.#banner) {
      this.#banner.style.setProperty('--about-banner-progress', '0');
      this.#lastBannerP = -1;
    }
  }

  #update() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (viewportHeight <= 0) return;

    const scrollY = getAboutScrollY();
    const sectionTop = this.getBoundingClientRect().top;
    const sectionBottom = this.getBoundingClientRect().bottom;
    const teamTop = this.#team?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;

    // True page top (page-wrapper or window): keep hero crisp
    if (scrollY < 8) {
      this.#setBannerReleased(false);
      this.#setBannerBlurPaused(false);
      this.#applyMissionScrub(0);
      this.#applyBanner(0, 0);
      return;
    }

    if (this.#isMobile) {
      // Mobile only: release sticky once Mission is leaving or Team peeks in
      const shouldRelease =
        sectionBottom < viewportHeight * 0.92 || teamTop < viewportHeight * 0.98;
      this.#setBannerReleased(shouldRelease);

      if (shouldRelease) {
        this.#applyMissionScrub(1);
        this.#applyBanner(1, 1);
        return;
      }
    } else {
      // Desktop: always keep sticky; only pause blur when Team covers
      this.#setBannerReleased(false);
      if (this.#team) {
        const teamCovering = teamTop < viewportHeight * 0.2;
        this.#setBannerBlurPaused(teamCovering);

        if (teamCovering) {
          this.#applyMissionScrub(1);
          this.#applyBanner(1, 1);
          return;
        }
      }
    }

    const stickyY = viewportHeight * this.#stickyVh;
    const innerTop = (this.#inner ?? this).getBoundingClientRect().top;

    // Appear early: start fading while still below the fold, finish soon after entering
    const fadeStartY = viewportHeight * (this.#isMobile ? 1.05 : 1.22);
    const fadeEndY = stickyY + (this.#isMobile ? 12 : 20);
    const raw = 1 - ramp(innerTop, fadeEndY, fadeStartY);
    const missionP = Math.pow(clamp01(raw), 0.38);
    this.#applyMissionScrub(missionP);

    // Banner heading/blur only after Mission has entered the viewport
    let bannerP = 0;
    let headingExit = 0;
    if (sectionTop < viewportHeight * 0.92) {
      bannerP = 1 - ramp(sectionTop, viewportHeight * 0.35, viewportHeight * 0.92);
      headingExit = clamp01(bannerP / 0.8);
    }
    this.#applyBanner(bannerP, headingExit);
  }
}

if (!customElements.get('about-mission-component')) {
  customElements.define('about-mission-component', AboutMissionComponent);
}
