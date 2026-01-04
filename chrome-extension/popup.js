document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  // Get page content via content script
  chrome.tabs.sendMessage(tab.id, {action: "getText"}, async (response) => {
    if (response?.text) {
      const analysis = await analyzeWithAI(response.text);
      displayResults(analysis);
    }
  });

  // Voice button
  document.getElementById('speak').addEventListener('click', () => {
    const speech = new SpeechSynthesisUtterance(document.getElementById('risks').textContent);
    window.speechSynthesis.speak(speech);
  });

  // Fix-it button
  document.getElementById('fix').addEventListener('click', async () => {
    const fix = await getFixSuggestion();
    alert(`Suggested alternative:\n\n${fix}`);
  });
});

async function analyzeWithAI(text) {
  // Send to your backend
  const response = await fetch('YOUR_BACKEND_URL/analyze', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({text: text.substring(0, 10000)}) // Limit length
  });
  return await response.json();
}

function displayResults(analysis) {
  const risksDiv = document.getElementById('risks');
  risksDiv.innerHTML = analysis.risks.map(r => 
    `<p class="risk-${r.level}">⚠️ ${r.text}</p>`
  ).join('');
}