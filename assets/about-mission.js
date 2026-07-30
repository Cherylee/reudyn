/**
 * About mission scroll storytelling:
 * drives banner blur / text lift and staggered mission reveals.
 * Stops affecting later sections (e.g. About team).
 */

/**
 * @returns {Element | null}
 */
function getAboutIntersectionRoot() {
  if (window.matchMedia('(min-width: 990px)').matches) {
    return document.querySelector('.page-wrapper');
  }
  return null;
}

/**
 * @param {number} steps
 * @returns {number[]}
 */
function thresholdSteps(steps = 40) {
  const list = [];
  for (let i = 0; i <= steps; i++) list.push(i / steps);
  return list;
}

class AboutMissionComponent extends HTMLElement {
  /** @type {HTMLElement | null} */
  #banner = null;

  /** @type {HTMLElement | null} */
  #bannerContent = null;

  /** @type {HTMLElement | null} */
  #bannerBlur = null;

  /** @type {HTMLElement | null} */
  #team = null;

  /** @type {IntersectionObserver | null} */
  #observer = null;

  /** @type {(() => void) | null} */
  #onScroll = null;

  /** @type {number} */
  #raf = 0;

  /** @type {EventTarget[]} */
  #targets = [];

  connectedCallback() {
    this.#banner = document.querySelector('[data-about-banner]');
    this.#bannerContent = this.#banner?.querySelector('.about-banner__content') ?? null;
    this.#bannerBlur = this.#banner?.querySelector('.about-banner__blur') ?? null;
    this.#team = document.querySelector('.about-team');
    this.classList.add('about-mission--js');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#setStage(3);
      this.#applyBanner(0);
      return;
    }

    const tick = () => {
      if (this.#raf) return;
      this.#raf = requestAnimationFrame(() => {
        this.#raf = 0;
        this.#update();
      });
    };

    this.#onScroll = tick;

    this.#observer = new IntersectionObserver(tick, {
      root: getAboutIntersectionRoot(),
      threshold: thresholdSteps(50),
      rootMargin: '20% 0px 20% 0px',
    });
    this.#observer.observe(this);
    if (this.#team) this.#observer.observe(this.#team);

    this.#targets = [window, document];
    const wrapper = document.querySelector('.page-wrapper');
    if (wrapper) this.#targets.push(wrapper);
    for (const target of this.#targets) {
      target.addEventListener('scroll', this.#onScroll, { passive: true });
    }
    window.addEventListener('resize', this.#onScroll, { passive: true });

    tick();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
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
   * @param {number} stage
   */
  #setStage(stage) {
    this.dataset.stage = String(stage);
    this.classList.toggle('is-visible', stage > 0);
  }

  /**
   * @param {number} progress 0–1
   */
  #applyBanner(progress) {
    const p = Math.min(1, Math.max(0, progress));

    if (this.#banner) {
      this.#banner.style.setProperty('--about-banner-progress', String(p));
      this.#banner.classList.toggle('about-banner--active', p > 0.02);
    }

    if (this.#bannerContent) {
      const textP = Math.min(1, Math.max(0, p / 0.4));
      const eased = textP * textP * (3 - 2 * textP);
      this.#bannerContent.style.transform = `translate3d(0, ${(-26 * eased).toFixed(2)}vh, 0)`;
      const fade = Math.min(1, Math.max(0, (eased - 0.12) / 0.88));
      this.#bannerContent.style.opacity = (1 - fade).toFixed(3);
    }

    if (this.#bannerBlur) {
      const blurPx = (16 * p).toFixed(2);
      const wash = (0.2 * p).toFixed(3);
      this.#bannerBlur.style.backdropFilter = `blur(${blurPx}px)`;
      this.#bannerBlur.style.webkitBackdropFilter = `blur(${blurPx}px)`;
      this.#bannerBlur.style.background = `rgba(255, 255, 255, ${wash})`;
    }
  }

  #update() {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (viewportHeight <= 0) return;

    const rect = this.getBoundingClientRect();
    const start = viewportHeight * 0.95;
    const end = viewportHeight * 0.22;
    const raw = (start - rect.top) / Math.max(1, start - end);
    let progress = Math.min(1, Math.max(0, raw));

    // Past mission / into Team: keep banner sticky + full blur (never release / clear)
    if (this.#team) {
      const teamTop = this.#team.getBoundingClientRect().top;
      if (teamTop < viewportHeight * 0.9) {
        progress = 1;
      }
    }

    this.#applyBanner(progress);

    let stage = 0;
    if (progress >= 0.32) stage = 1;
    if (progress >= 0.5) stage = 2;
    if (progress >= 0.68) stage = 3;
    this.#setStage(stage);
  }
}

if (!customElements.get('about-mission-component')) {
  customElements.define('about-mission-component', AboutMissionComponent);
}
