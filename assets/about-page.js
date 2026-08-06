/**
 * About page: in-page nav anchors + EN/ZH content toggle.
 * Scroll target accounts for .page-wrapper (desktop scrollport).
 */

const STORAGE_KEY = 'reudyn-about-lang';
const ABOUT_SCROLL_GAP = 24;

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
 * @returns {number}
 */
function getAboutNavOffset() {
  const nav = document.querySelector('[data-about-nav]');
  const navHeight = nav instanceof HTMLElement ? nav.offsetHeight : 0;
  return navHeight + ABOUT_SCROLL_GAP;
}

/**
 * @param {HTMLElement} target
 * @param {{ behavior?: ScrollBehavior }} [options]
 */
function scrollToAboutElement(target, options = {}) {
  const root = getAboutScrollRoot();
  const offset = getAboutNavOffset();
  const rootRect = root === document.scrollingElement || root === document.documentElement
    ? { top: 0 }
    : root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentScroll =
    root === document.scrollingElement || root === document.documentElement
      ? window.scrollY || document.documentElement.scrollTop
      : /** @type {HTMLElement} */ (root).scrollTop;

  const top = currentScroll + (targetRect.top - rootRect.top) - offset;
  const behavior = options.behavior ?? 'smooth';

  if (typeof root.scrollTo === 'function') {
    root.scrollTo({ top: Math.max(0, top), behavior });
  } else {
    window.scrollTo({ top: Math.max(0, top), behavior });
  }
}

/**
 * @param {string} anchor
 */
function scrollToAboutAnchor(anchor) {
  if (!anchor) return;
  const id = anchor.replace(/^#/, '');
  const target = document.getElementById(id) || document.querySelector(`[data-about-anchor="${id}"]`);
  if (!(target instanceof HTMLElement)) return;

  scrollToAboutElement(target);
}

function syncAboutNavHeight() {
  const nav = document.querySelector('[data-about-nav]');
  if (nav instanceof HTMLElement) {
    document.documentElement.style.setProperty('--about-nav-height', `${nav.offsetHeight}px`);
  }
}

function handlePostedSubscribeScroll() {
  const params = new URLSearchParams(window.location.search);
  const isPosted = params.get('customer_posted') === 'true' || window.location.hash === '#contact_form';
  if (!isPosted) return;

  const scrollToSuccess = () => {
    const shell = document.querySelector('[data-about-subscribe-shell].is-success');
    if (!(shell instanceof HTMLElement)) return;
    scrollToAboutElement(shell, { behavior: 'auto' });
  };

  scrollToSuccess();
  requestAnimationFrame(scrollToSuccess);
  window.addEventListener('load', scrollToSuccess, { once: true });
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

/**
 * Subscribe success overlay: Done returns all forms to the email field.
 */
function resetAboutSubscribeShell(shell, { focus = false } = {}) {
  if (!(shell instanceof HTMLElement)) return;

  const field = shell.querySelector('[data-about-subscribe-field]');
  const success = shell.querySelector('[data-about-subscribe-success]');
  const input = field?.querySelector('input[type="email"]');
  const btn = field?.querySelector('button[type="submit"]');

  shell.classList.remove('is-success');
  if (success instanceof HTMLElement) {
    success.setAttribute('hidden', '');
  }
  if (field instanceof HTMLElement) {
    field.removeAttribute('aria-hidden');
  }
  if (input instanceof HTMLInputElement) {
    input.value = '';
    if (focus) input.focus();
  }
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.classList.remove('is-loading');
  }
}

function resetAllAboutSubscribeShells(focusShell) {
  document.querySelectorAll('[data-about-subscribe-shell]').forEach((shell) => {
    if (!(shell instanceof HTMLElement)) return;
    resetAboutSubscribeShell(shell, { focus: shell === focusShell });
  });
}

function initAboutSubscribeShells() {
  document.querySelectorAll('[data-about-subscribe-shell]').forEach((shell) => {
    if (!(shell instanceof HTMLElement)) return;
    if (shell.dataset.aboutSubscribeBound === 'true') return;
    shell.dataset.aboutSubscribeBound = 'true';

    const doneBtn = shell.querySelector('[data-about-subscribe-done]');
    if (!(doneBtn instanceof HTMLButtonElement)) return;

    doneBtn.addEventListener('click', (event) => {
      event.preventDefault();
      resetAllAboutSubscribeShells(shell);
    });
  });
}

/**
 * Validate email + lock subscribe buttons while posting to Shopify.
 * Uses custom under-form error copy instead of native browser tooltips.
 */
function isAboutSubscribeEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function initAboutSubscribeSubmitLock() {
  document.querySelectorAll('.about-subscribe__form, .about-cta-subscribe__form').forEach((form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.aboutSubmitBound === 'true') return;
    form.dataset.aboutSubmitBound = 'true';

    form.noValidate = true;

    const input = form.querySelector('input[name="contact[email]"]');
    const errorEl = form.querySelector('[data-about-subscribe-error]');
    const btn = form.querySelector('button[type="submit"]');

    const hideError = () => {
      if (errorEl instanceof HTMLElement) {
        errorEl.setAttribute('hidden', '');
      }
      if (input instanceof HTMLInputElement) {
        input.removeAttribute('aria-invalid');
      }
    };

    const showError = () => {
      if (errorEl instanceof HTMLElement) {
        errorEl.removeAttribute('hidden');
      }
      if (input instanceof HTMLInputElement) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
      }
    };

    if (input instanceof HTMLInputElement) {
      input.addEventListener('input', hideError);
      input.addEventListener('change', hideError);
    }

    form.addEventListener('submit', (event) => {
      const value = input instanceof HTMLInputElement ? input.value : '';
      if (!isAboutSubscribeEmailValid(value)) {
        event.preventDefault();
        showError();
        return;
      }

      hideError();

      if (!(btn instanceof HTMLButtonElement) || btn.disabled) return;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      btn.classList.add('is-loading');
    });
  });
}

initAboutSubscribeShells();
initAboutSubscribeSubmitLock();
syncAboutNavHeight();
handlePostedSubscribeScroll();
window.addEventListener('resize', syncAboutNavHeight);
setAboutLang(getInitialAboutLang());
