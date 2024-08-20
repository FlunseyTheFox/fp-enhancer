document.addEventListener('DOMContentLoaded', function () {
  const enableDarkThemeCheckbox = document.getElementById('enableDarkTheme');
  const enableAutoCaptionCheckbox = document.getElementById('enableAutoCaption');
  const enableTimestampsCheckbox = document.getElementById('enableTimestamps');

  // Polyfill for browser compatibility (Firefox vs. Chrome)
  const isFirefox = typeof browser !== 'undefined';
  const storage = isFirefox ? browser.storage.sync : chrome.storage.sync;

  // Function to get storage values with promise or callback handling
  function getStorage(keys, callback) {
    if (isFirefox) {
      storage.get(keys).then(callback, console.error);
    } else {
      storage.get(keys, callback);
    }
  }

  // Function to set storage values with promise or callback handling
  function setStorage(data) {
    if (isFirefox) {
      storage.set(data).catch(console.error);
    } else {
      storage.set(data);
    }
  }

  // Load user's preferences from storage and update checkbox states
  getStorage(['enableDarkTheme', 'enableAutoCaption', 'enableTimestamps'], function (data) {
    enableDarkThemeCheckbox.checked = data.enableDarkTheme !== undefined ? data.enableDarkTheme : false;
    enableAutoCaptionCheckbox.checked = data.enableAutoCaption !== undefined ? data.enableAutoCaption : true;
    enableTimestampsCheckbox.checked = data.enableTimestamps !== undefined ? data.enableTimestamps : true;

    // Apply dark theme if enabled
    if (enableDarkThemeCheckbox.checked) {
      document.body.classList.add('dark-theme');
    }
  });

  // Listen for checkbox changes and update storage
  enableDarkThemeCheckbox.addEventListener('change', function () {
    setStorage({ enableDarkTheme: enableDarkThemeCheckbox.checked });

    // Apply or remove dark theme based on checkbox state
    if (enableDarkThemeCheckbox.checked) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  });

  enableAutoCaptionCheckbox.addEventListener('change', function () {
    setStorage({ enableAutoCaption: enableAutoCaptionCheckbox.checked });
  });

  enableTimestampsCheckbox.addEventListener('change', function () {
    setStorage({ enableTimestamps: enableTimestampsCheckbox.checked });
  });
});
