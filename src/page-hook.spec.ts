import './page-hook';

describe('page-hook', () => {
  let elementCount = 0;

  function generateCustomTagName(): string {
    elementCount++;
    return `custom-elem-${elementCount}`;
  }

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
    // Element must not have attributes immediately upon creation
    expect(createdEl!.hasAttribute('data-nn-listener')).toBeFalse();

    // Wait for microtask
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    // Attribute is assigned asynchronously in microtask
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
    expect(createdEl!.hasAttribute('data-nn-listener')).toBeFalse();

    await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

    expect(createdEl!.hasAttribute('data-nn-listener')).toBeTrue();
    expect(createdEl!.getAttribute('data-nn-listener')).toBe('1');
  });
});
