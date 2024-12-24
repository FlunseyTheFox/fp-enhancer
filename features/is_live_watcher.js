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

const getCreatorId = async (creatorName, baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/v3/creator/named?creatorURL%5B0%5D=${creatorName}`);
    if (!response.ok) {
      throw new Error("Failed to fetch creator ID");
    }
    const data = await response.json();
    if (data && data[0] && data[0].id) {
      return data[0].id;
    } else {
      throw new Error("Creator ID not found in API response");
    }
  } catch (error) {
    console.error("Error getting creator ID:", error);
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

    const creatorId = await getCreatorId(creatorName, baseUrl);
    if (!creatorId) {
      return;
    }

    const liveUrl = `${baseUrl}/api/v2/cdn/delivery?type=live&creator=${creatorId}`;
    const liveStatusResponse = await fetch(liveUrl);
    if (!liveStatusResponse.ok) {
      console.error("Failed to fetch live status.");
      return;
    }
    const liveStatusData = await liveStatusResponse.json();

    const isLive = liveStatusData && liveStatusData.cdn && liveStatusData.resource.uri;
    
    updateLiveButton(isLive);

    window.postMessage({ 
      type: "checkLiveStatus", 
      url: liveUrl,
      cdn: liveStatusData.cdn,
      uri: liveStatusData.resource.uri 
    }, "*");

  } catch (error) {
    console.error("Error checking live status:", error);
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
