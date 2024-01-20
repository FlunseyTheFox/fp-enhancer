// popup.js
document.addEventListener('DOMContentLoaded', function () {
  const enableDarkThemeCheckbox = document.getElementById('enableDarkTheme');
  const enableAutoCaptionCheckbox = document.getElementById('enableAutoCaption');

  // Load user's preferences from storage and update checkbox states
  chrome.storage.sync.get(['enableDarkTheme', 'enableAutoCaption'], function (data) {
    enableDarkThemeCheckbox.checked = data.enableDarkTheme !== undefined ? data.enableDarkTheme : true;
    enableAutoCaptionCheckbox.checked = data.enableAutoCaption !== undefined ? data.enableAutoCaption : true;
  });

  // Listen for checkbox changes and update storage
  enableDarkThemeCheckbox.addEventListener('change', function () {
    chrome.storage.sync.set({ enableDarkTheme: enableDarkThemeCheckbox.checked });
  });

  enableAutoCaptionCheckbox.addEventListener('change', function () {
    chrome.storage.sync.set({ enableAutoCaption: enableAutoCaptionCheckbox.checked });
  });
});
