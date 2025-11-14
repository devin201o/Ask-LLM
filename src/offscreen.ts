chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'read-clipboard') {
    (async () => {
      try {
        const text = await navigator.clipboard.readText();
        sendResponse({ success: true, text });
      } catch (error) {
        console.error('Failed to read clipboard in offscreen document:', error);
        sendResponse({ success: false, error: String(error) });
      }
    })();
    return true; // Keep the message channel open for the async response
  }
});
