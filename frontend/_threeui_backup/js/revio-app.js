/**
 * Revio — AI Review Intelligence Application
 * Version 1.0.0
 * Architecture: Vanilla Single-Page Application (SPA) with Hash Routing
 */

(function () {
  'use strict';

  // =========================================================================
  // STATE MANAGEMENT & PERSISTENCE
  // =========================================================================

  const STORAGE_KEY = 'revio_session_history_v1';
  const SESSION_ID_KEY = 'revio_session_id';

  function loadInitialHistory() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load history from sessionStorage:', e);
    }
    return [];
  }

  const state = {
    currentSection: 'overview',
    sidebarOpen: false,
    reviewHistory: loadInitialHistory(),
    analysisMode: 'single', // 'single', 'batch', 'film'
    healthData: null,
    selectedBatchFileContent: null,
  };

  function persistHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviewHistory));
    } catch (e) {
      console.warn('Failed to persist history to sessionStorage:', e);
    }
  }

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'revio-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  }

  // =========================================================================
  // ROUTING & NAVIGATION
  // =========================================================================

  const SECTIONS = ['overview', 'analyse', 'inbox', 'insights', 'models', 'settings'];

  const PAGE_TITLES = {
    overview: 'Overview',
    analyse: 'Analyse Reviews',
    inbox: 'Review Inbox',
    insights: 'Insights',
    models: 'Model Lab',
    settings: 'Settings',
  };

  function navigateTo(section) {
    if (!SECTIONS.includes(section)) {
      section = 'overview';
    }

    state.currentSection = section;

    // Toggle active sections
    SECTIONS.forEach(function (s) {
      const el = document.getElementById('sec-' + s);
      if (el) {
        if (s === section) {
          el.classList.remove('rv-hidden');
        } else {
          el.classList.add('rv-hidden');
        }
      }
    });

    // Update sidebar links
    document.querySelectorAll('.rv-sidebar__link').forEach(function (link) {
      const targetSec = link.dataset.section;
      const isActive = targetSec === section;
      link.classList.toggle('rv-sidebar__link--active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    // Update topbar title
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
      titleEl.textContent = PAGE_TITLES[section] || 'Revio';
    }

    // Sync hash
    if (window.location.hash.replace('#', '') !== section) {
      window.location.hash = section;
    }

    // Close mobile sidebar on navigation
    closeSidebar();

    // Trigger section-specific refreshes
    refreshSection(section);
  }

  // Expose navigateTo globally for inline onclick handlers in HTML
  window.navigateTo = navigateTo;

  function refreshSection(section) {
    switch (section) {
      case 'overview':
        refreshOverview();
        break;
      case 'inbox':
        refreshInbox();
        break;
      case 'insights':
        refreshInsights();
        break;
      case 'models':
        refreshModels();
        break;
      case 'settings':
        refreshSettings();
        break;
    }
  }

  // =========================================================================
  // SIDEBAR CONTROLLER
  // =========================================================================

  function toggleSidebar() {
    state.sidebarOpen = !state.sidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('rv-sidebar--open', state.sidebarOpen);
    if (overlay) overlay.classList.toggle('rv-visible', state.sidebarOpen);
  }

  function closeSidebar() {
    state.sidebarOpen = false;
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('rv-sidebar--open');
    if (overlay) overlay.classList.remove('rv-visible');
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================

  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3200;

    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'rv-toast rv-toast--' + type;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.33 4L6 11.33 2.67 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    }

    toast.innerHTML = [
      iconSvg,
      '<span class="rv-toast__message">' + escapeHtml(message) + '</span>',
      '<button class="rv-toast__close" aria-label="Close notification">&times;</button>'
    ].join('');

    const closeBtn = toast.querySelector('.rv-toast__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        dismissToast(toast);
      });
    }

    container.appendChild(toast);

    // Fade in
    requestAnimationFrame(function () {
      toast.classList.add('rv-toast--visible');
    });

    // Auto dismiss
    setTimeout(function () {
      dismissToast(toast);
    }, duration);
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('rv-toast--visible');
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }

  // =========================================================================
  // API HEALTH & STATUS POLLING
  // =========================================================================

  async function checkHealth() {
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.healthData = data;
      updateHealthUI(data);
      return data;
    } catch (err) {
      console.warn('API health check failed:', err);
      updateHealthUI(null);
      return null;
    }
  }

  function updateHealthUI(data) {
    const isOnline = data && data.status === 'healthy';
    const isDegraded = data && data.status === 'degraded';

    // Sidebar status indicator
    const sidebarDot = document.getElementById('sidebarDot');
    const sidebarStatusText = document.getElementById('sidebarStatusText');
    if (sidebarDot) {
      sidebarDot.className = 'rv-dot ' + (isOnline ? 'rv-dot--positive' : (isDegraded ? 'rv-dot--warning' : 'rv-dot--negative'));
    }
    if (sidebarStatusText) {
      sidebarStatusText.textContent = isOnline ? 'ML Online' : (isDegraded ? 'ML Degraded' : 'API Offline');
    }

    // Settings status badge
    const settingsHealth = document.getElementById('settingsHealth');
    if (settingsHealth) {
      if (isOnline) {
        settingsHealth.className = 'rv-badge rv-badge--positive';
        settingsHealth.textContent = 'Healthy';
      } else if (isDegraded) {
        settingsHealth.className = 'rv-badge rv-badge--warning';
        settingsHealth.textContent = 'Degraded';
      } else {
        settingsHealth.className = 'rv-badge rv-badge--negative';
        settingsHealth.textContent = 'Offline';
      }
    }

    // Overview stats
    const statModelsLoaded = document.getElementById('statModelsLoaded');
    const statApiStatus = document.getElementById('statApiStatus');
    if (statApiStatus) {
      statApiStatus.textContent = isOnline ? 'Online' : (isDegraded ? 'Degraded' : 'Offline');
      statApiStatus.style.color = isOnline ? 'var(--rv-positive)' : (isDegraded ? 'var(--rv-warning)' : 'var(--rv-negative)');
    }
    if (statModelsLoaded && data && data.models) {
      let count = 0;
      Object.keys(data.models).forEach(function (k) {
        if (data.models[k].status === 'loaded') count++;
      });
      statModelsLoaded.textContent = count + '/3';
    }
  }

  // =========================================================================
  // OVERVIEW SECTION
  // =========================================================================

  function refreshOverview() {
    checkHealth();

    // Average latency calculation from session history
    const latencyEl = document.getElementById('statAvgLatency');
    if (latencyEl) {
      const itemsWithLatency = state.reviewHistory.filter(function (r) {
        return typeof r.latencyMs === 'number' && r.latencyMs > 0;
      });
      if (itemsWithLatency.length > 0) {
        const total = itemsWithLatency.reduce(function (sum, r) { return sum + r.latencyMs; }, 0);
        const avg = Math.round(total / itemsWithLatency.length);
        latencyEl.textContent = avg + 'ms';
      } else {
        latencyEl.textContent = '—';
      }
    }

    // Render recent analyses list
    const recentContainer = document.getElementById('recentAnalyses');
    if (!recentContainer) return;

    if (state.reviewHistory.length === 0) {
      recentContainer.innerHTML = [
        '<div class="rv-empty-state">',
        '  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">',
        '    <path d="M6 20h8l3 6h6l3-6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>',
        '    <rect x="8" y="8" width="24" height="24" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>',
        '  </svg>',
        '  <p>No analyses yet. Start by analysing a review above.</p>',
        '</div>'
      ].join('');
      return;
    }

    const recentItems = state.reviewHistory.slice(-5).reverse();
    recentContainer.innerHTML = recentItems.map(function (item) {
      const isPos = item.sentiment === 'Positive';
      return [
        '<div class="rv-recent-item">',
        '  <div class="rv-recent-item__text">',
        '    ' + escapeHtml(truncate(item.text, 90)),
        '  </div>',
        '  <div class="rv-recent-item__meta">',
        '    <span class="rv-sentiment-badge rv-sentiment-badge--' + item.sentiment.toLowerCase() + ' rv-sentiment-badge--sm">',
        '      ' + (isPos ? '↑' : '↓') + ' ' + item.sentiment,
        '    </span>',
        item.needs_human_review
          ? '<span class="rv-badge rv-badge--warning rv-badge--sm">Escalate</span>'
          : '<span class="rv-badge rv-badge--neutral rv-badge--sm">Auto-Ack</span>',
        '    <span class="rv-text-tertiary rv-text-xs">' + (item.source || 'Revio') + '</span>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  // =========================================================================
  // ANALYSE REVIEWS SECTION
  // =========================================================================

  function setupAnalyseSection() {
    // Mode toggle tabs
    document.querySelectorAll('.rv-mode-toggle__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const mode = btn.dataset.mode;
        state.analysisMode = mode;

        document.querySelectorAll('.rv-mode-toggle__btn').forEach(function (b) {
          const isSelected = b === btn;
          b.classList.toggle('rv-mode-toggle__btn--active', isSelected);
          b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });

        const singlePanel = document.getElementById('singlePanel');
        const batchPanel = document.getElementById('batchPanel');
        const filmPanel = document.getElementById('filmPanel');

        if (singlePanel) singlePanel.classList.toggle('rv-hidden', mode !== 'single');
        if (batchPanel) batchPanel.classList.toggle('rv-hidden', mode !== 'batch');
        if (filmPanel) filmPanel.classList.toggle('rv-hidden', mode !== 'film');
      });
    });

    // Character counter for single review
    const singleInput = document.getElementById('reviewInput');
    const charCount = document.getElementById('charCount');
    if (singleInput && charCount) {
      singleInput.addEventListener('input', function () {
        charCount.textContent = singleInput.value.length + ' characters';
      });
    }

    // Single review analyze button
    const singleBtn = document.getElementById('analyseSingleBtn');
    if (singleBtn) {
      singleBtn.addEventListener('click', handleSingleReviewAnalyse);
    }

    // Overview quick analyze button
    const quickBtn = document.getElementById('quickAnalyseBtn');
    if (quickBtn) {
      quickBtn.addEventListener('click', function () {
        const quickInput = document.getElementById('quickReviewInput');
        if (!quickInput || !quickInput.value.trim()) {
          showToast('Please paste a review first.', 'error');
          return;
        }
        const text = quickInput.value.trim();
        navigateTo('analyse');
        if (singleInput) {
          singleInput.value = text;
          if (charCount) charCount.textContent = text.length + ' characters';
        }
        handleSingleReviewAnalyse();
      });
    }

    // Film review ensemble analyze button
    const filmBtn = document.getElementById('analyseFilmBtn');
    if (filmBtn) {
      filmBtn.addEventListener('click', handleFilmReviewAnalyse);
    }

    // Batch setup
    setupBatchUpload();
  }

  // --- Single Business Review ---
  async function handleSingleReviewAnalyse() {
    const input = document.getElementById('reviewInput');
    const text = input ? input.value.trim() : '';

    if (!text) {
      showToast('Please enter a review to analyse.', 'error');
      if (input) input.focus();
      return;
    }
    if (text.length < 5) {
      showToast('Review is too short to produce meaningful sentiment cues.', 'error');
      return;
    }

    const btn = document.getElementById('analyseSingleBtn');
    const resultsContainer = document.getElementById('singleResults');

    setButtonLoading(btn, true, 'Analysing Review…');

    try {
      const startTime = performance.now();
      const res = await fetch('/api/v1/revio/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });

      if (!res.ok) {
        throw new Error('Server returned HTTP ' + res.status);
      }

      const data = await res.json();
      const latencyMs = Math.round(performance.now() - startTime);

      // Record in session history
      const historyItem = {
        id: Date.now(),
        text: text,
        sentiment: data.sentiment,
        positive_probability: data.positive_probability,
        needs_human_review: data.needs_human_review,
        triage_status: data.triage_status,
        word_contributions: data.word_contributions || [],
        latencyMs: latencyMs,
        source: 'Revio Business Model',
        timestamp: new Date().toISOString()
      };
      state.reviewHistory.push(historyItem);
      persistHistory();

      // Render results
      renderSingleResult(data, latencyMs, resultsContainer);
      if (resultsContainer) {
        resultsContainer.classList.remove('rv-hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      showToast('Analysis completed in ' + latencyMs + 'ms', 'success');
    } catch (err) {
      console.error('Revio prediction error:', err);
      showToast('Failed to analyze review. Ensure backend & ML services are running.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function renderSingleResult(data, latencyMs, container) {
    if (!container) return;

    const isPositive = data.sentiment === 'Positive';
    const posProb = (data.positive_probability * 100).toFixed(1);
    const negProb = ((1 - data.positive_probability) * 100).toFixed(1);
    const primaryConfidence = isPositive ? posProb : negProb;

    const cues = (data.word_contributions || []).slice(0, 20);

    container.innerHTML = [
      '<div class="rv-result-card rv-fade-in">',
      '  <div class="rv-result-card__header">',
      '    <div class="rv-result-card__sentiment">',
      '      <span class="rv-sentiment-badge rv-sentiment-badge--' + data.sentiment.toLowerCase() + ' rv-sentiment-badge--lg">',
      '        ' + (isPositive ? '↑' : '↓') + ' ' + data.sentiment,
      '      </span>',
      '      <span class="rv-result-card__confidence">' + primaryConfidence + '% confidence</span>',
      '    </div>',
      '    <div class="rv-result-card__triage">',
      '      <span class="rv-triage-indicator rv-triage-indicator--' + (data.needs_human_review ? 'escalate' : 'auto') + '">',
      '        ' + (data.needs_human_review ? '⚠ ' : '✓ ') + data.triage_status,
      '      </span>',
      '    </div>',
      '  </div>',
      '  <div class="rv-result-card__body">',
      data.needs_human_review ? [
        '    <div class="rv-needs-review-banner">',
        '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">',
        '        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>',
        '        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        '      </svg>',
        '      <span><strong>Action Required:</strong> Flagged for human review due to negative sentiment or high complaint risk.</span>',
        '    </div>'
      ].join('') : '',
      '    <div class="rv-confidence-section">',
      '      <div class="rv-confidence-bar-container">',
      '        <div class="rv-confidence-labels">',
      '          <span>Negative (' + negProb + '%)</span>',
      '          <span>Positive (' + posProb + '%)</span>',
      '        </div>',
      '        <div class="rv-progress">',
      '          <div class="rv-progress__fill rv-progress__fill--sentiment" style="width: ' + posProb + '%"></div>',
      '        </div>',
      '        <div class="rv-confidence-values">',
      '          <span>Threshold calibrated on Yelp Polarity</span>',
      '          <span>P(Positive) = ' + data.positive_probability.toFixed(4) + '</span>',
      '        </div>',
      '      </div>',
      '    </div>',
      cues.length > 0 ? [
        '    <div class="rv-evidence-section">',
        '      <h4 class="rv-evidence-section__title">',
        '        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">',
        '          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>',
        '          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        '        </svg>',
        '        <span>Word-Level Contribution Cues (TF-IDF &times; &beta;)</span>',
        '      </h4>',
        '      <div class="rv-word-chips">',
        cues.map(function (c) {
          const isPosCue = c.polarity === 'Positive';
          const sign = c.weight > 0 ? '+' : '';
          return [
            '<span class="rv-word-chip rv-word-chip--' + (isPosCue ? 'positive' : 'negative') + '"',
            '      title="Term: \'' + escapeHtml(c.term) + '\' | Weight: ' + sign + c.weight.toFixed(4) + ' | ' + c.polarity + '">',
            '  ' + escapeHtml(c.term),
            '  <span class="rv-word-chip__weight">' + sign + c.weight.toFixed(2) + '</span>',
            '</span>'
          ].join('');
        }).join(''),
        '      </div>',
        '    </div>'
      ].join('') : '',
      '  </div>',
      '  <div class="rv-result-card__footer">',
      '    <span class="rv-text-tertiary rv-text-xs">Model: Yelp Word+Char TF-IDF LR &middot; Latency: ' + latencyMs + 'ms</span>',
      '    <button class="rv-btn rv-btn--ghost rv-btn--sm" onclick="navigateTo(\'inbox\')">View in Inbox &rarr;</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  // --- Film Review 3-Model Ensemble ---
  async function handleFilmReviewAnalyse() {
    const input = document.getElementById('filmReviewInput');
    const text = input ? input.value.trim() : '';

    if (!text) {
      showToast('Please enter a movie review.', 'error');
      if (input) input.focus();
      return;
    }
    if (text.length < 5) {
      showToast('Review is too short.', 'error');
      return;
    }

    const btn = document.getElementById('analyseFilmBtn');
    const resultsContainer = document.getElementById('filmResults');

    setButtonLoading(btn, true, 'Consulting Film Critics…');

    try {
      const res = await fetch('/api/v1/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          models: ['lr', 'lstm', 'bert'],
          sessionId: getSessionId()
        })
      });

      if (!res.ok) {
        throw new Error('Server returned HTTP ' + res.status);
      }

      const data = await res.json();

      // Record in history
      const historyItem = {
        id: Date.now(),
        text: text,
        sentiment: data.overall.label,
        needs_human_review: data.overall.needs_human_review || false,
        triage_status: data.overall.needs_human_review ? 'ESCALATE' : 'AUTO-ACKNOWLEDGE',
        latencyMs: Math.round(data.timing.total_ms || 0),
        source: 'Film Critics (IMDb)',
        timestamp: new Date().toISOString()
      };
      state.reviewHistory.push(historyItem);
      persistHistory();

      // Render results
      renderFilmResults(data, resultsContainer);
      if (resultsContainer) {
        resultsContainer.classList.remove('rv-hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      showToast('Critics consensus reached in ' + Math.round(data.timing.total_ms) + 'ms', 'success');
    } catch (err) {
      console.error('Film prediction error:', err);
      showToast('Failed to evaluate movie review with ensemble.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function renderFilmResults(data, container) {
    if (!container) return;

    const label = data.overall.label || 'Unavailable';
    const isApproved = label.toLowerCase() === 'positive';
    const isPanned = label.toLowerCase() === 'negative';
    const totalMs = Math.round(data.timing.total_ms || 0);

    const stampClass = isApproved ? 'rv-verdict-stamp--approved' : (isPanned ? 'rv-verdict-stamp--panned' : 'rv-verdict-stamp--panned');
    const stampText = isApproved ? 'APPROVED' : (isPanned ? 'PANNED' : label.toUpperCase());

    const lrData = data.models && data.models.lr;
    const lstmData = data.models && data.models.lstm;
    const bertData = data.models && data.models.bert;

    container.innerHTML = [
      '<div class="rv-result-card rv-fade-in">',
      '  <div class="rv-result-card__header rv-result-card__header--verdict">',
      '    <div class="rv-verdict-stamp ' + stampClass + '">' + stampText + '</div>',
      '    <div class="rv-verdict-meta">',
      '      <span>Agreement: <strong>' + escapeHtml(data.overall.agreement || '—') + '</strong></span>',
      '      <span>&bull;</span>',
      '      <span>Ensemble Latency: <strong>' + totalMs + 'ms</strong></span>',
      data.overall.needs_human_review
        ? '<span class="rv-badge rv-badge--warning">Split / Human Review Flagged</span>'
        : '<span class="rv-badge rv-badge--positive">Consensus Formed</span>',
      '    </div>',
      '  </div>',
      '  <div class="rv-critics-grid">',
      buildCriticCard('The Statistician', 'Logistic Regression + TF-IDF', lrData),
      buildCriticCard('The Sequentialist', 'Bidirectional LSTM', lstmData),
      buildCriticCard('The Contextualist', 'Fine-Tuned BERT', bertData),
      '  </div>',
      '  <div class="rv-result-card__footer" style="margin-top: var(--rv-space-6);">',
      '    <span class="rv-text-tertiary rv-text-xs">Domain: IMDb Movie Reviews (Out-of-Domain for Customer Business Reviews)</span>',
      '    <button class="rv-btn rv-btn--ghost rv-btn--sm" onclick="navigateTo(\'inbox\')">View in Inbox &rarr;</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  function buildCriticCard(title, sub, modelData) {
    if (!modelData || modelData.error) {
      return [
        '<div class="rv-critic-card rv-critic-card--error">',
        '  <div class="rv-critic-card__header">',
        '    <h4>' + title + '</h4>',
        '    <span class="rv-badge rv-badge--neutral">' + sub + '</span>',
        '  </div>',
        '  <div class="rv-critic-card__body">',
        '    <span class="rv-badge rv-badge--warning" style="margin-bottom: var(--rv-space-2)">Inference Unavailable</span>',
        '    <p class="rv-text-secondary rv-text-xs">' + escapeHtml(modelData ? modelData.error : 'Model failed to respond') + '</p>',
        '  </div>',
        '</div>'
      ].join('');
    }

    const isPos = modelData.label === 'Positive';
    const conf = (modelData.confidence * 100).toFixed(1);
    const latency = modelData.latency_ms ? modelData.latency_ms.toFixed(1) + 'ms' : '—';

    let cuesHtml = '';
    if (modelData.top_positive_words || modelData.top_negative_words) {
      const posWords = (modelData.top_positive_words || []).slice(0, 3);
      const negWords = (modelData.top_negative_words || []).slice(0, 3);
      cuesHtml = [
        '<div class="rv-critic-keywords">',
        posWords.length > 0 ? [
          '<div class="rv-critic-keywords__group">',
          '  <span class="rv-text-xs rv-text-tertiary">POSITIVE CUES</span>',
          '  <div class="rv-word-chips rv-word-chips--sm">',
          posWords.map(function (w) { return '<span class="rv-word-chip rv-word-chip--positive rv-word-chip--sm">' + escapeHtml(w) + '</span>'; }).join(''),
          '  </div>',
          '</div>'
        ].join('') : '',
        negWords.length > 0 ? [
          '<div class="rv-critic-keywords__group">',
          '  <span class="rv-text-xs rv-text-tertiary">NEGATIVE CUES</span>',
          '  <div class="rv-word-chips rv-word-chips--sm">',
          negWords.map(function (w) { return '<span class="rv-word-chip rv-word-chip--negative rv-word-chip--sm">' + escapeHtml(w) + '</span>'; }).join(''),
          '  </div>',
          '</div>'
        ].join('') : '',
        '</div>'
      ].join('');
    }

    return [
      '<div class="rv-critic-card">',
      '  <div class="rv-critic-card__header">',
      '    <h4>' + title + '</h4>',
      '    <span class="rv-badge rv-badge--neutral">' + sub + '</span>',
      '  </div>',
      '  <div class="rv-critic-card__body">',
      '    <span class="rv-sentiment-badge rv-sentiment-badge--' + modelData.label.toLowerCase() + ' rv-sentiment-badge--sm">',
      '      ' + (isPos ? '↑' : '↓') + ' ' + modelData.label,
      '    </span>',
      '    <div class="rv-confidence-mini">',
      '      <div class="rv-flex rv-justify-between rv-text-xs rv-text-tertiary">',
      '        <span>Confidence</span>',
      '        <span>' + conf + '%</span>',
      '      </div>',
      '      <div class="rv-progress rv-progress--sm">',
      '        <div class="rv-progress__fill" style="width: ' + conf + '%"></div>',
      '      </div>',
      '    </div>',
      modelData.reasoning ? '<p class="rv-text-xs rv-text-secondary" style="margin-top: var(--rv-space-2); font-style: italic;">' + escapeHtml(modelData.reasoning) + '</p>' : '',
      cuesHtml,
      '  </div>',
      '  <div class="rv-critic-card__footer">',
      '    <span class="rv-text-tertiary rv-text-xs">Latency: ' + latency + '</span>',
      '  </div>',
      '</div>'
    ].join('');
  }

  // --- Batch Upload CSV ---
  function setupBatchUpload() {
    const dropZone = document.getElementById('fileDrop');
    const fileInput = document.getElementById('csvInput');
    const browseBtn = document.getElementById('browseBtn');
    const batchBtn = document.getElementById('analyseBatchBtn');

    if (!dropZone || !fileInput) return;

    if (browseBtn) {
      browseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        fileInput.click();
      });
    }

    dropZone.addEventListener('click', function () {
      fileInput.click();
    });

    dropZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropZone.classList.add('rv-file-drop--active');
    });

    dropZone.addEventListener('dragleave', function () {
      dropZone.classList.remove('rv-file-drop--active');
    });

    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('rv-file-drop--active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFileSelected(fileInput.files[0]);
      }
    });

    if (batchBtn) {
      batchBtn.addEventListener('click', handleBatchProcess);
    }
  }

  function handleFileSelected(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      showToast('Please select a valid .csv file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      state.selectedBatchFileContent = e.target.result;
      const parsedReviews = extractReviewsFromCsv(state.selectedBatchFileContent);

      const fileInfo = document.getElementById('fileInfo');
      const batchBtn = document.getElementById('analyseBatchBtn');

      if (fileInfo) {
        fileInfo.classList.remove('rv-hidden');
        fileInfo.innerHTML = [
          '<div class="rv-flex rv-items-center rv-gap-3" style="padding: var(--rv-space-3); background: var(--rv-bg-base); border-radius: var(--rv-radius-md); border: 1px solid var(--rv-border-default); margin-top: var(--rv-space-3);">',
          '  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rv-positive)" stroke-width="2" aria-hidden="true">',
          '    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>',
          '    <polyline points="14 2 14 8 20 8"/>',
          '  </svg>',
          '  <div style="flex: 1; text-align: left;">',
          '    <strong>' + escapeHtml(file.name) + '</strong>',
          '    <div class="rv-text-secondary rv-text-xs">' + parsedReviews.length + ' valid review row(s) detected (capped at 100)</div>',
          '  </div>',
          '</div>'
        ].join('');
      }

      if (batchBtn) {
        batchBtn.disabled = parsedReviews.length === 0;
      }
    };
    reader.readAsText(file);
  }

  function extractReviewsFromCsv(csvText) {
    if (!csvText) return [];
    const lines = csvText.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(',');
    let targetCol = header.findIndex(function (h) {
      return h.includes('review') || h.includes('text') || h.includes('comment') || h.includes('content');
    });
    if (targetCol === -1) targetCol = 0;

    const reviews = [];
    for (let i = 1; i < lines.length && reviews.length < 100; i++) {
      const parts = lines[i].split(',');
      const val = (parts[targetCol] || '').replace(/^["']|["']$/g, '').trim();
      if (val.length > 5) {
        reviews.push(val);
      }
    }
    return reviews;
  }

  async function handleBatchProcess() {
    if (!state.selectedBatchFileContent) {
      showToast('Please select a CSV file first.', 'error');
      return;
    }

    const reviews = extractReviewsFromCsv(state.selectedBatchFileContent);
    if (reviews.length === 0) {
      showToast('No valid reviews found in the uploaded file.', 'error');
      return;
    }

    const btn = document.getElementById('analyseBatchBtn');
    const resultsContainer = document.getElementById('batchResults');

    setButtonLoading(btn, true, 'Processing Batch (' + reviews.length + ')…');

    try {
      const res = await fetch('/api/v1/revio/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviews })
      });

      if (!res.ok) {
        throw new Error('Batch inference returned HTTP ' + res.status);
      }

      const data = await res.json();

      // Record items into history
      (data.reviews || []).forEach(function (r) {
        state.reviewHistory.push({
          id: Date.now() + Math.random(),
          text: r.text,
          sentiment: r.sentiment,
          positive_probability: r.positive_probability,
          needs_human_review: r.needs_human_review,
          triage_status: r.triage_status,
          word_contributions: r.word_contributions || [],
          source: 'Revio Batch',
          timestamp: new Date().toISOString()
        });
      });
      persistHistory();

      // Render table
      renderBatchResults(data, resultsContainer);
      if (resultsContainer) {
        resultsContainer.classList.remove('rv-hidden');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      showToast('Batch complete: ' + data.count + ' reviews processed', 'success');
    } catch (err) {
      console.error('Batch error:', err);
      showToast('Failed to process batch CSV.', 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function renderBatchResults(data, container) {
    if (!container) return;
    const reviews = data.reviews || [];
    const escalated = reviews.filter(function (r) { return r.needs_human_review; }).length;

    container.innerHTML = [
      '<div class="rv-result-card rv-fade-in">',
      '  <div class="rv-result-card__header">',
      '    <div>',
      '      <h3>Batch Processing Results</h3>',
      '      <span class="rv-text-secondary rv-text-sm">' + data.count + ' total reviews processed</span>',
      '    </div>',
      '    <div class="rv-flex rv-gap-2">',
      '      <span class="rv-badge rv-badge--positive">' + (data.count - escalated) + ' Auto-Ack</span>',
      '      <span class="rv-badge rv-badge--warning">' + escalated + ' Escalated</span>',
      '    </div>',
      '  </div>',
      '  <div class="rv-result-card__body">',
      '    <div class="rv-table-container">',
      '      <table class="rv-table">',
      '        <thead>',
      '          <tr>',
      '            <th>#</th>',
      '            <th>Review Snippet</th>',
      '            <th>Sentiment</th>',
      '            <th>Confidence</th>',
      '            <th>Triage Action</th>',
      '          </tr>',
      '        </thead>',
      '        <tbody>',
      reviews.map(function (r, idx) {
        const isPos = r.sentiment === 'Positive';
        const conf = ((isPos ? r.positive_probability : (1 - r.positive_probability)) * 100).toFixed(1);
        return [
          '          <tr>',
          '            <td class="rv-text-tertiary">' + (idx + 1) + '</td>',
          '            <td class="rv-text-sm">' + escapeHtml(truncate(r.text, 80)) + '</td>',
          '            <td>',
          '              <span class="rv-sentiment-badge rv-sentiment-badge--' + r.sentiment.toLowerCase() + ' rv-sentiment-badge--sm">',
          '                ' + (isPos ? '↑' : '↓') + ' ' + r.sentiment,
          '              </span>',
          '            </td>',
          '            <td class="rv-font-mono rv-text-xs">' + conf + '%</td>',
          '            <td>',
          '              <span class="rv-triage-indicator rv-triage-indicator--' + (r.needs_human_review ? 'escalate' : 'auto') + ' rv-triage-indicator--sm">',
          '                ' + r.triage_status,
          '              </span>',
          '            </td>',
          '          </tr>'
        ].join('');
      }).join(''),
      '        </tbody>',
      '      </table>',
      '    </div>',
      '  </div>',
      '  <div class="rv-result-card__footer">',
      '    <button class="rv-btn rv-btn--ghost rv-btn--sm" onclick="navigateTo(\'inbox\')">Review in Inbox &rarr;</button>',
      '  </div>',
      '</div>'
    ].join('');
  }

  // =========================================================================
  // REVIEW INBOX SECTION
  // =========================================================================

  function setupInboxSection() {
    const searchInput = document.getElementById('inboxSearch');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        refreshInbox();
      }, 150));
    }

    document.querySelectorAll('.rv-filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        document.querySelectorAll('.rv-filter-chip').forEach(function (c) {
          c.classList.remove('rv-filter-chip--active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('rv-filter-chip--active');
        chip.setAttribute('aria-pressed', 'true');
        refreshInbox();
      });
    });
  }

  function refreshInbox() {
    const listContainer = document.getElementById('inboxList');
    if (!listContainer) return;

    const searchTerm = (document.getElementById('inboxSearch')?.value || '').toLowerCase().trim();
    const activeChip = document.querySelector('.rv-filter-chip--active');
    const filter = activeChip ? activeChip.dataset.filter : 'all';

    let items = state.reviewHistory.slice();

    if (searchTerm) {
      items = items.filter(function (item) {
        return item.text.toLowerCase().includes(searchTerm);
      });
    }

    if (filter === 'positive') {
      items = items.filter(function (item) { return item.sentiment === 'Positive'; });
    } else if (filter === 'negative') {
      items = items.filter(function (item) { return item.sentiment === 'Negative'; });
    } else if (filter === 'escalate') {
      items = items.filter(function (item) { return item.needs_human_review === true; });
    }

    if (items.length === 0) {
      listContainer.innerHTML = [
        '<div class="rv-empty-state">',
        '  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">',
        '    <path d="M6 20h8l3 6h6l3-6h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>',
        '    <rect x="8" y="8" width="24" height="24" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>',
        '  </svg>',
        '  <p>' + (state.reviewHistory.length === 0 ? 'No reviews analysed yet' : 'No reviews match your search or filter') + '</p>',
        state.reviewHistory.length === 0
          ? '  <button class="rv-btn rv-btn--primary rv-btn--sm" onclick="navigateTo(\'analyse\')">Analyse Reviews</button>'
          : '',
        '</div>'
      ].join('');
      return;
    }

    listContainer.innerHTML = items.slice().reverse().map(function (item) {
      const isPos = item.sentiment === 'Positive';
      return [
        '<div class="rv-inbox-item rv-fade-in">',
        '  <p class="rv-inbox-item__text">' + escapeHtml(item.text) + '</p>',
        '  <div class="rv-inbox-item__meta">',
        '    <span class="rv-sentiment-badge rv-sentiment-badge--' + item.sentiment.toLowerCase() + ' rv-sentiment-badge--sm">',
        '      ' + (isPos ? '↑' : '↓') + ' ' + item.sentiment,
        '    </span>',
        item.needs_human_review
          ? '<span class="rv-triage-indicator rv-triage-indicator--escalate rv-triage-indicator--sm">ESCALATE</span>'
          : '<span class="rv-triage-indicator rv-triage-indicator--auto rv-triage-indicator--sm">AUTO-ACKNOWLEDGE</span>',
        '    <span class="rv-badge rv-badge--neutral">' + (item.source || 'Revio') + '</span>',
        item.latencyMs ? '<span class="rv-text-tertiary rv-text-xs">' + item.latencyMs + 'ms</span>' : '',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');
  }

  // =========================================================================
  // INSIGHTS SECTION
  // =========================================================================

  function refreshInsights() {
    const emptyEl = document.getElementById('insightsEmpty');
    const contentEl = document.getElementById('insightsContent');

    if (state.reviewHistory.length === 0) {
      if (emptyEl) emptyEl.classList.remove('rv-hidden');
      if (contentEl) contentEl.classList.add('rv-hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('rv-hidden');
    if (contentEl) contentEl.classList.remove('rv-hidden');

    const total = state.reviewHistory.length;
    const posCount = state.reviewHistory.filter(function (r) { return r.sentiment === 'Positive'; }).length;
    const negCount = total - posCount;
    const escCount = state.reviewHistory.filter(function (r) { return r.needs_human_review; }).length;
    const autoCount = total - escCount;

    const posEl = document.getElementById('posCount');
    const negEl = document.getElementById('negCount');
    const escEl = document.getElementById('escalatedCount');
    const autoEl = document.getElementById('autoAckCount');

    if (posEl) posEl.textContent = posCount;
    if (negEl) negEl.textContent = negCount;
    if (escEl) escEl.textContent = escCount;
    if (autoEl) autoEl.textContent = autoCount;

    // Distribution bar
    const distBar = document.getElementById('sentimentDistribution');
    if (distBar) {
      const posPct = total > 0 ? (posCount / total * 100).toFixed(1) : '50';
      const negPct = (100 - parseFloat(posPct)).toFixed(1);
      distBar.innerHTML = [
        '<div class="rv-distribution-bar__fill--positive" style="width: ' + posPct + '%;" title="Positive: ' + posPct + '%"></div>',
        '<div class="rv-distribution-bar__fill--negative" style="width: ' + negPct + '%;" title="Negative: ' + negPct + '%"></div>'
      ].join('');
    }

    // Aggregate word contribution frequencies
    const wordsContainer = document.getElementById('topWordsContainer');
    if (wordsContainer) {
      const freq = {};
      state.reviewHistory.forEach(function (r) {
        (r.word_contributions || []).forEach(function (wc) {
          const t = wc.term.toLowerCase();
          if (!freq[t]) {
            freq[t] = { term: wc.term, count: 0, weight: 0, polarity: wc.polarity };
          }
          freq[t].count += 1;
          freq[t].weight += wc.weight;
        });
      });

      const sortedTerms = Object.values(freq).sort(function (a, b) {
        return Math.abs(b.weight) - Math.abs(a.weight);
      }).slice(0, 24);

      if (sortedTerms.length > 0) {
        wordsContainer.innerHTML = [
          '<div class="rv-word-chips">',
          sortedTerms.map(function (w) {
            const isPos = w.polarity === 'Positive';
            return [
              '<span class="rv-word-chip rv-word-chip--' + (isPos ? 'positive' : 'negative') + '"',
              '      title="' + w.term + ': observed ' + w.count + ' time(s)">',
              '  ' + escapeHtml(w.term),
              '  <span class="rv-word-chip__weight">(&times;' + w.count + ')</span>',
              '</span>'
            ].join('');
          }).join(''),
          '</div>'
        ].join('');
      } else {
        wordsContainer.innerHTML = '<p class="rv-text-secondary rv-text-xs">Word-level contributions will appear here once Revio reviews are analysed.</p>';
      }
    }
  }

  // =========================================================================
  // MODEL LAB SECTION
  // =========================================================================

  async function refreshModels() {
    const data = await checkHealth();

    const lrStatus = document.getElementById('lrStatus');
    const lstmStatus = document.getElementById('lstmStatus');
    const bertStatus = document.getElementById('bertStatus');
    const revioModelStatus = document.getElementById('revioModelStatus');

    function renderStatusPill(status) {
      const isOk = status === 'loaded';
      return [
        '<span class="rv-dot ' + (isOk ? 'rv-dot--positive' : 'rv-dot--warning') + '" aria-hidden="true"></span>',
        '<span class="rv-text-xs" style="color: ' + (isOk ? 'var(--rv-positive-text)' : 'var(--rv-warning-text)') + '">' + (isOk ? 'Loaded' : 'Unavailable') + '</span>'
      ].join('');
    }

    if (lrStatus) {
      const isLoaded = data && data.models && data.models.lr && data.models.lr.status === 'loaded';
      lrStatus.innerHTML = renderStatusPill(isLoaded ? 'loaded' : 'error');
    }
    if (lstmStatus) {
      const isLoaded = data && data.models && data.models.lstm && data.models.lstm.status === 'loaded';
      lstmStatus.innerHTML = renderStatusPill(isLoaded ? 'loaded' : 'error');
    }
    if (bertStatus) {
      const isLoaded = data && data.models && data.models.bert && data.models.bert.status === 'loaded';
      bertStatus.innerHTML = renderStatusPill(isLoaded ? 'loaded' : 'error');
    }
    if (revioModelStatus) {
      // The Yelp model is actively loaded in revio_routes.py
      revioModelStatus.innerHTML = [
        '<span class="rv-dot rv-dot--positive" aria-hidden="true"></span>',
        '<span class="rv-text-xs" style="color: var(--rv-positive-text)">Loaded (Joblib)</span>'
      ].join('');
    }
  }

  // =========================================================================
  // SETTINGS SECTION
  // =========================================================================

  function refreshSettings() {
    checkHealth();
  }

  // =========================================================================
  // HELPERS & UTILITIES
  // =========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  function setButtonLoading(btn, loading, text) {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.origText = btn.innerHTML;
      btn.innerHTML = '<span class="rv-spinner" aria-hidden="true"></span> ' + (text || 'Processing…');
    } else {
      btn.disabled = false;
      if (btn.dataset.origText) {
        btn.innerHTML = btn.dataset.origText;
      }
    }
  }

  function debounce(fn, delay) {
    let timer = null;
    return function () {
      const ctx = this;
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  function init() {
    // 1. Sidebar link click listeners
    document.querySelectorAll('.rv-sidebar__link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const sec = link.dataset.section;
        navigateTo(sec);
      });
    });

    // 2. Sidebar hamburger toggle
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleSidebar);
    }

    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // 3. Setup tabs & forms
    setupAnalyseSection();
    setupInboxSection();

    // 4. Handle initial route from URL hash
    const initialHash = window.location.hash.replace('#', '') || 'overview';
    navigateTo(initialHash);

    // 5. Hash change listener
    window.addEventListener('hashchange', function () {
      const sec = window.location.hash.replace('#', '') || 'overview';
      if (sec !== state.currentSection) {
        navigateTo(sec);
      }
    });

    // 6. Perform initial health check
    checkHealth();

    console.log('Revio UI Initialized successfully.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

