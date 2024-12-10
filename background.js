// Background tasks
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'applyFeatures' });
});

// Set default values for features on extension installation
chrome.runtime.onInstalled.addListener(function () {
  const defaultValues = {
    enableDarkTheme: true,
    enableAutoCaption: true,
    enableTimestamps: true,
    enableBetaRedirect: false,
  };

  chrome.storage.sync.get(['enableDarkTheme', 'enableAutoCaption', 'enableTimestamps', 'enableBetaRedirect'], function (data) {
    const storedData = Object.assign({}, defaultValues, data);

    chrome.storage.sync.set(storedData, function () {
      console.log('Default values set:', storedData);
    });
  });
});
