document.addEventListener('DOMContentLoaded', function () {
  const enableDarkThemeCheckbox = document.getElementById('enableDarkTheme');
  const enableAutoCaptionCheckbox = document.getElementById('enableAutoCaption');
  const enableTimestampsCheckbox = document.getElementById('enableTimestamps');
  const enableBetaRedirectCheckbox = document.getElementById('enableBetaRedirect');
  const enableCheckIfCreatorLiveCheckbox = document.getElementById('enableCheckIfCreatorLive');

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
  getStorage(['enableDarkTheme', 'enableAutoCaption', 'enableTimestamps', 'enableBetaRedirect', 'enableCheckIfCreatorLive'], function (data) {
    enableDarkThemeCheckbox.checked = data.enableDarkTheme !== undefined ? data.enableDarkTheme : false;
    enableAutoCaptionCheckbox.checked = data.enableAutoCaption !== undefined ? data.enableAutoCaption : true;
    enableTimestampsCheckbox.checked = data.enableTimestamps !== undefined ? data.enableTimestamps : true;
    enableBetaRedirectCheckbox.checked = data.enableBetaRedirect !== undefined ? data.enableBetaRedirect : false;
    enableCheckIfCreatorLiveCheckbox.checked = data.enableCheckIfCreatorLive !== undefined ? data.enableCheckIfCreatorLive : true;

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
  enableBetaRedirectCheckbox.addEventListener('change', function () {
    if (enableBetaRedirectCheckbox.checked) {
      if (confirm('Are you sure you want to enable beta redirect? This is an experimental feature and may cause unexpected behavior.')) {
        setStorage({ enableBetaRedirect: enableBetaRedirectCheckbox.checked });
      } else {
        enableBetaRedirectCheckbox.checked = false;
      }
    } else {
      setStorage({ enableBetaRedirect: enableBetaRedirectCheckbox.checked });
    }
  });
  enableCheckIfCreatorLiveCheckbox.addEventListener('change', function () {
    setStorage({ enableCheckIfCreatorLive: enableCheckIfCreatorLiveCheckbox.checked });
  });
});
