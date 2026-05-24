document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggle');
  const siteName = document.getElementById('siteName');

  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    siteName.textContent = 'Not available on this page';
    toggle.disabled = true;
    return;
  }

  const url = new URL(tab.url);
  const hostname = url.hostname;
  siteName.textContent = hostname;

  // Load saved state
  const result = await chrome.storage.local.get([hostname]);
  toggle.checked = result[hostname] === true;

  // Handle toggle changes
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;

    // Save preference
    await chrome.storage.local.set({ [hostname]: enabled });

    // Send message to content script
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggle',
        enabled: enabled
      });
    } catch (err) {
      // If content script isn't loaded, reload the tab
      chrome.tabs.reload(tab.id);
    }
  });
});