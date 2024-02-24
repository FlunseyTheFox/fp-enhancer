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
      selectCaptionedOption();
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
      styleLink.href = chrome.runtime.getURL('/darkmode-js/status-dark-theme.css');
  } else if (hostname.includes('floatplane.com') || hostname.includes('beta.floatplane.com')) {
      styleLink.href = chrome.runtime.getURL('/darkmode-js/dark-theme.css');
  }
  document.head.appendChild(styleLink);
  console.log('Dark Theme applied for:', hostname);
}


// Select the captioned option
function selectCaptionedOption() {
  const captionedElement = document.querySelector('.AttachmentComponentNeue .title[title="Captioned"]');
  if (captionedElement) {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
      captionedElement.dispatchEvent(event);
      console.log('Captioned option selected.');
  }
}

// Apply timestamps
function applyTimestamps() {
  const timestampScript = document.createElement('script');
  timestampScript.src = chrome.runtime.getURL('timestamp.js');
  document.head.appendChild(timestampScript);
  console.log('Timestamp feature applied.');
}

// Listen for changes in the storage and reapply features
chrome.storage.onChanged.addListener(function (changes) {
  // If enable darktheme is true, apply dark theme
  if (changes.enableDarkTheme && changes.enableDarkTheme.newValue) {
      applyDarkTheme();
  }
  // If enable auto caption is true, select captioned option
  if (changes.enableAutoCaption && changes.enableAutoCaption.newValue) {
      selectCaptionedOption();
  }
  // If enable timestamps is true, apply timestamps JS file (timestamp.js)
  if (changes.enableTimestamps && changes.enableTimestamps.newValue) {
      applyTimestamps();
  }
});

// Check for URL change every second
let lastUrl = window.location.href;
setInterval(function () {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      console.log('URL changed:', currentUrl);
      selectCaptionedOption();
  }
}, 1000);
