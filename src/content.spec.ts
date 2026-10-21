import './chrome-mock';
import { contentListeners } from './chrome-mock';
import './content';

describe('content script clicking', () => {
  let createdElements: HTMLElement[] = [];

  afterEach(() => {
    for (const el of createdElements) {
      if (el.isConnected) {
        el.remove();
      }
    }
    createdElements = [];

    // Clear numbers
    sendMessage({ action: 'clearNumbers' });
  });

  function sendMessage(request: any): Promise<any> {
    return new Promise((resolve) => {
      let resolved = false;
      for (const listener of contentListeners) {
        try {
          listener(request, {}, (response: any) => {
            if (response && !resolved) {
              resolved = true;
              resolve(response);
            }
          });
        } catch { /* ignore */ }
      }
      if (!resolved) {
        setTimeout(() => { if (!resolved) resolve(null); }, 10);
      }
    });
  }

  it('should dispatch full pointer and click events on custom role="button" elements', async () => {
    const container = document.createElement('div');
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.left = '20px';
    container.style.width = '100px';
    container.style.height = '40px';
    container.style.display = 'block';

    const child = document.createElement('div');
    child.className = 'inner-icon';
    child.style.width = '50px';
    child.style.height = '20px';
    child.style.display = 'block';
    container.appendChild(child);

    document.body.appendChild(container);
    createdElements.push(container);

    const eventsFired: string[] = [];
    const recordEvent = (ev: Event) => eventsFired.push(ev.type);

    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
      container.addEventListener(type, recordEvent);
    });

    // Activate numbering
    await sendMessage({ action: 'numberClickables' });

    // Send click request for the numbered element (starts at 2)
    const res = await sendMessage({ action: 'clickElement', number: 2 });

    expect(res).not.toBeNull();
    expect(res.status).toBe('Clicked');
    expect(res.number).toBe(2);

    expect(eventsFired).toContain('pointerdown');
    expect(eventsFired).toContain('mousedown');
    expect(eventsFired).toContain('pointerup');
    expect(eventsFired).toContain('mouseup');
    expect(eventsFired).toContain('click');
  });

  it('should click native button elements properly', async () => {
    const button = document.createElement('button');
    button.textContent = 'Click Me';
    button.style.position = 'fixed';
    button.style.top = '20px';
    button.style.left = '20px';
    button.style.width = '100px';
    button.style.height = '40px';
    button.style.display = 'block';

    document.body.appendChild(button);
    createdElements.push(button);

    let clicked = false;
    button.addEventListener('click', () => { clicked = true; });

    await sendMessage({ action: 'numberClickables' });

    const res = await sendMessage({ action: 'clickElement', number: 2 });

    expect(res).not.toBeNull();
    expect(res.status).toBe('Clicked');
    expect(clicked).toBeTrue();
  });

  it('should trigger timed click after hover duration when timed click is enabled', (done) => {
    jasmine.clock().install();

    const link = document.createElement('a');
    link.href = '#test';
    link.textContent = 'Hover Me Link';
    link.style.position = 'fixed';
    link.style.top = '20px';
    link.style.left = '20px';
    link.style.width = '100px';
    link.style.height = '40px';
    link.style.display = 'block';

    document.body.appendChild(link);
    createdElements.push(link);

    let clicked = false;
    link.addEventListener('click', (e) => { e.preventDefault(); clicked = true; });

    sendMessage({ action: 'numberClickables', timedClick: true, timedClickInterval: 1 }).then(() => {
      const mouseMoveEv = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 25,
        clientY: 25,
      });
      Object.defineProperty(mouseMoveEv, 'target', { value: link });

      window.dispatchEvent(mouseMoveEv);

      expect(clicked).toBeFalse();

      jasmine.clock().tick(1050);

      expect(clicked).toBeTrue();
      jasmine.clock().uninstall();
      done();
    });
  });
});
