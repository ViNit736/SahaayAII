document.addEventListener('DOMContentLoaded', () => {
  const inputForm = document.getElementById('inputForm');
  const documentInput = document.getElementById('documentInput');
  const fileInput = document.getElementById('fileInput');
  const linkInput = document.getElementById('linkInput');
  const statusMessage = document.getElementById('statusMessage');
  const riskIndicator = document.getElementById('riskIndicator');
  const riskValue = document.getElementById('riskValue');
  const riskBarFill = document.getElementById('riskBarFill');
  const summaryText = document.getElementById('summaryText');
  const actionSteps = document.getElementById('actionSteps');
  const analyzeBtn = document.getElementById('analyzeBtn');

  const API_URL = 'http://localhost:8000';

  function setStatus(type, message) {
    const icons = {
      ready: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
      loading: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
      success: `<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>`,
      error: `<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>`,
      warning: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`
    };

    statusMessage.className = `status-message status-${type}`;
    statusMessage.innerHTML = `
      <svg class="status-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${icons[type]}
      </svg>
      <span class="status-text">${message}</span>
    `;
  }

  function setRisk(level, percent) {
    // Map backend levels to frontend classes if needed, or ensure CSS handles critical/high/medium/low
    const normalizedLevel = level.toLowerCase();
    riskValue.className = `risk-value risk-${normalizedLevel}`;
    riskValue.textContent = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
    riskBarFill.style.width = `${percent}%`;
  }

  function renderActions(actions) {
    if (!actions || actions.length === 0) {
      actionSteps.innerHTML = `
        <li class="action-step">
          <span class="step-number">1</span>
          <span class="step-text">No specific actions required</span>
        </li>
      `;
      return;
    }

    actionSteps.innerHTML = actions
      .map((action, index) => `
        <li class="action-step">
          <span class="step-number">${index + 1}</span>
          <span class="step-text">${action}</span>
        </li>
      `)
      .join('');
  }

  function collectInputData() {
    return {
      text: documentInput.value.trim(),
      files: Array.from(fileInput.files),
      link: linkInput.value.trim()
    };
  }

  function hasInput(data) {
    return data.text || data.files.length > 0 || data.link;
  }

  async function analyzeContent(inputData) {
    let textToAnalyze = inputData.text;

    // Handle file upload if present
    if (inputData.files.length > 0) {
        const formData = new FormData();
        formData.append('file', inputData.files[0]); // Backend expects 'file'

        const parseResponse = await fetch(`${API_URL}/parse-pdf`, {
            method: 'POST',
            body: formData
        });

        if (!parseResponse.ok) {
             const errorData = await parseResponse.json().catch(() => ({}));
             throw new Error(errorData.detail || `File parsing error: ${parseResponse.status}`);
        }

        const parseResult = await parseResponse.json();
        if (parseResult.text) {
            textToAnalyze += "\n" + parseResult.text;
        }
    }

    // Prepare JSON payload for analysis
    const payload = {
        text: textToAnalyze,
        url: inputData.link || "",
        language: "English"
    };

    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    return response.json();
  }

  function renderResults(response) {
    let riskLevel = 'low';
    let riskScore = 0;
    let summary = '';
    let actions = [];
    let statusType = 'success';
    let statusMessageText = 'Analysis complete';

    if (response.analysis_mode === 'SCAM_WARNING') {
        riskLevel = response.risk_level.toLowerCase(); // LOW, MEDIUM, HIGH, CRITICAL
        riskScore = response.risk_score;
        summary = response.immediate_assessment; 
        actions = response.immediate_actions;
        
        if (riskLevel === 'high' || riskLevel === 'critical') {
            statusType = 'error';
            statusMessageText = `Analysis complete - ${riskLevel.toUpperCase()} risk detected!`;
        } else if (riskLevel === 'medium') {
            statusType = 'warning';
            statusMessageText = 'Analysis complete - Medium risk detected';
        } else {
             statusType = 'success';
             statusMessageText = 'Analysis complete - Low risk detected';
        }

    } else if (response.analysis_mode === 'DOCUMENT_EXPLANATION') {
        // Document explanation mode
        riskLevel = 'low'; // Default for docs unless concerns exist
        if (response.potential_concerns && response.potential_concerns.length > 0) {
            riskLevel = 'medium';
            riskScore = 50;
            statusType = 'warning';
            statusMessageText = 'Document analyzed - Potential concerns found';
        } else {
             riskScore = 10;
             statusType = 'success';
             statusMessageText = 'Document analyzed - No major concerns';
        }
        
        summary = response.summary;
        actions = response.next_recommended_steps;
    }

    setStatus(statusType, statusMessageText);
    setRisk(riskLevel, riskScore);
    summaryText.textContent = summary || 'No summary available.';
    renderActions(actions || []);
  }

  function setLoading(isLoading) {
    analyzeBtn.disabled = isLoading;
    riskIndicator.style.opacity = isLoading ? '0.5' : '1';

    if (isLoading) {
      analyzeBtn.innerHTML = `
        <svg class="btn-icon spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Analyzing...
      `;
    } else {
      analyzeBtn.innerHTML = `
        <svg class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        Analyze
      `;
    }
  }

  function resetResults() {
    setStatus('ready', 'Ready to analyze your content');
    setRisk('low', 20);
    summaryText.textContent = 'Analysis results will appear here after you submit content for review.';
    renderActions([
      'Submit content using the input panel',
      'Review the analysis results',
      'Follow recommended actions'
    ]);
  }

  inputForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const inputData = collectInputData();

    if (!hasInput(inputData)) {
      setStatus('error', 'Please provide content to analyze');
      return;
    }

    setLoading(true);
    setStatus('loading', 'Analyzing your content...');

    try {
      const response = await analyzeContent(inputData);
      renderResults(response);
    } catch (error) {
      console.error('Analysis error:', error);

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setStatus('error', 'Unable to connect to server. Please check your connection.');
      } else {
        setStatus('error', error.message || 'Analysis failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  });
});
