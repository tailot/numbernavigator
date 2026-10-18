/**
 * @file content.ts
 * @description Content script injected in web pages. It numbers the interactive elements
 * visible in the viewport and executes commands (click / focus / scroll) sent by the
 * controller page of the extension.
 *
 * Design notes (usability):
 *  - Labels are drawn in a single overlay (position: fixed) instead of being appended to the
 *    page elements, so the page layout is never altered and labels also work on <input>/<select>.
 *  - Numbers are STABLE: an element keeps its number while it stays on the page, so what the
 *    user reads is what the user can say. Numbers start at 2 (0 = scroll down, 1 = scroll up).
 *  - The overlay refreshes by itself after scroll / resize / DOM changes (debounced).
 *  - A small toast confirms every command inside the page.
 */
(() => {
  const w = window as any;
  if (w.__numberNavigatorLoaded) return; // avoid double injection (manifest + background)
  w.__numberNavigatorLoaded = true;

  const FIRST_NUMBER = 2;
  const LAST_NUMBER = 200;
  const REFRESH_DEBOUNCE_MS = 150;
  const SCROLL_FRACTION = 0.8;

  const SELECTORS = [
    'a[href]', 'button', 'summary', 'select', 'textarea', '[contenteditable=""]', '[contenteditable="true"]',
    'input:not([type="hidden"])',
    '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
    '[role="tab"]', '[role="checkbox"]', '[role="radio"]', '[role="option"]', '[role="treeitem"]',
    '[role="combobox"]', '[role="textbox"]', '[role="searchbox"]', '[role="slider"]', '[role="spinbutton"]', '[role="switch"]',
    '[onclick]', '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  interface Entry { element: HTMLElement; number: number; badge: HTMLElement; }

  let active = false;
  const entries = new Map<HTMLElement, Entry>();
  const byNumber = new Map<number, Entry>();
  let overlay: HTMLElement | null = null;
  let toastEl: HTMLElement | null = null;
  let toastTimer: number | undefined;
  let refreshTimer: number | undefined;
  let observer: MutationObserver | null = null;

  // ---------------------------------------------------------------- overlay / styles
  function ensureOverlay(): HTMLElement {
    if (overlay && overlay.isConnected) return overlay;
    if (!document.getElementById('number-navigator-style')) {
      const style = document.createElement('style');
      style.id = 'number-navigator-style';
      style.textContent = `
        #number-navigator-overlay{position:fixed;inset:0;z-index:2147483647;pointer-events:none;margin:0;padding:0;border:0;}
        .number-navigator-badge{position:fixed;min-width:18px;padding:1px 5px;border-radius:9px;background:#ffd400;color:#111;
          font:700 12px/16px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;text-align:center;
          border:1px solid #111;box-shadow:0 1px 3px rgba(0,0,0,.45);pointer-events:none;box-sizing:border-box;}
        .number-navigator-flash{position:fixed;border:3px solid #00c853;border-radius:4px;background:rgba(0,200,83,.18);
          pointer-events:none;box-sizing:border-box;transition:opacity .5s ease-out;}
        #number-navigator-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:80vw;padding:8px 16px;
          border-radius:20px;background:rgba(20,20,20,.92);color:#fff;font:600 15px/20px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
          pointer-events:none;opacity:0;transition:opacity .2s;}
        #number-navigator-toast.visible{opacity:1;}
        #number-navigator-toast.error{background:rgba(183,28,28,.95);}
        @media (prefers-reduced-motion: reduce){.number-navigator-flash{transition:none;}}
      `;
      (document.head || document.documentElement).appendChild(style);
    }
    overlay = document.createElement('div');
    overlay.id = 'number-navigator-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    toastEl = document.createElement('div');
    toastEl.id = 'number-navigator-toast';
    toastEl.setAttribute('role', 'status');
    overlay.appendChild(toastEl);
    (document.body || document.documentElement).appendChild(overlay);
    return overlay;
  }

  function toast(message: string, isError = false): void {
    ensureOverlay();
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'visible' + (isError ? ' error' : '');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl && (toastEl.className = ''), 1800);
  }

  function flash(element: HTMLElement): void {
    const r = element.getBoundingClientRect();
    const box = document.createElement('div');
    box.className = 'number-navigator-flash';
    Object.assign(box.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    ensureOverlay().appendChild(box);
    window.setTimeout(() => (box.style.opacity = '0'), 250);
    window.setTimeout(() => box.remove(), 800);
  }

  // ---------------------------------------------------------------- element detection
  function isUsable(el: HTMLElement): boolean {
    if ((el as HTMLInputElement).disabled || el.getAttribute('aria-hidden') === 'true') return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false;
    // Skip elements fully covered by something else (modal, sticky header...). Checked at the
    // visible centre; if the point hits an ancestor/descendant/label of the element it still counts.
    const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const top = document.elementFromPoint(cx, cy);
    if (top && !el.contains(top) && !top.contains(el) && !(top as HTMLElement).closest('label')) {
      // Allow when the hit element is itself in the same interactive widget (e.g. icon over button)
      return false;
    }
    return true;
  }

  function nextFreeNumber(): number | null {
    for (let n = FIRST_NUMBER; n <= LAST_NUMBER; n++) if (!byNumber.has(n)) return n;
    return null;
  }

  function removeEntry(e: Entry): void {
    e.badge.remove();
    entries.delete(e.element);
    byNumber.delete(e.number);
  }

  /** Re-scan the page keeping existing numbers; add new elements, drop the ones that disappeared. */
  function refresh(): void {
    if (!active) return;
    const root = ensureOverlay();
    const seen = new Set<HTMLElement>();
    document.querySelectorAll<HTMLElement>(SELECTORS).forEach((el) => {
      if (el.closest('#number-navigator-overlay') || !isUsable(el)) return;
      // Skip elements nested inside an already numbered one (one number per widget)
      for (const other of seen) if (other.contains(el)) return;
      seen.add(el);
    });

    for (const e of Array.from(entries.values())) if (!seen.has(e.element)) removeEntry(e);

    seen.forEach((el) => {
      let e = entries.get(el);
      if (!e) {
        const n = nextFreeNumber();
        if (n === null) return;
        const badge = document.createElement('span');
        badge.className = 'number-navigator-badge';
        badge.textContent = String(n);
        root.appendChild(badge);
        e = { element: el, number: n, badge };
        entries.set(el, e);
        byNumber.set(n, e);
      }
      const r = el.getBoundingClientRect();
      // Badge sits on the top-left corner, kept inside the viewport
      e.badge.style.left = Math.max(0, Math.min(r.left - 2, innerWidth - 30)) + 'px';
      e.badge.style.top = Math.max(0, Math.min(r.top - 2, innerHeight - 20)) + 'px';
    });
  }

  function scheduleRefresh(delay = REFRESH_DEBOUNCE_MS): void {
    if (!active) return;
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(refresh, delay);
  }

  function activate(): void {
    if (!active) {
      active = true;
      window.addEventListener('scroll', onViewportChange, true);
      window.addEventListener('resize', onViewportChange);
      observer = new MutationObserver(onViewportChange);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'disabled', 'aria-hidden'] });
    }
    refresh();
  }

  function deactivate(): void {
    active = false;
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
    observer?.disconnect();
    observer = null;
    window.clearTimeout(refreshTimer);
    Array.from(entries.values()).forEach(removeEntry);
    overlay?.remove();
    overlay = null;
    toastEl = null;
  }

  function onViewportChange(): void { scheduleRefresh(); }

  // ---------------------------------------------------------------- actions
  function isTextEntry(el: HTMLElement): boolean {
    if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
    const role = el.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox') return true;
    if (el.tagName !== 'INPUT') return false;
    const t = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'].includes(t);
  }

  function clickNumber(n: number): { status: string; message?: string; number?: number } {
    const e = byNumber.get(n);
    if (!e) { toast(`No element numbered ${n}`, true); return { status: 'Error', message: `No element numbered ${n}` }; }
    const el = e.element;
    if (!el.isConnected) { removeEntry(e); scheduleRefresh(0); return { status: 'Error', message: `Element ${n} is gone` }; }

    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    flash(el);
    if (isTextEntry(el)) {
      el.focus();
      toast(`Typing field ${n} selected`);
    } else if (el.tagName === 'SELECT') {
      el.focus();
      try { (el as HTMLSelectElement).showPicker(); } catch { el.click(); }
      toast(`Opened list ${n}`);
    } else {
      el.focus({ preventScroll: true });
      el.click();
      toast(`Clicked ${n}`);
    }
    scheduleRefresh(350); // the page may have changed after the click
    return { status: 'Clicked', number: n };
  }

  /** Scrollable ancestor under the centre of the viewport, falling back to the page itself. */
  function scrollTarget(): HTMLElement | null {
    const root = document.scrollingElement as HTMLElement | null;
    if (root && root.scrollHeight > root.clientHeight + 4 && getComputedStyle(document.body).overflowY !== 'hidden') return null; // use window
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2) as HTMLElement | null;
    while (el && el !== document.body) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4) return el;
      el = el.parentElement;
    }
    return null;
  }

  function scroll(direction: 1 | -1): { status: string } {
    const target = scrollTarget();
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
    if (target) target.scrollBy({ top: direction * target.clientHeight * SCROLL_FRACTION, behavior });
    else window.scrollBy({ top: direction * innerHeight * SCROLL_FRACTION, behavior });
    toast(direction === 1 ? '↓ Scroll down' : '↑ Scroll up');
    scheduleRefresh(400);
    return { status: direction === 1 ? 'Scrolled down' : 'Scrolled up' };
  }

  // ---------------------------------------------------------------- messaging
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    switch (request.action) {
      case 'numberClickables': // also used as keep-alive / refresh by the controller
        activate();
        sendResponse({ status: 'Clickables numbered', count: entries.size });
        break;
      case 'clickElement':
        sendResponse(clickNumber(request.number));
        break;
      case 'clearNumbers':
        deactivate();
        sendResponse({ status: 'Numbers cleared' });
        break;
      case 'scrollUp':
        sendResponse(scroll(-1));
        break;
      case 'scrollDown':
        sendResponse(scroll(1));
        break;
      case 'showMessage': // lets the controller show feedback (e.g. "not understood") on the page
        if (active) toast(String(request.text ?? ''), !!request.isError);
        sendResponse({ status: 'ok' });
        break;
      default:
        return false;
    }
    return false;
  });
})();
