// Background tasks
(function() {
  const browserAPI = chrome || browser;

  const action = browserAPI.action || browserAPI.browserAction;

  if (action && action.onClicked) {
    action.onClicked.addListener((tab) => {
      browserAPI.tabs.sendMessage(tab.id, { action: 'applyFeatures' });
    });
  } else {
    console.error("Floatplane Enhancer: Action API is not supported in this browser.");
  }
})();

// Set default values for features on extension installation
chrome.runtime.onInstalled.addListener(function () {
  const defaultValues = {
    enableDarkTheme: true,
    enableDarkModeFixLinks: false,
    enableBetaRedirect: false,
    enableCheckIfCreatorLive: true,
    enableVODPolls: true,
    pollDisplayMode: 'final'
  };

  chrome.storage.sync.get(Object.keys(defaultValues), function (data) {
    const storedData = Object.assign({}, defaultValues, data);

    chrome.storage.sync.set(storedData, function () {
      console.log('Floatplane Enhancer: Default values set:', storedData);
    });
  });
});

// Proxy-like background script to check if a creator is live
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkLiveStatus') {
    const liveUrl = message.url;
    const cdn = message.cdn;
    const uri = message.uri;

    if (!cdn || !uri) {
      console.error("Invalid CDN or URI data.");
      sendResponse({ live: false });
      return;
    }

    const cdnUrl = cdn + uri;

    fetch(liveUrl, { method: 'GET', mode: 'cors' })
      .then(response => {
        if (!response.ok) {
          console.error(`Floatplane Enhancer: Live URL fetch failed with status: ${response.status}`);
          sendResponse({ live: false });
          return;
        }

        // If the live URL fetch succeeds, proceed to check the CDN URL
        return fetch(cdnUrl, { method: 'GET', mode: 'cors' });
      })
      .then(response => {
        if (response && response.status === 200) {
          console.log('Floatplane Enhancer: Creator is live:', liveUrl);
          sendResponse({ live: true });
        } else {
          console.log('Floatplane Enhancer: Creator is not live:', liveUrl);
          sendResponse({ live: false });
        }
      })
      .catch(error => {
        console.error('Floatplane Enhancer: Error checking live status:', error);
        sendResponse({ live: false });
      });

    return true;
  }
});