chrome.storage.sync.get(['enableDarkTheme', 'enableDarkModeFixLinks', 'enableBetaRedirect', 'enableCheckIfCreatorLive', 'enableVODPolls', 'pollDisplayMode'], function (data) {
  const defaultValues = {
    enableDarkTheme: true,
    enableDarkModeFixLinks: false,
    enableBetaRedirect: false,
    enableCheckIfCreatorLive: true,
    enableVODPolls: true,
    pollDisplayMode: 'realtime'
  };

  const storedData = Object.assign({}, defaultValues, data);
  console.log('Floatplane Enhancer: Loaded settings:', storedData);

  if (storedData.enableDarkTheme) {
    applyDarkTheme();
  }

  if (storedData.enableDarkModeFixLinks) {
    loadDarkmodeFixLinks();
  }

  if (storedData.enableBetaRedirect) {
    handleBetaRedirect();
  }
  if (storedData.enableCheckIfCreatorLive) {
    better_live_watcher();
  }
  if (storedData.enableVODPolls) {
    loadPollsScript(storedData);
  }
});

// Apply dark theme
function applyDarkTheme() {
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  const hostname = window.location.hostname;
  console.log('Floatplane Enhancer: Applying dark theme for hostname:', hostname);
  if (hostname === 'status.floatplane.com') {
    styleLink.href = chrome.runtime.getURL('/darkmode-css/status-dark-theme.css');
  } else if (hostname.includes('floatplane.com') || hostname.includes('beta.floatplane.com')) {
    styleLink.href = chrome.runtime.getURL('/darkmode-css/dark-theme.css');
  }
  document.head.appendChild(styleLink);
}

function loadDarkmodeFixLinks() {
  const darkmodeFixLinksScript = document.createElement('script');
  darkmodeFixLinksScript.src = chrome.runtime.getURL('/features/darkmode_fix_links.js');
  console.log('Floatplane Enhancer: Loading darkmode fix links script');
  document.head.appendChild(darkmodeFixLinksScript);
}

// Handle redirection from www (main site) to beta.floatplane.com
function handleBetaRedirect() {
  const currentUrl = window.location.href;
  if (currentUrl.includes('www.floatplane.com')) {
    const newUrl = currentUrl.replace('www.floatplane.com', 'beta.floatplane.com');
    console.log('Floatplane Enhancer: Redirecting to:', newUrl);
    window.location.replace(newUrl);
  }
}

// Do check if creator is live feature
function better_live_watcher() {
  const is_live_watcher = document.createElement('script');
  is_live_watcher.src = chrome.runtime.getURL('/features/is_live_watcher.js');
  console.log('Floatplane Enhancer: Loading live watcher script');
  document.head.appendChild(is_live_watcher);
}
// Load the live polls script with settings
function loadPollsScript(settings) {
  if (!window.location.hostname.includes('floatplane.com') && !window.location.hostname.includes('beta.floatplane.com')) {
    console.error('Floatplane Enhancer: Attempted to load live_polls.js on non-Floatplane domain:', window.location.hostname);
    return;
  }
  const pollScript = document.createElement('script');
  pollScript.src = chrome.runtime.getURL('/features/live_polls.js');
  pollScript.onload = function() {
    const pollSettings = {
      pollDisplayMode: settings.pollDisplayMode
    };
    console.log('Floatplane Enhancer: Loading live_polls.js with settings:', pollSettings);
    // Serialize settings to JSON to avoid cross-context issues
    document.dispatchEvent(new CustomEvent('fp-polls-init', { 
      detail: JSON.stringify(pollSettings) 
    }));
  };
  pollScript.onerror = function() {
    console.error('Floatplane Enhancer: Failed to load live_polls.js');
  };
  document.head.appendChild(pollScript);
}

// This is for forwarding the live URL to the background script for checking live status
window.addEventListener("message", function (event) {
  if (event.data && event.data.type === "checkLiveStatus") {
    const liveUrl = event.data.url;
    const cdn = event.data.cdn;
    const uri = event.data.uri;

    console.log('Floatplane Enhancer: Received checkLiveStatus message:', { liveUrl, cdn, uri });

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
      console.log('Floatplane Enhancer: Updated LIVE button to live state');
    } else {
      liveButton.style.color = '';
      liveButton.style.fontWeight = '';
      console.log('Floatplane Enhancer: Updated LIVE button to non-live state');
    }
  } else {
    console.error("Floatplane Enhancer: LIVE button not found.");
  }
}

// Listen for changes in the storage and reapply features
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.enableDarkTheme) {
    if (changes.enableDarkTheme.newValue) {
      console.log('Floatplane Enhancer: Dark theme enabled');
      applyDarkTheme();
    }
  }

  if (changes.enableDarkModeFixLinks && changes.enableDarkModeFixLinks.newValue) {
    console.log('Floatplane Enhancer: Dark mode fix links enabled');
    loadDarkmodeFixLinks();
  }

  if (changes.enableBetaRedirect && changes.enableBetaRedirect.newValue) {
    console.log('Floatplane Enhancer: Beta redirect enabled');
    handleBetaRedirect();
  }
  if (changes.enableCheckIfCreatorLive && changes.enableCheckIfCreatorLive.newValue) {
    console.log('Floatplane Enhancer: Check if creator live enabled');
    better_live_watcher();
  }
  if (changes.enableVODPolls || changes.pollDisplayMode) {
    chrome.storage.sync.get(['enableVODPolls', 'pollDisplayMode'], (data) => {
      console.log('Floatplane Enhancer: VOD polls settings changed:', data);
      if (data.enableVODPolls) {
        loadPollsScript(data);
      } else {
        console.log('Floatplane Enhancer: Dispatching fp-polls-teardown');
        document.dispatchEvent(new Event('fp-polls-teardown'));
      }
    });
  }
});