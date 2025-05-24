/**
 * @file content.ts
 * @description This content script runs in the context of web pages. It is responsible for
 * identifying and numbering clickable elements on the page, and then performing actions
 * (like click, scroll) based on messages received from the extension's popup/background script.
 * It injects labels with numbers next to clickable elements and manages their state.
 */

/**
 * @var {ClickableElementInfo[]} clickableElements
 * @description Array to store information about each numbered clickable element on the page.
 * Each element in the array is an object of type `ClickableElementInfo`.
 * @default []
 */
let clickableElements: ClickableElementInfo[] = [];

/**
 * @var {number} nextNumber
 * @description Counter for assigning unique numbers to clickable elements. It increments
 * each time an element is successfully numbered.
 * @default 1
 */
let nextNumber = 1;

/**
 * @const {number} MAX_ELEMENTS_TO_NUMBER
 * @description The maximum number of elements that will be numbered on a page.
 * This is a safeguard against performance issues on pages with an excessive number of interactive elements.
 * @default 200
 */
const MAX_ELEMENTS_TO_NUMBER = 200;

/**
 * @var {boolean} stylesInjected
 * @description Flag to track if the necessary CSS styles for the number labels have been injected into the page.
 * (Note: This variable is declared but not currently used in the provided script. It might be for future use.)
 * @default false
 */
let stylesInjected = false; // TODO: This variable is declared but not used. Consider removing or implementing its use.

/**
 * @var {number | undefined} numberingInterval
 * @description Stores the ID of the interval timer if periodic re-numbering is active.
 * (Note: This variable is declared but not currently used for setting or clearing an interval in the provided script.
 * It might be intended for a feature that automatically re-numbers elements, e.g., on dynamic content changes,
 * but the current implementation relies on explicit "numberClickables" messages.)
 * @default undefined
 */
let numberingInterval: number | undefined; // TODO: This variable is declared but not used for interval management.

/**
 * @interface ClickableElementInfo
 * @description Defines the structure for storing information about a numbered clickable element.
 */
interface ClickableElementInfo {
    /** @property {HTMLElement} element - The HTML element that was identified as clickable. */
    element: HTMLElement;
    /** @property {number} number - The number assigned to this element. */
    number: number;
    /** @property {HTMLElement} labelElement - The `<span>` element created to display the number label. */
    labelElement: HTMLElement;
    /** @property {string} [originalPosition] - Stores the original `position` style of the element if it was changed (e.g., from 'static' to 'relative') to correctly position the label. */
    originalPosition?: string;
    /** @property {string} [originalOverflow] - Stores the original `overflow` style of the element if it was changed (e.g., from 'hidden' to 'visible') to ensure the label is visible. */
    originalOverflow?: string;
}

/**
 * @function isElementVisible
 * @param {HTMLElement} el - The HTML element to check.
 * @description Checks if an HTML element is currently visible in the viewport.
 * An element is considered visible if it's not `display: none`, `visibility: hidden`,
 * has opacity greater than 0, and its bounding box has a width and height greater than 0
 * and intersects with the viewport.
 * @returns {boolean} True if the element is visible, false otherwise.
 */
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

/**
 * @function findAndNumberClickableElements
 * @description Finds all clickable elements on the page, assigns them a number,
 * and displays a label with that number next to each element.
 * It first clears any existing numbers. Then, it queries the DOM for elements matching
 * a list of selectors for common interactive HTML elements and ARIA roles.
 * For each visible element that hasn't already been numbered and is not a child of an already numbered element,
 * it assigns a number, creates a label `<span>`, potentially adjusts the element's
 * `position` and `overflow` styles to ensure the label is visible, and stores the element's info.
 * The process stops if `MAX_ELEMENTS_TO_NUMBER` is reached.
 * @returns {void}
 */
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

/**
 * @function clearNumbers
 * @description Removes all number labels from the page and resets the state.
 * It iterates through the `clickableElements` array, removes each label `<span>`
 * from the DOM, and restores any modified `position` or `overflow` styles on the
 * original elements. Finally, it clears the `clickableElements` array and resets `nextNumber`.
 * @returns {void}
 */
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

/**
 * @listens chrome.runtime.onMessage
 * @description Listener for messages sent from other parts of the extension (e.g., popup, background script).
 * It handles different actions based on the `request.action` property:
 *  - `"numberClickables"`: Calls `findAndNumberClickableElements()` and responds with status and count.
 *  - `"clickElement"`: Finds the element associated with `request.number`, focuses and clicks it.
 *                      If the element is a `<select>`, it also dispatches a 'mousedown' event to potentially open the dropdown.
 *                      Responds with status ("Clicked" or "Error") and clears numbers.
 *  - `"clearNumbers"`: Calls `clearNumbers()` and responds with status.
 *  - `"scrollUp"`: Scrolls the window up by 80% of the viewport height. Responds with status.
 *  - `"scrollDown"`: Scrolls the window down by 80% of the viewport height. Responds with status.
 * The listener returns `true` for asynchronous message handling to keep the message channel open for `sendResponse`.
 * @param {any} request - The message object received. Expected to have an `action` property (string)
 *                        and potentially other properties like `number` (number).
 * @param {chrome.runtime.MessageSender} sender - Information about the script that sent the message.
 * @param {(response: any) => void} sendResponse - Function to call to send a response back to the sender.
 * @returns {boolean} True if `sendResponse` will be called asynchronously, false otherwise.
 */
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
