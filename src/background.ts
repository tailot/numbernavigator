/**
 * @file background.ts
 * @description This is the background script for the NumberNavigator Chrome extension.
 * It runs persistently in the background (service worker context) and handles events
 * such as extension installation, browser startup, and extension icon clicks.
 * Its primary responsibilities include:
 *  - Injecting the content script (`content.js`) into existing and newly opened tabs
 *    that have http or https URLs. This allows the content script to interact with web pages.
 *  - Opening the extension's options page when the extension icon in the toolbar is clicked.
 *  - Logging installation and startup events.
 */

/**
 * @listens chrome.runtime.onInstalled
 * @description Listener for the `chrome.runtime.onInstalled` event.
 * This event fires when the extension is first installed, when the extension is updated to a new version,
 * and when Chrome is updated to a new version.
 * It logs an installation message and calls `injectContentScriptIntoExistingTabs`
 * to ensure the content script is active in already open tabs.
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Estensione NumberNavigator installata.');
  // Inject content script into existing tabs on installation
  injectContentScriptIntoExistingTabs();
});

/**
 * @listens chrome.runtime.onStartup
 * @description Listener for the `chrome.runtime.onStartup` event.
 * This event fires when Chrome starts up.
 * It logs a startup message and calls `injectContentScriptIntoExistingTabs`
 * to ensure the content script is active in tabs that might have been restored from a previous session.
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Estensione NumberNavigator avviata.');
  // Inject content script into existing tabs on browser startup
  injectContentScriptIntoExistingTabs();
});

/**
 * @listens chrome.action.onClicked
 * @description Listener for the `chrome.action.onClicked` event.
 * This event fires when the user clicks on the extension's icon in the Chrome toolbar.
 * It opens the extension's options page (defined in `manifest.json`).
 * If an error occurs while trying to open the options page, it logs the error.
 * @param {chrome.tabs.Tab} tab - The tab where the action icon was clicked.
 */
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      console.error(`Error: ${chrome.runtime.lastError.message}`);
    }
  });
});

/**
 * @function injectContentScriptIntoExistingTabs
 * @description Iterates through all currently open tabs and injects the `content.js`
 * script into tabs that have a valid URL (http or https) and are not restricted (e.g., chrome:// pages).
 * This ensures that the content script is available on pages that were open before the extension
 * was installed or enabled. It logs successful injections and any errors encountered,
 * specifically ignoring errors related to accessing restricted pages.
 * @returns {void}
 */
function injectContentScriptIntoExistingTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          console.log(`Injected content script into tab ${tab.id}: ${tab.url}`);
        }).catch(err => {
          if (err.message.includes('Cannot access contents of the page')) {
            // Common error for chrome:// pages or other restricted pages, can be ignored.
          } else {
             console.error(`Failed to inject content script into tab ${tab.id}: ${tab.url}`, err);
          }
        });
      }
    });
  });
}