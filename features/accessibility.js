(function () {
  let accessibilityObserver = null;
  let accessibilityTimeout = null;

  // accessibility helper function
  function runFixes() {
    // Fix 1: User Profile Icon tabindex and keyboard accessibility
    const userIconContainer = document.querySelector('[class*="_dropdownContainer_"]');
    if (userIconContainer) {
      if (!userIconContainer.hasAttribute('tabindex')) {
        userIconContainer.setAttribute('tabindex', '0');
        userIconContainer._addedTabindex = true;
      }
      if (!userIconContainer.hasAttribute('role')) {
        userIconContainer.setAttribute('role', 'button');
        userIconContainer._addedRole = true;
      }
      if (!userIconContainer.hasAttribute('aria-label')) {
        userIconContainer.setAttribute('aria-label', 'User Profile Menu');
        userIconContainer._addedAriaLabel = true;
      }

      if (!userIconContainer._hasKeydownListener) {
        userIconContainer._keydownHandler = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const img = userIconContainer.querySelector('img');
            if (img) {
              img.click();
            } else {
              userIconContainer.click();
            }
          }
        };
        userIconContainer.addEventListener('keydown', userIconContainer._keydownHandler);
        userIconContainer._hasKeydownListener = true;
      }
    }

    // Fix 2: User Popup Menu visibility toggling
    const dropdown = document.querySelector('ul[class*="_dropdown_"]');
    if (dropdown) {
      const style = window.getComputedStyle(dropdown);
      const isOpen = parseFloat(style.opacity) > 0.01;
      if (isOpen) {
        if (!dropdown.classList.contains('fp-enhancer-menu-open')) {
          dropdown.classList.add('fp-enhancer-menu-open');
        }
      } else {
        if (dropdown.classList.contains('fp-enhancer-menu-open')) {
          dropdown.classList.remove('fp-enhancer-menu-open');
        }
      }
    }

    // Fix 3: Makes the user profile menu dropdown items usable with keyboard
    const dropdownSpans = document.querySelectorAll('ul[class*="_dropdown_"] span[class*="_dropdownItem_"]');
    dropdownSpans.forEach(span => {
      if (!span.hasAttribute('tabindex')) {
        span.setAttribute('tabindex', '0');
        span._addedTabindex = true;
      }
      if (!span.hasAttribute('role')) {
        span.setAttribute('role', 'button');
        span._addedRole = true;
      }

      if (!span._hasKeydownListener) {
        span._keydownHandler = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            span.click();
          }
        };
        span.addEventListener('keydown', span._keydownHandler);
        span._hasKeydownListener = true;
      }
    });

    // Fix 4: Video/Post Cards tabindex optimization and unified card container styling
    // this makes the entire post card highlightable when tabbed to instead of the link and image and other parts seperatly
    const postLinks = document.querySelectorAll('a[href^="/post/"]');
    const processedContainers = new Set();

    postLinks.forEach(postLink => {
      let cardContainer = postLink.parentElement;
      while (cardContainer && cardContainer !== document.body) {
        if (cardContainer.tagName === 'DIV' &&
          (cardContainer.className.includes('container') ||
            cardContainer.className.includes('Container') ||
            cardContainer.className.includes('feedItem') ||
            cardContainer.className.includes('Item'))) {
          break;
        }
        cardContainer = cardContainer.parentElement;
      }

      if (cardContainer && !processedContainers.has(cardContainer)) {
        processedContainers.add(cardContainer);

        // Add our custom class to make the container highlightable in CSS
        if (!cardContainer.classList.contains('fp-enhancer-post-card')) {
          cardContainer.classList.add('fp-enhancer-post-card');
        }

        const cardPostLinks = cardContainer.querySelectorAll('a[href^="/post/"]');
        if (cardPostLinks.length > 1) {
          if (cardPostLinks[0].getAttribute('tabindex') !== '-1') {
            cardPostLinks[0].setAttribute('tabindex', '-1');
          }
          if (cardPostLinks[0].getAttribute('aria-hidden') !== 'true') {
            cardPostLinks[0].setAttribute('aria-hidden', 'true');
          }
        }

        const channelLinks = cardContainer.querySelectorAll('a[href^="/channel/"], a[href^="/user/"]');
        channelLinks.forEach(link => {
          if (link.getAttribute('tabindex') !== '-1') {
            link.setAttribute('tabindex', '-1');
          }
        });
      }
    });

    // Fix 5: Sidebar collapsed channels tabindex exclusion
    const collapsedPanels = document.querySelectorAll('[class*="_linkDropdownPanel_"]');
    collapsedPanels.forEach(panel => {
      const isCollapsed = panel.style.maxHeight === '0px' ||
        panel.style.maxHeight === '0' ||
        panel.style.height === '0px' ||
        panel.style.height === '0' ||
        window.getComputedStyle(panel).maxHeight === '0px';

      const subLinks = panel.querySelectorAll('a');
      subLinks.forEach(link => {
        if (isCollapsed) {
          if (link.getAttribute('tabindex') !== '-1') {
            link.setAttribute('tabindex', '-1');
          }
        } else {
          if (link.getAttribute('tabindex') === '-1') {
            link.removeAttribute('tabindex');
          }
        }
      });
    });

    // Fix 6: Prevent screen readers from reading subtitles
    const captionsContainers = document.querySelectorAll('.avplayer-control-captions-container, [class*="captions-container"]');
    captionsContainers.forEach(container => {
      if (container.getAttribute('aria-hidden') !== 'true') {
        container.setAttribute('aria-hidden', 'true');
      }
    });

    // Fix 7: Prevent player controls timestamp from triggering screen reader announcements on update
    const player = document.querySelector('.av-player-control-wrapper, [class*="avplayer"]');
    if (player) {
      const timeSegments = player.querySelectorAll('[class*="_segment_"]');
      timeSegments.forEach(segment => {
        const container = segment.parentElement;
        if (container && container.getAttribute('aria-hidden') !== 'true') {
          container.setAttribute('aria-hidden', 'true');
        }
      });
    }
  }

  // Set up MutationObserver to run fixes dynamically with a short delay to prevent race conditions during transitions
  accessibilityObserver = new MutationObserver(() => {
    if (accessibilityTimeout) clearTimeout(accessibilityTimeout);
    accessibilityTimeout = setTimeout(runFixes, 20);
  });
  accessibilityObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Run initial fixes
  runFixes();

  // Listen for teardown event from content script
  document.addEventListener('fp-accessibility-teardown', function teardownHandler() {
    console.log('Floatplane Enhancer: Tearing down accessibility fixes');
    document.removeEventListener('fp-accessibility-teardown', teardownHandler);

    if (accessibilityObserver) {
      accessibilityObserver.disconnect();
      accessibilityObserver = null;
    }
    if (accessibilityTimeout) {
      clearTimeout(accessibilityTimeout);
      accessibilityTimeout = null;
    }

    // Clean up tabindexes and event listeners we added
    const userIconContainer = document.querySelector('[class*="_dropdownContainer_"]');
    if (userIconContainer) {
      if (userIconContainer._addedTabindex) {
        userIconContainer.removeAttribute('tabindex');
        delete userIconContainer._addedTabindex;
      }
      if (userIconContainer._addedRole) {
        userIconContainer.removeAttribute('role');
        delete userIconContainer._addedRole;
      }
      if (userIconContainer._addedAriaLabel) {
        userIconContainer.removeAttribute('aria-label');
        delete userIconContainer._addedAriaLabel;
      }
      if (userIconContainer._hasKeydownListener) {
        userIconContainer.removeEventListener('keydown', userIconContainer._keydownHandler);
        delete userIconContainer._hasKeydownListener;
        delete userIconContainer._keydownHandler;
      }
    }

    const dropdown = document.querySelector('ul[class*="_dropdown_"]');
    if (dropdown) {
      dropdown.classList.remove('fp-enhancer-menu-open');
    }

    // Restore user profile menu span items
    const dropdownSpans = document.querySelectorAll('ul[class*="_dropdown_"] span[class*="_dropdownItem_"]');
    dropdownSpans.forEach(span => {
      if (span._addedTabindex) {
        span.removeAttribute('tabindex');
        delete span._addedTabindex;
      }
      if (span._addedRole) {
        span.removeAttribute('role');
        delete span._addedRole;
      }
      if (span._hasKeydownListener) {
        span.removeEventListener('keydown', span._keydownHandler);
        delete span._hasKeydownListener;
        delete span._keydownHandler;
      }
    });

    // Restore tabindex attributes on all card links and remove custom class
    const postContainers = document.querySelectorAll('.fp-enhancer-post-card');
    postContainers.forEach(container => {
      container.classList.remove('fp-enhancer-post-card');
      const postLinks = container.querySelectorAll('a[href^="/post/"]');
      postLinks.forEach(link => {
        link.removeAttribute('tabindex');
        link.removeAttribute('aria-hidden');
      });
      const channelLinks = container.querySelectorAll('a[href^="/channel/"], a[href^="/user/"]');
      channelLinks.forEach(link => {
        link.removeAttribute('tabindex');
      });
    });

    // Restore tabindex attributes on sidebar collapsed panel links
    const collapsedPanels = document.querySelectorAll('[class*="_linkDropdownPanel_"]');
    collapsedPanels.forEach(panel => {
      const subLinks = panel.querySelectorAll('a');
      subLinks.forEach(link => {
        link.removeAttribute('tabindex');
      });
    });

    // Restore subtitles containers
    const captionsContainers = document.querySelectorAll('.avplayer-control-captions-container, [class*="captions-container"]');
    captionsContainers.forEach(container => {
      container.removeAttribute('aria-hidden');
    });

    // Restore player controls timestamps
    const player = document.querySelector('.av-player-control-wrapper, [class*="avplayer"]');
    if (player) {
      const timeSegments = player.querySelectorAll('[class*="_segment_"]');
      timeSegments.forEach(segment => {
        const container = segment.parentElement;
        if (container) {
          container.removeAttribute('aria-hidden');
        }
      });
    }
  });
})();
