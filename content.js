(function () {
  const hostname = window.location.hostname;
  const STYLE_ID = 'universal-dark-mode-style';
  let observer = null;
  let isEnabled = false;

  // CSS that gets injected into the page
  const getDarkModeCSS = () => `
    html {
      filter: invert(1) hue-rotate(180deg) !important;
      background: white !important;
    }
    
    img, video, picture, iframe, svg, 
    [style*="background-image"],
    canvas, embed, object {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;

  // Inject the dark mode stylesheet
  const injectStyle = () => {
    // Remove existing style if present
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = getDarkModeCSS();
    
    // Inject into <head> or <html> if head doesn't exist yet
    (document.head || document.documentElement).appendChild(style);
  };

  // Remove the dark mode stylesheet
  const removeStyle = () => {
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
  };

  // Apply dark mode
  const applyDarkMode = () => {
    isEnabled = true;
    injectStyle();
    startObserver();
  };

  // Remove dark mode
  const removeDarkMode = () => {
    isEnabled = false;
    removeStyle();
    stopObserver();
  };

  // Watch for DOM changes — re-inject style if it gets removed
  const startObserver = () => {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;

      // Check if our style tag is still in the DOM
      if (!document.getElementById(STYLE_ID)) {
        injectStyle();
      }

      // Also check if <html> filter was removed by the site
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target === document.documentElement) {
          // Some sites strip styles — re-inject
          if (!document.getElementById(STYLE_ID)) {
            injectStyle();
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  };

  const stopObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  // 🔥 Detect SPA navigation (URL changes without page reload)
  const watchUrlChanges = () => {
    let lastUrl = location.href;
    
    // Method 1: Watch via MutationObserver on body
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        onUrlChange();
      }
    }).observe(document, { subtree: true, childList: true });

    // Method 2: Override history methods (catches pushState/replaceState)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      onUrlChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      onUrlChange();
    };

    // Method 3: Listen for popstate (back/forward buttons)
    window.addEventListener('popstate', onUrlChange);
  };

  // When URL changes in an SPA, re-check and re-apply
  const onUrlChange = () => {
    setTimeout(() => {
      if (isEnabled && !document.getElementById(STYLE_ID)) {
        injectStyle();
      }
    }, 100);
  };

  // Check storage and initialize
  const initialize = () => {
    chrome.storage.local.get([hostname], (result) => {
      if (result[hostname] === true) {
        applyDarkMode();
      }
    });
    watchUrlChanges();
  };

  // Run immediately
  initialize();

  // Listen for popup messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
      if (request.enabled) {
        applyDarkMode();
      } else {
        removeDarkMode();
      }
      sendResponse({ success: true });
    }
    return true;
  });
})();