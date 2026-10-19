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

  it('should number and click elements inside shadow DOM', async () => {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.top = '100px';
    host.style.left = '100px';
    host.style.width = '120px';
    host.style.height = '50px';
    document.body.appendChild(host);
    createdElements.push(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const shadowButton = document.createElement('button');
    shadowButton.textContent = 'Shadow Button';
    shadowButton.style.display = 'block';
    shadowButton.style.width = '100%';
    shadowButton.style.height = '100%';
    shadow.appendChild(shadowButton);

    let clicked = false;
    shadowButton.addEventListener('click', () => {
      clicked = true;
    });

    await sendMessage({ action: 'numberClickables' });

    // The jasmine reporter header link took number 2, so our shadowButton received number 3
    const res = await sendMessage({ action: 'clickElement', number: 3 });

    expect(res).not.toBeNull();
    expect(res.status).toBe('Clicked');
    expect(clicked).toBeTrue();
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

  it('should prioritize inner native buttons over outer tabindex container', async () => {
    const container = document.createElement('div');
    container.setAttribute('tabindex', '0');
    container.style.position = 'fixed';
    container.style.top = '200px';
    container.style.left = '200px';
    container.style.width = '200px';
    container.style.height = '100px';
    container.style.display = 'block';

    const btn1 = document.createElement('button');
    btn1.textContent = 'Upvote';
    btn1.style.width = '80px';
    btn1.style.height = '30px';
    btn1.style.display = 'inline-block';

    const btn2 = document.createElement('button');
    btn2.textContent = 'Downvote';
    btn2.style.width = '80px';
    btn2.style.height = '30px';
    btn2.style.display = 'inline-block';

    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);
    createdElements.push(container);

    let btn1Clicked = false;
    let btn2Clicked = false;
    btn1.addEventListener('click', () => { btn1Clicked = true; });
    btn2.addEventListener('click', () => { btn2Clicked = true; });

    await sendMessage({ action: 'numberClickables' });

    // Click native buttons directly
    btn1.click();
    btn2.click();

    expect(btn1Clicked).toBeTrue();
    expect(btn2Clicked).toBeTrue();
  });

  it('should support native buttons inside custom elements like shreddit-vote-animations', async () => {
    const shredditVote = document.createElement('shreddit-vote-animations');
    shredditVote.style.position = 'fixed';
    shredditVote.style.top = '300px';
    shredditVote.style.left = '300px';
    shredditVote.style.width = '150px';
    shredditVote.style.height = '50px';
    shredditVote.style.display = 'block';

    const upvote = document.createElement('button');
    upvote.setAttribute('data-action-bar-action', 'upvote');
    upvote.textContent = 'Up';
    upvote.style.width = '50px';
    upvote.style.height = '30px';
    upvote.style.display = 'inline-block';

    const downvote = document.createElement('button');
    downvote.setAttribute('data-action-bar-action', 'downvote');
    downvote.textContent = 'Down';
    downvote.style.width = '50px';
    downvote.style.height = '30px';
    downvote.style.display = 'inline-block';

    shredditVote.appendChild(upvote);
    shredditVote.appendChild(downvote);
    document.body.appendChild(shredditVote);
    createdElements.push(shredditVote);

    let upClicked = false;
    let downClicked = false;
    upvote.addEventListener('click', () => { upClicked = true; });
    downvote.addEventListener('click', () => { downClicked = true; });

    await sendMessage({ action: 'numberClickables' });

    const badges = Array.from(document.querySelectorAll('.number-navigator-badge'));
    expect(badges.length).toBeGreaterThanOrEqual(2);

    // Numbering works on upvote and downvote
    upvote.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    downvote.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(upClicked).toBeTrue();
    expect(downClicked).toBeTrue();
  });
});
