let checkingInterval;
let isChecking = false;
let previousUrl = window.location.href;

// Function to update the live button based on live status
const updateLiveButton = (isLive) => {
  const liveButton = document.querySelector('#live-button');
  if (liveButton) {
    if (isLive) {
      liveButton.textContent = 'LIVE';
      liveButton.classList.add('live');
    } else {
      liveButton.textContent = 'Offline';
      liveButton.classList.remove('live');
    }
  }
};

const getLiveStreamId = async (creatorName, baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/v3/creator/named?creatorURL%5B0%5D=${creatorName}`);
    if (!response.ok) {
      throw new Error("Failed to fetch creator info");
    }
    const data = await response.json();
    if (data && data[0] && data[0].liveStream && data[0].liveStream.id) {
      return data[0].liveStream.id;
    } else {
      throw new Error("Livestream ID not found in API response");
    }
  } catch (error) {
    console.error("Error getting creator livestream ID:", error);
    return null;
  }
};

const checkIfCreatorIsLive = async () => {
  try {
    if (!isValidPage()) {
      return;
    }

    const urlMatch = window.location.pathname.match(/^\/channel\/([^\/]+)/);
    if (!urlMatch) {
      console.log("Floatplane Enhancer: Creator name not found in URL.");
      return;
    }
    const creatorName = urlMatch[1];

    let baseUrl = 'https://www.floatplane.com';
    if (window.location.hostname.startsWith('beta')) {
      baseUrl = 'https://beta.floatplane.com';
    }

    const liveStreamId = await getLiveStreamId(creatorName, baseUrl);
    if (!liveStreamId) {
      updateLiveButton(false);
      window.postMessage({ 
        type: "checkLiveStatus", 
        url: null,
        cdn: null,
        uri: null 
      }, "*");
      return;
    }

    const liveUrl = `${baseUrl}/api/v3/delivery/info?scenario=live&entityId=${liveStreamId}`;
    const liveStatusResponse = await fetch(liveUrl);
    if (!liveStatusResponse.ok) {
      console.error("Failed to fetch live status.");
      updateLiveButton(false);
      window.postMessage({ 
        type: "checkLiveStatus", 
        url: liveUrl,
        cdn: null,
        uri: null 
      }, "*");
      return;
    }
    const liveStatusData = await liveStatusResponse.json();

    let cdn = null;
    let uri = null;
    if (liveStatusData && liveStatusData.groups && liveStatusData.groups.length > 0) {
      const group = liveStatusData.groups[0];
      if (group.origins && group.origins.length > 0 && group.variants && group.variants.length > 0) {
        cdn = group.origins[0].url;
        uri = group.variants[0].url;
      }
    }

    const isLive = !!(cdn && uri);
    
    updateLiveButton(isLive);

    window.postMessage({ 
      type: "checkLiveStatus", 
      url: liveUrl,
      cdn: cdn,
      uri: uri 
    }, "*");

  } catch (error) {
    console.error("Error checking live status:", error);
    updateLiveButton(false);
    window.postMessage({ 
      type: "checkLiveStatus", 
      url: null,
      cdn: null,
      uri: null 
    }, "*");
  }
};

const isValidPage = () => {
  const currentUrl = window.location.href;
  const channelPageRegex = /^https:\/\/(www|beta)\.floatplane\.com\/channel\/[^\/]+(\/(?!live)(.*))?$/;
  return channelPageRegex.test(currentUrl);
};

const startChecking = () => {
  if (isValidPage() && !isChecking) {
    isChecking = true;
    setTimeout(() => {
      checkingInterval = setInterval(checkIfCreatorIsLive, 60000);
      checkIfCreatorIsLive();
    }, 2000);
  }
};

const stopChecking = () => {
  if (checkingInterval) {
    clearInterval(checkingInterval);
    checkingInterval = null;
    isChecking = false;
  }
};

// Track URL changes
const handleUrlChange = () => {
  if (window.location.href !== previousUrl) {
    previousUrl = window.location.href;

    if (!isValidPage()) {
      stopChecking();
    } else if (!isChecking) {
      startChecking();
    }

    if (isValidPage()) {
      checkIfCreatorIsLive();
    }
  }
};

// Use MutationObserver to track URL changes that don't trigger popstate
const observeUrlChange = () => {
  const observer = new MutationObserver(() => {
    handleUrlChange();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  handleUrlChange();
};

const originalPushState = history.pushState;
history.pushState = function () {
  if (document.visibilityState !== 'visible') return;
  originalPushState.apply(history, arguments);
  handleUrlChange();
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startChecking();
  } else {
    stopChecking();
  }
});

window.addEventListener('beforeunload', stopChecking);

if (isValidPage()) {
  startChecking();
  observeUrlChange();
}
