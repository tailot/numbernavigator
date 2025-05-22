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

function ensureStylesInjected() {
    if (stylesInjected) return;
    const styleSheet = document.createElement("link");
    styleSheet.rel = "stylesheet";
    styleSheet.type = "text/css";
    styleSheet.href = chrome.runtime.getURL("content.css"); // If you have a content.css
    document.head.appendChild(styleSheet);
    stylesInjected = true;
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
    ensureStylesInjected();

    const selectors = [
        'a[href]',
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        'input[type="checkbox"]',
        'input[type="radio"]',
        'select',
        //'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="menuitem"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="option"]',
        '[role="treeitem"]',
        '[tabindex]:not([tabindex="-1"])', // Elements that are focusable
        'details summary',
        //'[contenteditable="true"]'
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

        const label = document.createElement('span');
        label.className = 'number-navigator-label';
        label.textContent = ` (${nextNumber})`;
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
        console.log("NumberNavigator: Manual numbering requested.");
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
    }
    return false;
});

function startAutomaticNumbering() {
    if (numberingInterval !== undefined) {
        clearInterval(numberingInterval);
    }
    console.log("NumberNavigator: Starting automatic numbering every 5 seconds.");
    findAndNumberClickableElements();
    numberingInterval = window.setInterval(() => {
        findAndNumberClickableElements();
    }, 7000);
}
