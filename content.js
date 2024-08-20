chrome.storage.sync.get(['enableDarkTheme', 'enableAutoCaption', 'enableTimestamps'], function (data) {
  const defaultValues = {
    enableDarkTheme: true,
    enableAutoCaption: true,
    enableTimestamps: true,
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
  console.log('Dark Theme applied for:', hostname);
}

// Function to load the auto-caption script
function loadAutoCaptionScript() {
  const autoCaptionScript = document.createElement('script');
  autoCaptionScript.src = chrome.runtime.getURL('/features/autocaption.js');
  document.head.appendChild(autoCaptionScript);
  console.log('Auto-caption script loaded.');
}

// Apply timestamps
function applyTimestamps() {
  const timestampScript = document.createElement('script');
  timestampScript.src = chrome.runtime.getURL('/features/timestamp.js');
  document.head.appendChild(timestampScript);
  console.log('Timestamp feature applied.');
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
});
