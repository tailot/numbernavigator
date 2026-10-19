import './page-hook';

describe('page-hook', () => {
  let elementCount = 0;
  let createdElements: HTMLElement[] = [];

  function generateCustomTagName(): string {
    elementCount++;
    return `custom-elem-${elementCount}`;
  }

  afterEach(() => {
    for (const el of createdElements) {
      if (el.isConnected) {
        el.remove();
      }
    }
    createdElements = [];
  });

  it('should allow custom element creation without throwing when addEventListener is called in constructor', async () => {
    const tagName = generateCustomTagName();

    class TestCustomElement extends HTMLElement {
      constructor() {
        super();
        this.addEventListener('click', () => {});
      }
    }

    customElements.define(tagName, TestCustomElement);

    let createdEl: HTMLElement | null = null;
    expect(() => {
      createdEl = document.createElement(tagName);
    }).not.toThrow();

    expect(createdEl).not.toBeNull();
    createdElements.push(createdEl!);

    // Element must not have attributes while detached
    expect(createdEl!.hasAttribute('data-nn-listener')).toBeFalse();

    // Attach to DOM
    document.body.appendChild(createdEl!);

    // Wait for animation frame
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    // Attribute is assigned once connected
    expect(createdEl!.hasAttribute('data-nn-listener')).toBeTrue();
    expect(createdEl!.getAttribute('data-nn-listener')).toBe('1');
  });

  it('should allow custom element creation when onclick property setter is used in constructor', async () => {
    const tagName = generateCustomTagName();

    class TestCustomElementSetter extends HTMLElement {
      constructor() {
        super();
        this.onclick = () => {};
      }
    }

    customElements.define(tagName, TestCustomElementSetter);

    let createdEl: HTMLElement | null = null;
    expect(() => {
      createdEl = document.createElement(tagName);
    }).not.toThrow();

    expect(createdEl).not.toBeNull();
    createdElements.push(createdEl!);

    expect(createdEl!.hasAttribute('data-nn-listener')).toBeFalse();

    // Attach to DOM
    document.body.appendChild(createdEl!);

    // Wait for animation frame
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    expect(createdEl!.hasAttribute('data-nn-listener')).toBeTrue();
    expect(createdEl!.getAttribute('data-nn-listener')).toBe('1');
  });
});
