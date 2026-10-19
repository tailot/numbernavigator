export const contentListeners: Function[] = [];

(window as any).chrome = (window as any).chrome || {};
(window as any).chrome.runtime = (window as any).chrome.runtime || {};
(window as any).chrome.runtime.sendMessage = (window as any).chrome.runtime.sendMessage || (() => Promise.resolve());

const origAdd = (window as any).chrome.runtime.onMessage?.addListener;
const origRemove = (window as any).chrome.runtime.onMessage?.removeListener;

(window as any).chrome.runtime.onMessage = {
  addListener: (fn: Function) => {
    contentListeners.push(fn);
    if (typeof origAdd === 'function') origAdd(fn);
  },
  removeListener: (fn: Function) => {
    const idx = contentListeners.indexOf(fn);
    if (idx !== -1) contentListeners.splice(idx, 1);
    if (typeof origRemove === 'function') origRemove(fn);
  },
};
