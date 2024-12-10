chrome.storage.sync.get(['enableDarkTheme', 'enableAutoCaption', 'enableTimestamps', 'enableBetaRedirect'], function (data) {
  const defaultValues = {
    enableDarkTheme: true,
    enableAutoCaption: true,
    enableTimestamps: true,
    enableBetaRedirect: false
  };

  const storedData = Object.assign({}, defaultValues, data);

  if (storedData.enableDarkTheme) {
    applyDarkTheme();
  }

  if (storedData.enableAutoCaption) {
    loadAutoCaptionScript();
  }

  if (storedData.enableTimestamps) {
    applyTimestamps();
  }
  if (storedData.enableBetaRedirect) {
    handleBetaRedirect();
  }
});

// Apply dark theme
function applyDarkTheme() {
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  const hostname = window.location.hostname;
  if (hostname === 'status.floatplane.com') {
    styleLink.href = chrome.runtime.getURL('/darkmode-css/status-dark-theme.css');
  } else if (hostname.includes('floatplane.com') || hostname.includes('beta.floatplane.com')) {
    styleLink.href = chrome.runtime.getURL('/darkmode-css/dark-theme.css');
  }
  document.head.appendChild(styleLink);
}

// Function to load the auto-caption script
function loadAutoCaptionScript() {
  const autoCaptionScript = document.createElement('script');
  autoCaptionScript.src = chrome.runtime.getURL('/features/autocaption.js');
  document.head.appendChild(autoCaptionScript);
}

// Apply timestamps
function applyTimestamps() {
  const timestampScript = document.createElement('script');
  timestampScript.src = chrome.runtime.getURL('/features/timestamp.js');
  document.head.appendChild(timestampScript);
}

// Handle redirection from www (main site) to beta.floatplane.com
// Could make this a feature in seperate file, but it's not that long...
function handleBetaRedirect() {
  const currentUrl = window.location.href;
  if (currentUrl.includes('www.floatplane.com')) {
    const newUrl = currentUrl.replace('www.floatplane.com', 'beta.floatplane.com');
    window.location.replace(newUrl);
  }
}


// Listen for changes in the storage and reapply features
chrome.storage.onChanged.addListener(function (changes) {
  // If enable darktheme is true, apply dark theme
  if (changes.enableDarkTheme && changes.enableDarkTheme.newValue) {
    applyDarkTheme();
  }
  // If enable auto caption is true, load auto-caption script
  if (changes.enableAutoCaption && changes.enableAutoCaption.newValue) {
    loadAutoCaptionScript();
  }
  // If enable timestamps is true, apply timestamps JS file (timestamp.js)
  if (changes.enableTimestamps && changes.enableTimestamps.newValue) {
    applyTimestamps();
  }
  // If enable beta redirect is true, apply beta redirect
  if (changes.enableBetaRedirect && changes.enableBetaRedirect.newValue) {
    handleBetaRedirect();
  }
});
