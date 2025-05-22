chrome.runtime.onInstalled.addListener(() => {
  console.log('Estensione NumberNavigator installata.');
  // Inject content script into existing tabs on installation
  injectContentScriptIntoExistingTabs();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Estensione NumberNavigator avviata.');
  // Inject content script into existing tabs on browser startup
  injectContentScriptIntoExistingTabs();
});

chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      console.error(`Error: ${chrome.runtime.lastError.message}`);
    }
  });
});

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
          } else {
             console.error(`Failed to inject content script into tab ${tab.id}: ${tab.url}`, err);
          }
        });
      }
    });
  });
}