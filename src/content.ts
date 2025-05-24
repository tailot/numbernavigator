let clickableElements: ClickableElementInfo[] = [];
let nextNumber = 1;
const MAX_ELEMENTS_TO_NUMBER = 200;
let stylesInjected = false;

let numberingInterval: number | undefined;

interface ClickableElementInfo {
    element: HTMLElement;
    number: number;
    labelElement: HTMLElement;
    originalPosition?: string;
    originalOverflow?: string;
}

function isElementVisible(el: HTMLElement): boolean {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
        return false;
    }
    const rect = el.getBoundingClientRect();
    return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0 &&
        rect.width > 0 &&
        rect.height > 0
    );
}

function findAndNumberClickableElements() {
    clearNumbers();

    const selectors = [
        // 1. Standard HTML interactive elements
        'a[href]',                            // Links with a destination
        'button',                             // Standard buttons
        'input[type="button"]',               // Input elements styled as buttons
        'input[type="submit"]',               // Input elements for submitting forms
        'input[type="reset"]',                // Input elements for resetting forms
        'input[type="checkbox"]',             // Checkbox input
        'input[type="radio"]',                // Radio button input
        'input[type="file"]',                 // File input (opens a dialog)
        'input[type="image"]',                // Image input (acts as a button)
        'select',                             // Dropdown select lists
        'textarea',                           // Text areas (interactive for input)
        'details summary',                    // The clickable part of a details/summary widget

        // 2. ARIA roles for custom interactive elements
        // These roles indicate that an element behaves like a certain control type,
        // even if it's not a standard HTML element (e.g., a div styled as a button).
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="menuitemcheckbox"]',          // Checkbox item within a menu
        '[role="menuitemradio"]',           // Radio button item within a menu
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="option"]',                    // Selectable option in a listbox or combobox
        '[role="treeitem"]',                // Item in a tree structure that can be clicked
        '[role="combobox"]',                  // Combobox (input + dropdown)
        '[role="slider"]',                    // Slider control
        '[role="spinbutton"]',                // Numeric input with up/down buttons
        '[role="switch"]',                    // On/off switch

        // 3. Other mechanisms for interactivity
        '[tabindex]:not([tabindex="-1"])',    // Elements made focusable (and thus often clickable)
                                              // Excludes -1 which means focusable only via script.
        '[contenteditable="true"]'            // Elements whose content is editable (interactive for input)
    ];

    const elements = document.querySelectorAll(selectors.join(', '));

    elements.forEach((el) => {
        if (nextNumber > MAX_ELEMENTS_TO_NUMBER) return;

        const element = el as HTMLElement;

        if (element.dataset['numberNavigatorAssigned'] === "true" || !isElementVisible(element)) {
            return;
        }

        if (element.closest('[data-number-navigator-assigned="true"]')) {
            return;
        }

        //Why? Start of 2
        nextNumber++;

        const label = document.createElement('span');
        label.className = 'number-navigator-label';
        label.textContent = `{${nextNumber}}`;
        const originalPosition = getComputedStyle(element).position;
        const originalOverflow = getComputedStyle(element).overflow;

        if (originalPosition === 'static') {
            element.style.position = 'relative';
        }
        if (originalOverflow === 'hidden') {
            element.style.overflow = 'visible';
        }

        element.appendChild(label);
        element.dataset['numberNavigatorAssigned'] = "true";

        clickableElements.push({
            element,
            number: nextNumber,
            labelElement: label,
            originalPosition: originalPosition === 'static' ? 'static' : undefined, // Store if we changed it from static
            originalOverflow: originalOverflow === 'hidden' ? 'hidden' : undefined // Store if we changed it from hidden
        });
        nextNumber++;
    });
}

function clearNumbers() {
    clickableElements.forEach(info => {
        if (info.labelElement && info.labelElement.parentNode) {
            info.labelElement.parentNode.removeChild(info.labelElement);
        }
        delete info.element.dataset['numberNavigatorAssigned'];

        if (info.originalPosition === 'static' && info.element.style.position === 'relative') {
            info.element.style.position = '';
        }
        if (info.originalOverflow === 'hidden' && info.element.style.overflow === 'visible') {
            info.element.style.overflow = '';
        }
    });
    clickableElements = [];
    nextNumber = 1;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "numberClickables") {
        findAndNumberClickableElements();
        sendResponse({ status: "Clickables numbered", count: clickableElements.length });
        return true;
    } else if (request.action === "clickElement") {

        const targetInfo = clickableElements.find(item => item.number === request.number);
        if (targetInfo) {
            if (document.body.contains(targetInfo.element) && isElementVisible(targetInfo.element)) {
                targetInfo.element.focus();
                targetInfo.element.click();

                if (targetInfo.element.tagName === 'SELECT') {
                    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
                    targetInfo.element.dispatchEvent(event);
                }

                sendResponse({ status: "Clicked", number: request.number });

                clearNumbers();
            } else {
                sendResponse({ status: "Error", message: `Element ${request.number} not visible/found.` });
                clearNumbers();
            }
        } else {
            sendResponse({ status: "Error", message: `No element for number ${request.number}.` });
        }
        return true;
    } else if (request.action === "clearNumbers") {
        clearNumbers();
        sendResponse({ status: "Numbers cleared" });
        return true;
    } else if (request.action === "scrollUp") {
        window.scrollBy(0, -window.innerHeight * 0.8);
        sendResponse({ status: "Scrolled up" });
        return true;
    } else if (request.action === "scrollDown") {
        window.scrollBy(0, window.innerHeight * 0.8);
        sendResponse({ status: "Scrolled down" });
        return true;
    }
    return false;
});
