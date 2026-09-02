(function () {
  let randomPostObserver = null;
  let isFetching = false;
  let disabledCreators = [];
  let isFeatureEnabled = false;
  let isSemiShuffleEnabled = false;

  // Load initial settings
  const scriptEl = document.getElementById('fp-enhancer-random-post-script');
  if (scriptEl) {
    if (scriptEl.getAttribute('data-disabled-creators')) {
      try {
        disabledCreators = JSON.parse(scriptEl.getAttribute('data-disabled-creators'));
      } catch (e) {
        console.error('Floatplane Enhancer: Failed to parse disabled creators data attribute', e);
      }
    }
    if (scriptEl.getAttribute('data-enabled') === 'true') {
      isFeatureEnabled = true;
    }
    if (scriptEl.getAttribute('data-semi-shuffle') === 'true') {
      isSemiShuffleEnabled = true;
    }
  }

  // Listen for dynamic settings changes
  document.addEventListener('fp-random-post-settings-change', (e) => {
    try {
      disabledCreators = JSON.parse(e.detail);
    } catch (err) {
      console.error('Floatplane Enhancer: Failed to parse settings change event data', err);
    }
  });

  // Listen for semi-shuffle setting changes
  document.addEventListener('fp-random-post-semi-shuffle-change', (e) => {
    isSemiShuffleEnabled = e.detail === true;
  });

  // Listen for toggling ON/OFF without refresh
  document.addEventListener('fp-random-post-toggle', (e) => {
    const shouldEnable = e.detail;
    if (shouldEnable) {
      initObserver();
    } else {
      teardown();
    }
  });

  // Fetch creator IDs for all active subscriptions
  async function getSubscriptionCreatorIds() {
    try {
      const response = await fetch('/api/v3/user/subscriptions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        return data.map(sub => sub.creator).filter(Boolean);
      }
      return [];
    } catch (error) {
      console.error('Floatplane Enhancer: Failed to fetch subscriptions:', error);
      return [];
    }
  }

  // Handle clicking on the Random Post button
  async function handleRandomPostClick() {
    if (isFetching) return;

    const textEl = document.querySelector('#fp-enhancer-random-post .random-post-text');
    const originalText = textEl ? textEl.textContent : 'Random Post';

    try {
      isFetching = true;
      if (textEl) {
        textEl.textContent = 'Loading...';
      }

      let ids = await getSubscriptionCreatorIds();
      if (ids.length === 0) {
        alert('Floatplane Enhancer: No active subscriptions found. You need to be subscribed to at least one creator to view random posts.');
        return;
      }

      // Filter out disabled creators
      ids = ids.filter(id => !disabledCreators.includes(id));

      // Filter out last picked creator if semi-shuffle is enabled
      if (isSemiShuffleEnabled && ids.length > 1) {
        const lastCreator = localStorage.getItem('fp-enhancer-last-creator');
        if (lastCreator && ids.includes(lastCreator)) {
          ids = ids.filter(id => id !== lastCreator);
        }
      }

      if (ids.length === 0) {
        alert('Floatplane Enhancer: All subscribed creators are currently excluded in your settings. Please enable at least one creator to get a random post.');
        return;
      }

      let baseUrl = 'https://www.floatplane.com';
      if (window.location.hostname.startsWith('beta')) {
        baseUrl = 'https://beta.floatplane.com';
      }

      // Build query parameters: ids[0]=xxx&ids[1]=yyy
      const params = new URLSearchParams();
      ids.forEach((id, index) => {
        params.append(`ids[${index}]`, id);
      });

      const apiUrl = `${baseUrl}/api/v3/content/post/random?${params.toString()}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.id) {
        // Save creator ID for semi-shuffle avoidance
        if (data.creator && data.creator.id) {
          localStorage.setItem('fp-enhancer-last-creator', data.creator.id);
        }
        window.location.href = `/post/${data.id}`;
      } else {
        alert('Floatplane Enhancer: Failed to fetch random post.');
      }
    } catch (error) {
      console.error('Floatplane Enhancer: Error fetching random post:', error);
      alert('Floatplane Enhancer: Error fetching random post. Make sure you are logged in and have active subscriptions.');
    } finally {
      isFetching = false;
      if (textEl) {
        textEl.textContent = originalText;
      }
    }
  }

  // Inject the button into the dropdown DOM
  function injectRandomPostButton(dropdown) {
    if (document.getElementById('fp-enhancer-random-post-item')) {
      return; // Already injected
    }

    // Attempt to copy styling from an existing item
    const existingSpan = dropdown.querySelector('span[class*="_dropdownItem_"]');
    const existingLi = dropdown.querySelector('li');

    const li = document.createElement('li');
    li.id = 'fp-enhancer-random-post-item';
    if (existingLi) {
      li.className = existingLi.className;
    }

    const span = document.createElement('span');
    span.id = 'fp-enhancer-random-post';
    if (existingSpan) {
      span.className = existingSpan.className;
    }
    
    // Core custom styles to match surrounding dropdown design
    span.style.cursor = 'pointer';
    span.setAttribute('tabindex', '0');
    span.setAttribute('role', 'button');

    // Shuffle icon SVG combined with text span
    span.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px; flex-shrink: 0; display: inline-block; vertical-align: middle;"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
      <span class="random-post-text" style="vertical-align: middle;">Random Post</span>
    `;

    li.appendChild(span);

    // Append before Logout button if it is found, otherwise just append at the end
    let logoutLi = null;
    const lis = dropdown.querySelectorAll('li');
    lis.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes('log out') || text.includes('logout')) {
        logoutLi = item;
      }
    });

    if (logoutLi) {
      dropdown.insertBefore(li, logoutLi);
    } else {
      dropdown.appendChild(li);
    }

    // Set up click & keyboard navigation listeners
    span.addEventListener('click', handleRandomPostClick);
    span.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRandomPostClick();
      }
    });
  }

  // Setup DOM observer to wait for dropdown menu to appear
  function initObserver() {
    if (randomPostObserver) return; // Already running

    // Check if dropdown is already on screen
    const dropdown = document.querySelector('ul[class*="_dropdown_"]');
    if (dropdown) {
      injectRandomPostButton(dropdown);
    }

    randomPostObserver = new MutationObserver(() => {
      const activeDropdown = document.querySelector('ul[class*="_dropdown_"]');
      if (activeDropdown) {
        injectRandomPostButton(activeDropdown);
      }
    });

    randomPostObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function teardown() {
    if (randomPostObserver) {
      randomPostObserver.disconnect();
      randomPostObserver = null;
    }

    const buttonItem = document.getElementById('fp-enhancer-random-post-item');
    if (buttonItem) {
      buttonItem.remove();
    }
  }

  // Start script initialization if enabled
  if (isFeatureEnabled) {
    initObserver();
  }

  // Listen for extension teardown event to cleanup
  document.addEventListener('fp-random-post-teardown', () => {
    console.log('Floatplane Enhancer: Tearing down random post button feature');
    teardown();
  });
})();
