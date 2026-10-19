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
 *  - Optional keyboard navigation: digits typed on the page are collected in a buffer and accepted
 *    after a short timeout (or immediately when no longer number could follow), so "1" then "2"
 *    gives 12 while a lone "2" gives 2. Enabled/disabled by the controller (settings).
 *  - Optional "follow cursor" mode: a hairline empty square is drawn around the mouse pointer and
 *    numbers exist ONLY for the elements inside that square (the rest of the page is not numbered).
 *    Everything else (voice/keyboard commands, scrolling, stable numbers, toasts) is unchanged.
 *  - Extensible click detection: besides the standard selectors, a list of pluggable DETECTORS
 *    (see `extraDetectors`) finds custom clickable widgets such as hamburger menus (transparent
 *    checkboxes + aria-hidden labels), ARIA toggles, elements with page click listeners
 *    (registered by page-hook.ts) and elements showing a pointer cursor. To support a new kind of
 *    clickable element, add one detector to that list.
 *  - Show/hide numbers: a configurable "toggle number" (default 99, said or typed) hides the numbers
 *    and the follow-cursor square. The extension stays active, but while hidden only the toggle
 *    number is recognised and a small red dot near the pointer reminds the user. The same number
 *    shows everything again. That number is reserved: no element is ever given it.
 */
(() => {
  const w = window as any;
  if (w.__numberNavigatorLoaded) return; // avoid double injection (manifest + background)
  w.__numberNavigatorLoaded = true;

  const FIRST_NUMBER = 2;
  const LAST_NUMBER = 200;
  const REFRESH_DEBOUNCE_MS = 150;
  const SCROLL_FRACTION = 0.8;
  const DEFAULT_KEY_TIMEOUT_MS = 1000;
  const MAX_DIGITS = String(LAST_NUMBER).length;
  /** Accept the typed number at once when no other number could continue it (e.g. "5" with only 2..40). */
  const COMMIT_WHEN_UNAMBIGUOUS = true;
  /** Follow-cursor mode: side of the square (px) and how often numbers are refreshed while the mouse moves. */
  const DEFAULT_FOLLOW_SIZE_PX = 320;
  const MIN_FOLLOW_SIZE_PX = 100;
  const MAX_FOLLOW_SIZE_PX = 1200;
  const FOLLOW_REFRESH_MS = 90;
  /** Show/hide numbers: default command number, offset of the red dot from the pointer, race guard. */
  const DEFAULT_TOGGLE_NUMBER = 99;
  const DOT_OFFSET_PX = 14;
  const LOCAL_TOGGLE_GRACE_MS = 800;

  const SELECTORS = [
    'a[href]', 'button', 'summary', 'select', 'textarea', '[contenteditable=""]', '[contenteditable="true"]',
    'input:not([type="hidden"])',
    '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
    '[role="tab"]', '[role="checkbox"]', '[role="radio"]', '[role="option"]', '[role="treeitem"]',
    '[role="combobox"]', '[role="textbox"]', '[role="searchbox"]', '[role="slider"]', '[role="spinbutton"]', '[role="switch"]',
    '[onclick]', '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  interface Entry { element: HTMLElement; number: number; badge: HTMLElement; extra: boolean; }

  /** Visibility checks a detector may relax for its candidates (e.g. invisible overlay controls). */
  interface Relax { transparent?: boolean; ariaHidden?: boolean; }
  /** An element that may receive a number. `extra` = not found by the standard selectors. */
  interface Candidate { el: HTMLElement; extra: boolean; relax?: Relax; }
  /** A pluggable strategy that finds additional clickable elements. */
  interface ClickDetector { id: string; description: string; collect(): Candidate[]; }

  /** Attribute set by page-hook.ts (page world) on elements that got a click-like listener. */
  const PAGE_LISTENER_ATTR = 'data-nn-listener';
  /** Extra candidates larger than this fraction of the window are page/layout containers, not buttons. */
  const MAX_EXTRA_AREA_FRACTION = 0.5;
  const MAX_POINTER_SCAN_ELEMENTS = 15000;
  /** Attribute-based hints that an element is a toggle/menu button even if it is not a <button>. */
  const EXTRA_SELECTORS = [
    '[aria-haspopup]:not([aria-haspopup="false"])', '[aria-expanded]', '[aria-controls]',
    '[data-toggle]', '[data-bs-toggle]',
  ].join(',');

  let active = false;
  const entries = new Map<HTMLElement, Entry>();
  const byNumber = new Map<number, Entry>();
  let overlay: HTMLElement | null = null;
  let toastEl: HTMLElement | null = null;
  let toastTimer: number | undefined;
  let refreshTimer: number | undefined;
  let observer: MutationObserver | null = null;

  // keyboard navigation
  let keyboardEnabled = false;
  let keyTimeoutMs = DEFAULT_KEY_TIMEOUT_MS;
  let keyBuffer = '';
  let keyTimer: number | undefined;

  // follow-cursor mode
  let followCursor = false;
  let followSizePx = DEFAULT_FOLLOW_SIZE_PX;
  let cursorX = 0;
  let cursorY = 0;
  let cursorKnown = false; // until the mouse moves, the square is centred in the window
  let lensEl: HTMLElement | null = null;
  let followRaf = 0;
  let followRefreshTimer: number | undefined;

  // extra click detection
  let extraDirty = true; // the (costly) cursor-pointer scan is redone only after page/viewport changes
  let pointerCache: HTMLElement[] = [];

  // show/hide numbers ("toggle number")
  let toggleNumber = DEFAULT_TOGGLE_NUMBER;
  let numbersHidden = false;
  let lastLocalToggleAt = 0;
  let dotEl: HTMLElement | null = null;
  let mouseTracked = false;

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
          border:1px solid #111;box-shadow:0 1px 3px rgba(0,0,0,.45);pointer-events:none;box-sizing:border-box;transition:opacity .15s,transform .15s;}
        .number-navigator-badge.match{background:#00e676;color:#000;transform:scale(1.18);z-index:2147483647;}
        .number-navigator-badge.dim{opacity:.35;}
        .number-navigator-lens{position:fixed;margin:0;padding:0;box-sizing:border-box;background:transparent;pointer-events:none;
          border:1px solid #111;box-shadow:0 0 0 1px rgba(255,255,255,.75);}
        .number-navigator-dot{position:fixed;width:12px;height:12px;margin:0;padding:0;box-sizing:border-box;border-radius:50%;
          background:#e53935;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.45);pointer-events:none;}
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

  function toast(message: string, isError = false, timeout = 1800): void {
    ensureOverlay();
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'visible' + (isError ? ' error' : '');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl && (toastEl.className = ''), timeout);
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
  function isUsable(el: HTMLElement, relax?: Relax): boolean {
    if ((el as HTMLInputElement).disabled) return false;
    if (el.getAttribute('aria-hidden') === 'true' && !relax?.ariaHidden) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false;
    // Follow-cursor mode: only elements that overlap the square around the pointer are eligible
    // (cheap geometric test first, so the page is not scanned in depth while the mouse moves).
    const area = followCursor ? followArea() : null;
    if (area && (r.right <= area.left || r.left >= area.right || r.bottom <= area.top || r.top >= area.bottom)) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0 && !relax?.transparent) return false;
    if (relax && style.pointerEvents === 'none') return false;
    // Skip elements fully covered by something else (modal, sticky header...). Checked at the
    // visible centre; if the point hits an ancestor/descendant/label of the element it still counts.
    // In follow-cursor mode the "visible" part is the part inside the square.
    const cx = area
      ? Math.min(Math.max((Math.max(r.left, area.left) + Math.min(r.right, area.right)) / 2, 0), innerWidth - 1)
      : Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    const cy = area
      ? Math.min(Math.max((Math.max(r.top, area.top) + Math.min(r.bottom, area.bottom)) / 2, 0), innerHeight - 1)
      : Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const top = document.elementFromPoint(cx, cy);
    if (top && !el.contains(top) && !top.contains(el) && !(top as HTMLElement).closest('label')) {
      // Allow when the hit element is itself in the same interactive widget (e.g. icon over button)
      return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- extra click detectors
  /** Roots of "clickable looking" regions: cursor is a pointer here but not on the parent (cursor is inherited). */
  function collectPointerRoots(): Candidate[] {
    if (extraDirty) {
      extraDirty = false;
      const found: HTMLElement[] = [];
      const all = document.body ? document.body.getElementsByTagName('*') : [];
      const limit = Math.min(all.length, MAX_POINTER_SCAN_ELEMENTS);
      for (let i = 0; i < limit; i++) {
        const el = all[i] as HTMLElement;
        if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) continue; // only the <svg> itself
        if (overlay && overlay.contains(el)) continue;
        const r = el.getBoundingClientRect(); // cheap geometric filter before computed styles
        if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) continue;
        if (getComputedStyle(el).cursor !== 'pointer') continue;
        const parent = el.parentElement;
        if (parent && getComputedStyle(parent).cursor === 'pointer') continue;
        found.push(el);
      }
      pointerCache = found;
    }
    return pointerCache.filter((el) => el.isConnected).map((el) => ({ el, extra: true }));
  }

  /**
   * Detectors for clickable elements the standard selectors miss. To support another kind of
   * widget, add an entry here: `collect()` returns candidates (optionally with `relax`); the usual
   * visibility/covered checks, de-duplication and "innermost wins" rules are applied to them later.
   */
  const extraDetectors: ClickDetector[] = [
    {
      id: 'aria-widgets',
      description: 'Elements declaring popup/expand/toggle behaviour through ARIA or data attributes.',
      collect: () => Array.from(document.querySelectorAll<HTMLElement>(EXTRA_SELECTORS), (el) => ({ el, extra: true })),
    },
    {
      id: 'hidden-controls',
      description: 'Hamburger-menu pattern: transparent checkboxes/radios laid over a drawn button, and (aria-hidden) labels that toggle a control.',
      collect: () => {
        const out: Candidate[] = [];
        document.querySelectorAll<HTMLElement>('input[type="checkbox"],input[type="radio"]')
          .forEach((el) => out.push({ el, extra: true, relax: { transparent: true } }));
        document.querySelectorAll<HTMLElement>('label[for]')
          .forEach((el) => out.push({ el, extra: true, relax: { ariaHidden: true } }));
        return out;
      },
    },
    {
      id: 'page-listeners',
      description: 'Elements on which the page registered click/mouse/pointer listeners (marked by page-hook.ts).',
      collect: () => Array.from(document.querySelectorAll<HTMLElement>(`[${PAGE_LISTENER_ATTR}]`), (el) => ({ el, extra: true })),
    },
    {
      id: 'cursor-pointer',
      description: 'Elements the page styles with a pointer (hand) cursor.',
      collect: collectPointerRoots,
    },
  ];

  /** Standard candidates first, then the detectors' ones. A detector may only add relaxations to a standard one. */
  function collectCandidates(): Candidate[] {
    const map = new Map<HTMLElement, Candidate>();
    document.querySelectorAll<HTMLElement>(SELECTORS).forEach((el) => map.set(el, { el, extra: false }));
    for (const detector of extraDetectors) {
      let found: Candidate[] = [];
      try { found = detector.collect(); } catch { /* a broken detector must never break navigation */ }
      for (const c of found) {
        const existing = map.get(c.el);
        if (!existing) map.set(c.el, c);
        else if (c.relax) existing.relax = { ...existing.relax, ...c.relax };
      }
    }
    return Array.from(map.values());
  }

  /** Rules that only apply to extra candidates, to avoid numbering containers and duplicates. */
  function filterExtras(usable: Candidate[]): Candidate[] {
    const els = new Set(usable.map((c) => c.el));
    return usable.filter((c) => {
      if (!c.extra) return true;
      const el = c.el;
      if (el === document.body || el === document.documentElement) return false;
      const r = el.getBoundingClientRect();
      if (r.width * r.height > innerWidth * innerHeight * MAX_EXTRA_AREA_FRACTION) return false;
      // a label whose control is itself numbered would give the same button two numbers
      if (el instanceof HTMLLabelElement && el.control instanceof HTMLElement && els.has(el.control)) return false;
      // innermost wins: a container with numbered things inside is not a button itself
      for (const other of els) if (other !== el && el.contains(other)) return false;
      return true;
    });
  }

  function nextFreeNumber(): number | null {
    for (let n = FIRST_NUMBER; n <= LAST_NUMBER; n++) if (n !== toggleNumber && !byNumber.has(n)) return n;
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
    if (numbersHidden) {
      // Numbers off: nothing is drawn except the red dot that reminds the user
      Array.from(entries.values()).forEach(removeEntry);
      lensEl?.remove();
      lensEl = null;
      ensureDot();
      return;
    }
    removeDot();
    if (followCursor) ensureLens();
    const seen = new Set<HTMLElement>();
    const extraOf = new Map<HTMLElement, boolean>();
    const usable = filterExtras(collectCandidates().filter((c) =>
      !c.el.closest('#number-navigator-overlay') && isUsable(c.el, c.relax)));
    // detectors append out of page order: restore it so that "parents first" holds below
    usable.sort((a, b) => (a.el === b.el ? 0 : a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    usable.forEach(({ el, extra }) => {
      // Skip elements nested inside an already numbered one (one number per widget)
      for (const other of seen) if (other.contains(el)) return;
      seen.add(el);
      extraOf.set(el, extra);
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
        e = { element: el, number: n, badge, extra: !!extraOf.get(el) };
        entries.set(el, e);
        byNumber.set(n, e);
      }
      const r = el.getBoundingClientRect();
      // Badge sits on the top-left corner, kept inside the viewport (and inside the square when following the cursor)
      const area = followCursor ? followArea() : null;
      const minLeft = area ? area.left : 0;
      const minTop = area ? area.top : 0;
      const maxLeft = (area ? area.right : innerWidth) - 30;
      const maxTop = (area ? area.bottom : innerHeight) - 20;
      e.badge.style.left = Math.max(minLeft, Math.min(r.left - 2, maxLeft)) + 'px';
      e.badge.style.top = Math.max(minTop, Math.min(r.top - 2, maxTop)) + 'px';
    });
  }

  function scheduleRefresh(delay = REFRESH_DEBOUNCE_MS): void {
    if (!active) return;
    extraDirty = true;
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
    extraDirty = true; // also the periodic keep-alive from the controller re-scans
    refresh();
  }

  function deactivate(): void {
    active = false;
    setKeyboard(false);
    setFollowCursor(false);
    numbersHidden = false;
    lastLocalToggleAt = 0;
    removeDot();
    updateMouseTracking();
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

  // ---------------------------------------------------------------- follow-cursor mode
  /** Square around the pointer (clipped to the window): the only area that is numbered in this mode. */
  function followArea(): { left: number; top: number; right: number; bottom: number } {
    const x = cursorKnown ? cursorX : innerWidth / 2;
    const y = cursorKnown ? cursorY : innerHeight / 2;
    const half = followSizePx / 2;
    return {
      left: Math.max(0, x - half),
      top: Math.max(0, y - half),
      right: Math.min(innerWidth, x + half),
      bottom: Math.min(innerHeight, y + half),
    };
  }

  function positionLens(): void {
    if (!lensEl) return;
    const x = cursorKnown ? cursorX : innerWidth / 2;
    const y = cursorKnown ? cursorY : innerHeight / 2;
    const half = followSizePx / 2;
    Object.assign(lensEl.style, { left: x - half + 'px', top: y - half + 'px', width: followSizePx + 'px', height: followSizePx + 'px' });
  }

  function ensureLens(): void {
    if (!lensEl || !lensEl.isConnected) {
      lensEl = document.createElement('div');
      lensEl.className = 'number-navigator-lens';
      const root = ensureOverlay();
      root.insertBefore(lensEl, root.firstChild); // below the badges
    }
    positionLens();
  }

  function onMouseMove(ev: MouseEvent): void {
    cursorX = ev.clientX;
    cursorY = ev.clientY;
    cursorKnown = true;
    if (followRaf) return;
    followRaf = window.requestAnimationFrame(() => {
      followRaf = 0;
      if (!active) return;
      if (numbersHidden) { positionDot(); return; }
      if (!followCursor) return;
      positionLens();
      // Throttled (not debounced): numbers follow the square while the mouse is still moving
      if (followRefreshTimer === undefined) {
        followRefreshTimer = window.setTimeout(() => { followRefreshTimer = undefined; refresh(); }, FOLLOW_REFRESH_MS);
      }
    });
  }

  /** Turns the mode on/off and sets the side of the square. The caller refreshes the numbers afterwards. */
  function setFollowCursor(enabled: boolean, sizePx?: number): void {
    if (typeof sizePx === 'number' && sizePx >= MIN_FOLLOW_SIZE_PX && sizePx <= MAX_FOLLOW_SIZE_PX) {
      followSizePx = sizePx;
    }
    if (enabled === followCursor) return;
    followCursor = enabled;
    if (!enabled) {
      window.clearTimeout(followRefreshTimer);
      followRefreshTimer = undefined;
      lensEl?.remove();
      lensEl = null;
    }
    updateMouseTracking();
  }

  /** The mouse listener is needed by the follow-cursor square and by the red "numbers hidden" dot. */
  function updateMouseTracking(): void {
    const needed = followCursor || numbersHidden;
    if (needed && !mouseTracked) {
      window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
      mouseTracked = true;
    } else if (!needed && mouseTracked) {
      window.removeEventListener('mousemove', onMouseMove, true);
      mouseTracked = false;
      window.cancelAnimationFrame(followRaf);
      followRaf = 0;
    }
  }

  // ---------------------------------------------------------------- show/hide numbers
  function ensureDot(): void {
    if (!dotEl || !dotEl.isConnected) {
      dotEl = document.createElement('div');
      dotEl.className = 'number-navigator-dot';
      ensureOverlay().appendChild(dotEl);
    }
    positionDot();
  }

  function removeDot(): void {
    dotEl?.remove();
    dotEl = null;
  }

  function positionDot(): void {
    if (!dotEl) return;
    const x = cursorKnown ? cursorX : innerWidth / 2;
    const y = cursorKnown ? cursorY : innerHeight / 2;
    dotEl.style.left = Math.max(0, Math.min(x + DOT_OFFSET_PX, innerWidth - 14)) + 'px';
    dotEl.style.top = Math.max(0, Math.min(y + DOT_OFFSET_PX, innerHeight - 14)) + 'px';
  }

  /** Sets the reserved number. An element that already holds it is renumbered at the next refresh. */
  function setToggleNumber(n: unknown): void {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < FIRST_NUMBER || n > LAST_NUMBER || n === toggleNumber) return;
    toggleNumber = n;
    const clash = byNumber.get(n);
    if (clash) removeEntry(clash);
  }

  function setNumbersHidden(hidden: boolean, announce: boolean): void {
    if (hidden === numbersHidden) return;
    numbersHidden = hidden;
    resetKeyBuffer();
    updateMouseTracking();
    if (announce) toast(hidden ? `Numbers hidden – say or type ${toggleNumber} to show them` : 'Numbers shown', false, 2600);
    refresh();
  }

  /** Toggle requested on the page (typed): apply it here and tell the controller, which owns the state. */
  function toggleNumbersLocally(): void {
    lastLocalToggleAt = Date.now();
    setNumbersHidden(!numbersHidden, true);
    try {
      chrome.runtime.sendMessage({ action: 'numbersHiddenChanged', hidden: numbersHidden }).catch(() => undefined);
    } catch { /* controller not reachable */ }
  }

  // ---------------------------------------------------------------- keyboard navigation
  /** True when the focused element uses digit keys itself (typing, list type-ahead, sliders...). */
  function consumesDigits(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false;
    if (el.isContentEditable) return true;
    const role = el.getAttribute('role');
    if (role && ['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider'].includes(role)) return true;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName !== 'INPUT') return false;
    const t = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'color'].includes(t);
  }

  function setKeyboard(enabled: boolean, timeoutMs?: number): void {
    if (typeof timeoutMs === 'number' && timeoutMs >= 200 && timeoutMs <= 10000) {
      keyTimeoutMs = timeoutMs;
    }
    if (enabled === keyboardEnabled) return;
    keyboardEnabled = enabled;
    if (enabled) {
      window.addEventListener('keydown', onKeyDown, true);
    } else {
      window.removeEventListener('keydown', onKeyDown, true);
      resetKeyBuffer();
    }
  }

  function resetKeyBuffer(): void {
    keyBuffer = '';
    window.clearTimeout(keyTimer);
    updateBadgeHighlight();
  }

  /** While digits are pending, highlight the numbers that can still match and dim the others. */
  function updateBadgeHighlight(): void {
    byNumber.forEach((e, n) => {
      const text = String(n);
      const matches = keyBuffer !== '' && text.startsWith(keyBuffer);
      e.badge.classList.toggle('match', matches);
      e.badge.classList.toggle('dim', keyBuffer !== '' && !matches);
    });
  }

  /** True if some numbered element has a number that starts with `prefix` and is longer than it. */
  function canBeExtended(prefix: string): boolean {
    if (prefix.length >= MAX_DIGITS) return false;
    for (const n of byNumber.keys()) {
      const text = String(n);
      if (text.length > prefix.length && text.startsWith(prefix)) return true;
    }
    const toggleText = String(toggleNumber); // the toggle number is a valid number too
    return toggleText.length > prefix.length && toggleText.startsWith(prefix);
  }

  function commitKeyBuffer(): void {
    const n = parseInt(keyBuffer, 10);
    resetKeyBuffer();
    if (Number.isNaN(n)) return;
    if (n === toggleNumber) { toggleNumbersLocally(); return; }
    if (n === 0) scroll(1);
    else if (n === 1) scroll(-1);
    else clickNumber(n);
  }

  /**
   * Numbers hidden: the page is left alone (no key is consumed, no field is blurred); the typed
   * digits are only compared with the toggle number, and nothing else is recognised.
   */
  function onHiddenKey(ev: KeyboardEvent, source: EventTarget | null): void {
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (!/^[0-9]$/.test(ev.key)) {
      if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(ev.key)) resetKeyBuffer();
      return;
    }
    if (consumesDigits(source)) { resetKeyBuffer(); return; } // typing in a field: never toggle
    if (ev.repeat) return;
    const text = String(toggleNumber);
    let buffer = keyBuffer + ev.key;
    if (!text.startsWith(buffer)) buffer = text.startsWith(ev.key) ? ev.key : '';
    window.clearTimeout(keyTimer);
    keyBuffer = buffer;
    if (buffer === text) {
      resetKeyBuffer();
      toggleNumbersLocally();
    } else if (buffer) {
      keyTimer = window.setTimeout(resetKeyBuffer, keyTimeoutMs);
    }
  }

  function onKeyDown(ev: KeyboardEvent): void {
    if (!active || !keyboardEnabled || ev.isComposing) return;
    const source = ev.composedPath()[0] ?? ev.target;
    if (numbersHidden) { onHiddenKey(ev, source); return; }
    if (ev.key === 'Escape') {
      if (keyBuffer) {
        resetKeyBuffer();
        toast('Cancelled');
        ev.preventDefault();
        ev.stopPropagation();
      } else if (source instanceof HTMLElement && consumesDigits(source)) {
        source.blur(); // leave the field so digits navigate again
      }
      return;
    }

    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    if (consumesDigits(source)) return; // the user is typing in a field: never steal keys

    const isDigit = /^[0-9]$/.test(ev.key);
    const consume = () => { ev.preventDefault(); ev.stopPropagation(); };

    if (isDigit) {
      consume();
      if (ev.repeat) return;
      keyBuffer += ev.key;
      updateBadgeHighlight();

      const unambiguous = COMMIT_WHEN_UNAMBIGUOUS && !canBeExtended(keyBuffer);
      if (unambiguous || keyBuffer.length >= MAX_DIGITS) {
        commitKeyBuffer();
        return;
      }

      toast(`Number: ${keyBuffer}…`, false, keyTimeoutMs + 400);
      window.clearTimeout(keyTimer);
      keyTimer = window.setTimeout(commitKeyBuffer, keyTimeoutMs);
      return;
    }

    // Editing keys only matter while digits are pending
    if (!keyBuffer) return;

    if (ev.key === 'Enter') {
      consume();
      commitKeyBuffer();
    } else if (ev.key === 'Backspace') {
      consume();
      keyBuffer = keyBuffer.slice(0, -1);
      updateBadgeHighlight();
      if (!keyBuffer) {
        toast('Cancelled');
        window.clearTimeout(keyTimer);
        return;
      }
      toast(`Number: ${keyBuffer}…`, false, keyTimeoutMs + 400);
      window.clearTimeout(keyTimer);
      keyTimer = window.setTimeout(commitKeyBuffer, keyTimeoutMs);
    }
  }

  // ---------------------------------------------------------------- actions
  function isTextEntry(el: HTMLElement): boolean {
    if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
    const role = el.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox') return true;
    if (el.tagName !== 'INPUT') return false;
    const t = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'].includes(t);
  }

  /**
   * Full pointer sequence at the centre of the element, like a real mouse click: custom widgets often
   * listen to pointerdown/mousedown (or use event delegation on the hit element), not only to "click".
   */
  function pressElement(el: HTMLElement): void {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    const target = hit && el.contains(hit) ? hit : el;
    const base = { bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, button: 0 };
    const pointer = { pointerType: 'mouse', isPrimary: true };
    target.dispatchEvent(new PointerEvent('pointerdown', { ...base, ...pointer, buttons: 1 }));
    target.dispatchEvent(new MouseEvent('mousedown', { ...base, buttons: 1 }));
    try { el.focus({ preventScroll: true }); } catch { /* not focusable */ }
    target.dispatchEvent(new PointerEvent('pointerup', { ...base, ...pointer, buttons: 0 }));
    target.dispatchEvent(new MouseEvent('mouseup', { ...base, buttons: 0 }));

    const isNative = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|DETAILS|LABEL)$/.test(el.tagName);
    if (isNative) {
      if (typeof el.click === 'function') {
        try { el.click(); } catch { /* ignore */ }
      }
    } else {
      target.dispatchEvent(new MouseEvent('click', { ...base, buttons: 0 }));
    }
  }

  function clickNumber(n: number): { status: string; message?: string; number?: number } {
    if (numbersHidden) return { status: 'Error', message: `Numbers are hidden – say ${toggleNumber} to show them` };
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
      pressElement(el);
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

  function scroll(direction: 1 | -1): { status: string; message?: string } {
    if (numbersHidden) return { status: 'Error', message: `Numbers are hidden – say ${toggleNumber} to show them` };
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
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      switch (request.action) {
        case 'numberClickables': // also used as keep-alive / refresh by the controller
          setFollowCursor(!!request.followCursor, request.followSize); // before activate(): it refreshes the numbers
          setToggleNumber(request.toggleNumber);
          // The controller owns the show/hide state (it survives tab changes); ignore its echo of a toggle just made here
          if (Date.now() - lastLocalToggleAt > LOCAL_TOGGLE_GRACE_MS) setNumbersHidden(!!request.numbersHidden, active);
          activate();
          setKeyboard(!!request.keyboard, request.keyTimeout);
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
  }
})();
