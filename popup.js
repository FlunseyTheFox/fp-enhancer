document.addEventListener('DOMContentLoaded', function () {
  const enableDarkThemeCheckbox = document.getElementById('enableDarkTheme');
  const enableAutoCaptionCheckbox = document.getElementById('enableAutoCaption');
  const enableTimestampsCheckbox = document.getElementById('enableTimestamps');

  // Load user's preferences from storage and update checkbox states
  chrome.storage.sync.get(['enableDarkTheme', 'enableAutoCaption', 'enableTimestamps'], function (data) {
    enableDarkThemeCheckbox.checked = data.enableDarkTheme !== undefined ? data.enableDarkTheme : true;
    enableAutoCaptionCheckbox.checked = data.enableAutoCaption !== undefined ? data.enableAutoCaption : true;
    enableTimestampsCheckbox.checked = data.enableTimestamps !== undefined ? data.enableTimestamps : true; // Add this line
  });

  // Listen for checkbox changes and update storage
  enableDarkThemeCheckbox.addEventListener('change', function () {
    chrome.storage.sync.set({ enableDarkTheme: enableDarkThemeCheckbox.checked });
  });

  enableAutoCaptionCheckbox.addEventListener('change', function () {
    chrome.storage.sync.set({ enableAutoCaption: enableAutoCaptionCheckbox.checked });
  });

  enableTimestampsCheckbox.addEventListener('change', function () { // Add this block
    chrome.storage.sync.set({ enableTimestamps: enableTimestampsCheckbox.checked });
  });
});
