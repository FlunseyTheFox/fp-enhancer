chrome.storage.sync.get(['enableDarkTheme', 'enableDarkModeFixLinks', 'enableAutoCaption', 'enableTimestamps', 'enableBetaRedirect', 'enableCheckIfCreatorLive'], function (data) {
  const defaultValues = {
    enableDarkTheme: true,
    enableDarkModeFixLinks: true,
    enableAutoCaption: true,
    enableTimestamps: true,
    enableBetaRedirect: false,
    enableCheckIfCreatorLive: true
  };

  const storedData = Object.assign({}, defaultValues, data);

  if (storedData.enableDarkTheme) {
    applyDarkTheme();
  }

  if (storedData.enableDarkModeFixLinks) {
    loadDarkmodeFixLinks();
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
  if (storedData.enableCheckIfCreatorLive) {
    better_live_watcher();
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

function loadDarkmodeFixLinks() {
  const darkmodeFixLinksScript = document.createElement('script');
  darkmodeFixLinksScript.src = chrome.runtime.getURL('/features/darkmode_fix_links.js');
  document.head.appendChild(darkmodeFixLinksScript);
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

// Do check if creator is live feature
function better_live_watcher() {
  const is_live_watcher = document.createElement('script');
  is_live_watcher.src = chrome.runtime.getURL('/features/is_live_watcher.js');
  document.head.appendChild(is_live_watcher);
}


// This is for forwarding the live URL to the background script for checking live status
// This is necessary because content scripts cannot make cross-origin requests because of CORS policy restrictions
// or else this would have saved me a lot of time and effort :(
// This also lets me change the button color as Floatplane does not give a class or ID to the LIVE button so it is handled directly under this script
window.addEventListener("message", function (event) {
  if (event.data && event.data.type === "checkLiveStatus") {
    const liveUrl = event.data.url;
    const cdn = event.data.cdn;
    const uri = event.data.uri;


    chrome.runtime.sendMessage(
      { action: 'checkLiveStatus', url: liveUrl, cdn: cdn, uri: uri },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Floatplane Enhancer: Error sending message to background script:", chrome.runtime.lastError);
          return;
        }

        if (response && response.live !== undefined) {
          updateLiveButton(response.live);
        } else {
          console.error("Floatplane Enhancer: No response or invalid response from background script.");
        }
      }
    );
  }
});

// Update the LIVE button (used in is_live_watcher.js)
function updateLiveButton(isLive) {
  const liveButton = document.querySelector('a[href*="live"]');
  
  if (liveButton) {
    if (isLive) {
      liveButton.style.color = 'red';
      liveButton.style.fontWeight = 'bold';
    } else {
      liveButton.style.color = '';
      liveButton.style.fontWeight = '';
    }
  } else {
    console.error("Floatplane Enhancer: LIVE button not found.");
  }
}



// Listen for changes in the storage and reapply features
chrome.storage.onChanged.addListener(function (changes) {
  // If enable darktheme is true, apply dark theme
  if (changes.enableDarkTheme && changes.enableDarkTheme.newValue) {
    applyDarkTheme();
  }

  // If enable darktheme fix links is true, load darkmode enhancer detection script
  // if this does not work blame linus
  if (changes.enableDarkModeFixLinks && changes.enableDarkModeFixLinks.newValue) {
    loadDarkmodeFixLinks();
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
  if (changes.enableCheckIfCreatorLive && changes.enableCheckIfCreatorLive.newValue) {
    better_live_watcher();
  }
});
