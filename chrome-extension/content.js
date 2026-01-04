// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getText") {
    // Extract all text from page (simplified - you might target specific sections)
    const text = document.body.innerText;
    
    // Look for common T&C indicators
    const isTermsPage = /terms|conditions|privacy|policy|agreement/i.test(document.title);
    
    sendResponse({
      text: isTermsPage ? text : "Not a terms page",
      url: window.location.href,
      isTermsPage: isTermsPage
    });
  }
  return true;
});