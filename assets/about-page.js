/**
 * About page: in-page nav anchors + EN/ZH content toggle.
 * Scroll target accounts for .page-wrapper (desktop scrollport).
 */

const STORAGE_KEY = 'reudyn-about-lang';

/**
 * @returns {Element}
 */
function getAboutScrollRoot() {
  const wrapper = document.querySelector('.page-wrapper');
  if (wrapper instanceof HTMLElement) {
    const style = window.getComputedStyle(wrapper);
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return wrapper;
    }
  }
  return document.scrollingElement ?? document.documentElement;
}

/**
 * @param {string} lang
 */
function setAboutLang(lang) {
  const next = lang === 'zh' ? 'zh' : 'en';
  document.documentElement.setAttribute('data-about-lang', next);
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }

  document.querySelectorAll('[data-about-lang-option]').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const active = el.dataset.aboutLangOption === next;
    el.setAttribute('aria-selected', active ? 'true' : 'false');
    el.classList.toggle('is-active', active);
  });

  document.querySelectorAll('[data-about-lang-label]').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const en = el.dataset.labelEn || 'EN';
    const zh = el.dataset.labelZh || 'CN';
    el.textContent = next === 'zh' ? zh : en;
  });

  document.querySelectorAll('[data-about-lang-flag]').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.dataset.flag = next;
  });
}

/**
 * @returns {string}
 */
function getInitialAboutLang() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    /* ignore */
  }
  const htmlLang = (document.documentElement.lang || '').toLowerCase();
  if (htmlLang.includes('zh')) return 'zh';
  return 'en';
}

/**
 * @param {string} anchor
 */
function scrollToAboutAnchor(anchor) {
  if (!anchor) return;
  const id = anchor.replace(/^#/, '');
  const target = document.getElementById(id) || document.querySelector(`[data-about-anchor="${id}"]`);
  if (!(target instanceof HTMLElement)) return;

  const root = getAboutScrollRoot();
  const nav = document.querySelector('[data-about-nav]');
  const navHeight = nav instanceof HTMLElement ? nav.offsetHeight : 0;
  const rootRect = root === document.scrollingElement || root === document.documentElement
    ? { top: 0 }
    : root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentScroll =
    root === document.scrollingElement || root === document.documentElement
      ? window.scrollY || document.documentElement.scrollTop
      : /** @type {HTMLElement} */ (root).scrollTop;

  const top = currentScroll + (targetRect.top - rootRect.top) - navHeight;

  if (typeof root.scrollTo === 'function') {
    root.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  } else {
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
}

class AboutNavComponent extends HTMLElement {
  connectedCallback() {
    setAboutLang(getInitialAboutLang());

    this.#bindNavLinks();
    this.#bindLangToggle();
  }

  #bindNavLinks() {
    this.querySelectorAll('[data-about-nav-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const el = /** @type {HTMLElement} */ (link);
        const anchor = el.getAttribute('href') || el.dataset.aboutNavLink || '';
        if (!anchor.startsWith('#')) return;
        event.preventDefault();
        scrollToAboutAnchor(anchor);
      });
    });
  }

  #bindLangToggle() {
    const button = this.querySelector('[data-about-lang-button]');
    const panel = this.querySelector('[data-about-lang-panel]');
    if (!(button instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const open = panel.hasAttribute('hidden');
      if (open) {
        panel.removeAttribute('hidden');
        button.setAttribute('aria-expanded', 'true');
      } else {
        panel.setAttribute('hidden', '');
        button.setAttribute('aria-expanded', 'false');
      }
    });

    panel.querySelectorAll('[data-about-lang-option]').forEach((option) => {
      option.addEventListener('click', (event) => {
        event.preventDefault();
        const lang = /** @type {HTMLElement} */ (option).dataset.aboutLangOption || 'en';
        setAboutLang(lang);
        panel.setAttribute('hidden', '');
        button.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (this.contains(target)) return;
      panel.setAttribute('hidden', '');
      button.setAttribute('aria-expanded', 'false');
    });
  }
}

if (!customElements.get('about-nav-component')) {
  customElements.define('about-nav-component', AboutNavComponent);
}

setAboutLang(getInitialAboutLang());
