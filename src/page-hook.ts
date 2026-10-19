/**
 * @file page-hook.ts
 * @description Runs in the PAGE's own JavaScript world (manifest: "world": "MAIN", document_start),
 * because a content script lives in an isolated world and cannot see which elements the page
 * attached click handlers to (addEventListener, el.onclick = ...).
 *
 * It only leaves a marker: elements that get a click/mouse/pointer listener receive the attribute
 * `data-nn-listener`, which the content script uses as one of its extra click detectors. The
 * original addEventListener behaviour is not altered. Listeners on the window, document, <html> and
 * <body> are ignored (they are page-level, not buttons).
 */
(() => {
  const w = window as any;
  if (w.__numberNavigatorHook) return; // avoid double installation (manifest + background)
  w.__numberNavigatorHook = true;

  const ATTR = 'data-nn-listener';
  const TYPES = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'];
  const PROPS = ['onclick', 'onmousedown', 'onmouseup', 'onpointerdown', 'onpointerup'];

  function mark(target: unknown): void {
    if (!(target instanceof Element) || target === document.documentElement || target === document.body) return;
    queueMicrotask(() => {
      try {
        if (!target.hasAttribute(ATTR)) {
          target.setAttribute(ATTR, '1');
        }
      } catch { /* never break the page */ }
    });
  }

  const original = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string): void {
    if (TYPES.indexOf(type) !== -1) mark(this);
    return original.apply(this, arguments as unknown as Parameters<typeof original>);
  } as typeof original;

  // el.onclick = fn (handler properties) bypass addEventListener: watch their setters too
  for (const prop of PROPS) {
    try {
      const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
      if (!desc || !desc.set || !desc.configurable) continue;
      const nativeSet = desc.set;
      Object.defineProperty(HTMLElement.prototype, prop, {
        ...desc,
        set(this: HTMLElement, value: unknown) {
          if (typeof value === 'function') mark(this);
          nativeSet.call(this, value);
        },
      });
    } catch { /* ignore */ }
  }
})();
