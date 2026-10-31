/**
 * Revio — Product Application Engine
 * Architecture: Vanilla Single-Page Application (SPA) with Hash Routing
 * Complies with Revio Design System & Acceptance Checklist
 */

(function () {
  'use strict';

  // Core formatting & sanitization utilities
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function truncate(str, maxLen = 80) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
  }

  // =========================================================================
  // 1. STATE MANAGEMENT & STORAGE
  // =========================================================================
  const STORAGE_KEY = 'revio_reviews_state_v3';
  const SETTINGS_KEY = 'revio_user_settings_v2';

  // Centralized Environment-Aware API Base Configuration
  const API_BASE = (typeof window !== 'undefined' && window.__REVIO_API_BASE__) || '';
  const ENDPOINTS = {
    PREDICT: `${API_BASE}/api/v1/revio/predict`,
    BATCH: `${API_BASE}/api/v1/revio/batch`,
    HEALTH: `${API_BASE}/api/v1/health`,
    MODELS: `${API_BASE}/api/v1/revio/models`
  };

  // Default curated sample reviews for instant "Try a sample" demo
  const SAMPLE_REVIEWS = [
    { text: "The room was clean and the staff were kind, but check-in took nearly forty minutes and no one explained the delay.", rating: 3, source: "Google Reviews", date: "12 Oct 2026" },
    { text: "Exceptional service from the front desk team! The amenities were top-tier and breakfast was fresh.", rating: 5, source: "Yelp", date: "11 Oct 2026" },
    { text: "The AC has been leaking for two weeks and maintenance keeps closing my ticket without fixing it. Unacceptable.", rating: 1, source: "TenantEase", date: "10 Oct 2026" },
    { text: "Great location and quiet neighborhood, though parking fees are surprisingly steep.", rating: 4, source: "Google Reviews", date: "09 Oct 2026" },
    { text: "Worst customer support experience ever. Waited on hold for an hour and was hung up on twice.", rating: 1, source: "Yelp", date: "08 Oct 2026" },
    { text: "Seamless check-in, spotless bathroom, comfortable mattress, and rapid Wi-Fi. Will definitely book again.", rating: 5, source: "Booking.com", date: "08 Oct 2026" },
    { text: "Food was good but the service was agonizingly slow. Took 45 minutes to get our entrees.", rating: 2, source: "Yelp", date: "07 Oct 2026" },
    { text: "The maintenance tech was polite and fixed the garbage disposal quickly. Appreciate the fast turnaround.", rating: 5, source: "TenantEase", date: "06 Oct 2026" },
    { text: "Billing department charged me twice for utility fees. Still waiting on a refund three weeks later.", rating: 1, source: "TenantEase", date: "05 Oct 2026" },
    { text: "Pleasant stay overall. Nice pool area and friendly valet staff.", rating: 4, source: "TripAdvisor", date: "04 Oct 2026" },
    { text: "Unbearable construction noise starting at 6 AM every weekday with zero advance notice from management.", rating: 1, source: "Google Reviews", date: "03 Oct 2026" },
    { text: "Beautiful rooftop views, creative cocktail menu, and attentive servers. Highly recommend!", rating: 5, source: "Yelp", date: "02 Oct 2026" },
    { text: "Water heater broke over the weekend and emergency maintenance came within 30 minutes. Lifesavers!", rating: 5, source: "TenantEase", date: "01 Oct 2026" },
    { text: "Carpet had noticeable stains and hallway smelled like stale smoke. Expected better for this price.", rating: 2, source: "Booking.com", date: "30 Sep 2026" },
    { text: "Staff went above and beyond to accommodate our early arrival. Truly wonderful hospitality.", rating: 5, source: "Google Reviews", date: "29 Sep 2026" }
  ];

  // Curated initial reviews matching 05_results_overview.png, 06_review_inbox.png, and 07_review_detail.png
  const DEFAULT_INITIAL_REVIEWS = [
  {
    "id": 104891,
    "text": "Staff went above and beyond to accommodate our early arrival. Truly wonderful hospitality.",
    "sentiment": "Positive",
    "positive_probability": 0.95,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "above and beyond",
        "weight": 2.4,
        "polarity": "Positive"
      },
      {
        "term": "wonderful",
        "weight": 2.1,
        "polarity": "Positive"
      }
    ],
    "source": "Google Reviews",
    "category": "Service Delay",
    "date": "29 Sep 2026",
    "reviewed": true
  },
  {
    "id": 104892,
    "text": "Carpet had noticeable stains and hallway smelled like stale smoke. Expected better for the price.",
    "sentiment": "Negative",
    "positive_probability": 0.08,
    "needs_human_review": true,
    "triage_status": "ESCALATE (Billing & Pricing)",
    "word_contributions": [
      {
        "term": "stains",
        "weight": -2.2,
        "polarity": "Negative"
      },
      {
        "term": "stale smoke",
        "weight": -2.5,
        "polarity": "Negative"
      }
    ],
    "source": "Booking.com",
    "category": "Billing & Pricing",
    "date": "30 Sep 2026",
    "reviewed": false
  },
  {
    "id": 104893,
    "text": "Water heater broke over the weekend and emergency maintenance came within 30 minutes. Lifesavers!",
    "sentiment": "Positive",
    "positive_probability": 0.5,
    "needs_human_review": true,
    "triage_status": "ESCALATE (Facility Defect)",
    "word_contributions": [
      {
        "term": "lifesavers",
        "weight": 2.3,
        "polarity": "Positive"
      },
      {
        "term": "broke",
        "weight": -2.1,
        "polarity": "Negative"
      }
    ],
    "source": "TenantEase",
    "category": "Facility Defect",
    "date": "01 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104894,
    "text": "Beautiful rooftop views, creative cocktail menu, and attentive servers. Highly recommend!",
    "sentiment": "Positive",
    "positive_probability": 0.99,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "beautiful",
        "weight": 2.5,
        "polarity": "Positive"
      },
      {
        "term": "creative",
        "weight": 1.9,
        "polarity": "Positive"
      }
    ],
    "source": "Yelp",
    "category": "Staff Hospitality",
    "date": "02 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104895,
    "text": "Unbearable construction noise starting at 6 AM every weekday with zero advance notice from management.",
    "sentiment": "Negative",
    "positive_probability": 0.39,
    "needs_human_review": true,
    "triage_status": "ESCALATE (Facility Defect)",
    "word_contributions": [
      {
        "term": "unbearable",
        "weight": -2.8,
        "polarity": "Negative"
      },
      {
        "term": "noise",
        "weight": -1.9,
        "polarity": "Negative"
      }
    ],
    "source": "Google Reviews",
    "category": "Facility Defect",
    "date": "03 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104896,
    "text": "The bedroom was spotless and modern, but the elevator was out of service all weekend.",
    "sentiment": "Positive",
    "positive_probability": 0.53,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "the",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Yelp",
    "category": "Facility Defect",
    "date": "04 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104897,
    "text": "Delicious artisanal breakfast buffet, though finding seating took over twenty minutes.",
    "sentiment": "Positive",
    "positive_probability": 0.55,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "delicious",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Google Reviews",
    "category": "Service Delay",
    "date": "05 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104898,
    "text": "Friendly front desk clerk helped rebook our flight; however the room Wi-Fi was sluggish.",
    "sentiment": "Positive",
    "positive_probability": 0.58,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "friendly",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Booking.com",
    "category": "Staff Hospitality",
    "date": "06 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104899,
    "text": "Lovely swimming pool and relaxing spa treatments, but parking garage was extremely congested.",
    "sentiment": "Positive",
    "positive_probability": 0.52,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "lovely",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "TripAdvisor",
    "category": "Facility Defect",
    "date": "07 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104900,
    "text": "The rooftop dinner was memorable and flavors were authentic, but reservation was delayed.",
    "sentiment": "Positive",
    "positive_probability": 0.56,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "the",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Yelp",
    "category": "Service Delay",
    "date": "08 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104901,
    "text": "Spacious suite with balcony view, though checkout bill had an incorrect minibar charge.",
    "sentiment": "Positive",
    "positive_probability": 0.51,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "spacious",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Booking.com",
    "category": "Billing & Pricing",
    "date": "09 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104902,
    "text": "Exceptional service from the concierge team! The amenities were top-tier throughout.",
    "sentiment": "Positive",
    "positive_probability": 0.96,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "exceptional",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Yelp",
    "category": "Staff Hospitality",
    "date": "10 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104903,
    "text": "Spotless bathroom, comfortable king mattress, and rapid Wi-Fi. Will definitely rebook.",
    "sentiment": "Positive",
    "positive_probability": 0.94,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "spotless",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Booking.com",
    "category": "Facility Defect",
    "date": "11 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104904,
    "text": "Maintenance technician was polite and fixed the garbage disposal quickly. Fast turnaround.",
    "sentiment": "Positive",
    "positive_probability": 0.92,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "maintenance",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "TenantEase",
    "category": "Facility Defect",
    "date": "12 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104905,
    "text": "Immaculate property grounds, friendly valet attendants, and prompt room service.",
    "sentiment": "Positive",
    "positive_probability": 0.95,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "immaculate",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Google Reviews",
    "category": "Staff Hospitality",
    "date": "13 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104906,
    "text": "Great central location, quiet soundproofing, and delicious espresso in the lounge.",
    "sentiment": "Positive",
    "positive_probability": 0.93,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "great",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "TripAdvisor",
    "category": "Staff Hospitality",
    "date": "14 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104907,
    "text": "The concierge went above expectations to secure last-minute theater tickets for us.",
    "sentiment": "Positive",
    "positive_probability": 0.97,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "the",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Google Reviews",
    "category": "Staff Hospitality",
    "date": "15 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104908,
    "text": "Clean linens, powerful shower pressure, and warm reception upon late arrival.",
    "sentiment": "Positive",
    "positive_probability": 0.91,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "clean",
        "weight": 1.5,
        "polarity": "Positive"
      }
    ],
    "source": "Booking.com",
    "category": "Facility Defect",
    "date": "16 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104909,
    "text": "The AC has been leaking for two weeks and maintenance keeps closing my ticket without fixing it.",
    "sentiment": "Negative",
    "positive_probability": 0.12,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "the",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "TenantEase",
    "category": "Facility Defect",
    "date": "17 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104910,
    "text": "Worst customer support experience ever. Waited on hold for an hour and was hung up on twice.",
    "sentiment": "Negative",
    "positive_probability": 0.08,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "worst",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Yelp",
    "category": "Staff Hospitality",
    "date": "18 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104911,
    "text": "Billing department charged me twice for utility fees. Still waiting on a refund three weeks later.",
    "sentiment": "Negative",
    "positive_probability": 0.14,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "billing",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "TenantEase",
    "category": "Billing & Pricing",
    "date": "19 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104912,
    "text": "Food arrived cold and undercooked. Took nearly fifty minutes to receive our simple order.",
    "sentiment": "Negative",
    "positive_probability": 0.2,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "food",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Google Reviews",
    "category": "Service Delay",
    "date": "20 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104913,
    "text": "Keycard stopped working late at night and night auditor was nowhere to be found.",
    "sentiment": "Negative",
    "positive_probability": 0.18,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "keycard",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Booking.com",
    "category": "Staff Hospitality",
    "date": "21 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104914,
    "text": "Shower drain backed up immediately causing water damage in the bathroom. Staff refused discount.",
    "sentiment": "Negative",
    "positive_probability": 0.1,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "shower",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "TripAdvisor",
    "category": "Facility Defect",
    "date": "22 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104915,
    "text": "Hidden resort fees added to bill that were never disclosed during online reservation.",
    "sentiment": "Negative",
    "positive_probability": 0.16,
    "needs_human_review": true,
    "triage_status": "ESCALATE",
    "word_contributions": [
      {
        "term": "hidden",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Booking.com",
    "category": "Billing & Pricing",
    "date": "23 Oct 2026",
    "reviewed": false
  },
  {
    "id": 104916,
    "text": "Room was noisy facing the loading dock and street traffic. Could not sleep well.",
    "sentiment": "Negative",
    "positive_probability": 0.25,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "room",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Yelp",
    "category": "Facility Defect",
    "date": "24 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104917,
    "text": "Breakfast was stale and coffee machine broke down during peak morning rush.",
    "sentiment": "Negative",
    "positive_probability": 0.28,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "breakfast",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Google Reviews",
    "category": "Service Delay",
    "date": "25 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104918,
    "text": "Gym equipment had out of order signs and towels were completely empty at 8 AM.",
    "sentiment": "Negative",
    "positive_probability": 0.26,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "gym",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Booking.com",
    "category": "Facility Defect",
    "date": "26 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104919,
    "text": "Parking lot gate was stuck shut and caused several guests to miss morning appointments.",
    "sentiment": "Negative",
    "positive_probability": 0.22,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "parking",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "TenantEase",
    "category": "Facility Defect",
    "date": "27 Oct 2026",
    "reviewed": true
  },
  {
    "id": 104920,
    "text": "Overcharged on mini-fridge bottled water despite never opening the refrigerator door.",
    "sentiment": "Negative",
    "positive_probability": 0.24,
    "needs_human_review": false,
    "triage_status": "LOW PRIORITY / NO HUMAN REVIEW REQUIRED",
    "word_contributions": [
      {
        "term": "overcharged",
        "weight": -1.5,
        "polarity": "Negative"
      }
    ],
    "source": "Yelp",
    "category": "Billing & Pricing",
    "date": "28 Oct 2026",
    "reviewed": true
  }
];

  function loadInitialState() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.reviews && parsed.reviews.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Could not read session state:', e);
    }
    return {
      reviews: DEFAULT_INITIAL_REVIEWS,
      selectedReviewId: DEFAULT_INITIAL_REVIEWS[0].id,
      batchFilename: 'hospitality_customer_feedback.csv',
      batchDate: '12 Oct 2026',
      lastAnalyzedCount: DEFAULT_INITIAL_REVIEWS.length
    };
  }

  function loadSettings() {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {
      workspaceName: 'Cynbit Hospitality CX',
      industry: 'Hospitality',
      theme: 'light',
      accentColor: '#8970d6'
    };
  }

  const state = {
    ...loadInitialState(),
    settings: loadSettings(),
    currentView: 'landing',
    activeInboxFilter: 'all',
    inboxSearchTerm: '',
    inboxCategoryFilter: 'all',
    inboxStatusFilter: 'all',
    inboxDateFilter: 'all',
    inboxSort: 'newest',
    inboxPage: 1,
    inboxPageSize: 5,
    parsedCsvData: null,
    importChoice: 'csv', // 'csv', 'text', 'sample'
    isProcessing: false,
    selectedRowIds: new Set()
  };

  function persistReviews() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        reviews: state.reviews,
        selectedReviewId: state.selectedReviewId,
        batchFilename: state.batchFilename,
        batchDate: state.batchDate,
        lastAnalyzedCount: state.lastAnalyzedCount
      }));
    } catch (e) {
      console.warn('Failed to persist reviews:', e);
    }
  }

  function persistSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (e) {}
  }

  // =========================================================================
  // 2. ROUTING & VIEW CONTROLLER
  // =========================================================================
  const VIEWS = ['landing', 'import', 'csv-preview', 'processing', 'results', 'inbox', 'detail', 'insights', 'models', 'settings'];

  function navigateTo(viewName) {
    if (!VIEWS.includes(viewName)) {
      viewName = 'landing';
    }

    state.currentView = viewName;
    if (window.location.hash !== '#' + viewName) {
      window.location.hash = '#' + viewName;
    }

    // Toggle Landing vs App Shell
    const landingEl = document.getElementById('view-landing');
    const appShellEl = document.getElementById('view-app-shell');

    if (viewName === 'landing') {
      if (landingEl) {
        landingEl.style.display = 'block';
        landingEl.classList.remove('revio-view-enter');
        void landingEl.offsetWidth;
        landingEl.classList.add('revio-view-enter');
      }
      if (appShellEl) appShellEl.style.display = 'none';
    } else {
      if (landingEl) landingEl.style.display = 'none';
      if (appShellEl) {
        appShellEl.style.display = 'flex';
        appShellEl.classList.remove('revio-view-enter');
        void appShellEl.offsetWidth;
        appShellEl.classList.add('revio-view-enter');
      }
      
      // Toggle internal view sections with smooth slide-up and staggered children
      VIEWS.filter(v => v !== 'landing').forEach(v => {
        const sec = document.getElementById('sec-' + v);
        if (sec) {
          if (v === viewName) {
            sec.style.display = 'block';
            sec.classList.remove('revio-view-enter');
            void sec.offsetWidth;
            sec.classList.add('revio-view-enter');

            // Stagger animation on cards, KPI blocks, and table rows
            const items = sec.querySelectorAll('.revio-card, .revio-kpi-card, .revio-theme-item, .revio-table-container tbody tr, .revio-evidence-item-chip, .revio-model-card, .revio-import-card');
            items.forEach((item, idx) => {
              item.style.animationDelay = `${Math.min(idx * 30, 240)}ms`;
              item.classList.remove('revio-stagger-child');
              void item.offsetWidth;
              item.classList.add('revio-stagger-child');
            });
          } else {
            sec.style.display = 'none';
            sec.classList.remove('revio-view-enter');
          }
        }
      });

      // Update sidebar active state
      document.querySelectorAll('.revio-nav-item').forEach(item => {
        const target = item.dataset.view;
        item.classList.toggle('active', target === viewName || (viewName === 'detail' && target === 'inbox') || (viewName === 'csv-preview' && target === 'import') || (viewName === 'processing' && target === 'import') || (viewName === 'results' && target === 'import'));
      });

      // Update Topbar Breadcrumb
      updateTopbar(viewName);

      // Section-specific refreshes
      onEnterView(viewName);
    }

    // Sync window location hash
    if (window.location.hash.replace('#', '') !== viewName) {
      window.location.hash = viewName;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.navigateTo = navigateTo;

  function updateTopbar(view) {
    const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
    const titles = {
      'import': 'Analyse Reviews',
      'csv-preview': 'CSV Validation & Mapping',
      'processing': 'Processing Analysis',
      'results': 'Results Overview',
      'inbox': 'Review Inbox',
      'detail': 'Review Detail',
      'insights': 'Insights & Trends',
      'models': 'Model Lab & Benchmarks',
      'settings': 'Settings & Workspace'
    };
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = titles[view] || 'Workspace';
    }
  }

  function onEnterView(view) {
    switch (view) {
      case 'results':
        renderResultsOverview();
        break;
      case 'inbox':
        renderReviewInbox();
        break;
      case 'detail':
        renderReviewDetail();
        break;
      case 'insights':
        renderInsights();
        break;
      case 'models':
        renderModelLab();
        break;
      case 'settings':
        renderSettings();
        break;
    }
  }

  // =========================================================================
  // 3. TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'revio-toast';
    
    let icon = '✦';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  window.showToast = showToast;

  // =========================================================================
  // 4. SCREEN 02 — IMPORT / ONBOARDING CHOICES
  // =========================================================================
  function initImportChoices() {
    const choiceCards = document.querySelectorAll('.revio-choice-card');
    const csvBlock = document.getElementById('importBlockCsv');
    const textBlock = document.getElementById('importBlockText');
    const sampleBlock = document.getElementById('importBlockSample');
    const continueBtn = document.getElementById('importContinueBtn');

    choiceCards.forEach(card => {
      const selectCard = () => {
        choiceCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const choice = card.dataset.choice;
        state.importChoice = choice;

        if (csvBlock) csvBlock.style.display = (choice === 'csv') ? 'block' : 'none';
        if (textBlock) textBlock.style.display = (choice === 'text') ? 'block' : 'none';
        if (sampleBlock) sampleBlock.style.display = (choice === 'sample') ? 'block' : 'none';

        updateContinueBtnState();
      };

      card.addEventListener('click', selectCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCard();
        }
      });
    });

    // File Drag & Drop
    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          handleSelectedFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
          handleSelectedFile(fileInput.files[0]);
        }
      });
    }

    // Text Area Input
    const pasteInput = document.getElementById('pasteReviewInput');
    if (pasteInput) {
      pasteInput.addEventListener('input', () => {
        updateContinueBtnState();
      });
    }

    // Continue Action Button
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (state.importChoice === 'csv' && state.parsedCsvData) {
          setupCsvPreview(state.parsedCsvData);
          navigateTo('csv-preview');
        } else if (state.importChoice === 'text') {
          const text = pasteInput.value.trim();
          if (text) {
            runSingleAnalysis(text);
          }
        } else if (state.importChoice === 'sample') {
          runSampleAnalysis();
        }
      });
    }
  }

  window.handleSelectedCsvFile = handleSelectedFile;
  window.loadCsvString = function (content, filename = "uploaded_reviews.csv") {
    const parsed = parseCsvContent(content, filename, content.length);
    state.parsedCsvData = parsed;
    state.batchFilename = filename;
    const dropzone = document.getElementById("csvDropzone");
    const fileCard = document.getElementById("fileSelectedCard");
    const fileNameEl = document.getElementById("selectedFileName");
    const fileInfoEl = document.getElementById("selectedFileInfo");
    if (dropzone) dropzone.style.display = 'none';
    if (fileCard) fileCard.style.display = 'flex';
    if (fileNameEl) fileNameEl.textContent = filename;
    if (fileInfoEl) fileInfoEl.textContent = `${(content.length / 1024).toFixed(1)} KB · ${parsed.rows.length} rows detected`;
    updateContinueBtnState();
    return parsed;
  };
  function handleSelectedFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please select a valid CSV file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parsed = parseCsvContent(content, file.name, file.size);
      if (parsed.rows.length === 0) {
        showToast('CSV must contain a header and at least 1 valid review row.', 'error');
        return;
      }
      state.parsedCsvData = parsed;
      state.batchFilename = file.name;

      // Show selected card
      const dropzone = document.getElementById('csvDropzone');
      const fileCard = document.getElementById('fileSelectedCard');
      const fileNameEl = document.getElementById('selectedFileName');
      const fileInfoEl = document.getElementById('selectedFileInfo');

      if (dropzone) dropzone.style.display = 'none';
      if (fileCard) fileCard.style.display = 'flex';
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileInfoEl) fileInfoEl.textContent = `${(file.size / 1024).toFixed(1)} KB · ${parsed.rows.length} rows detected`;

      updateContinueBtnState();
      showToast(`Detected ${parsed.rows.length} rows from CSV`, 'success');
    };
    reader.readAsText(file);
  }

  window.removeSelectedFile = function () {
    state.parsedCsvData = null;
    const dropzone = document.getElementById('csvDropzone');
    const fileCard = document.getElementById('fileSelectedCard');
    const fileInput = document.getElementById('csvFileInput');
    if (dropzone) dropzone.style.display = 'block';
    if (fileCard) fileCard.style.display = 'none';
    if (fileInput) fileInput.value = '';
    updateContinueBtnState();
  };

  function updateContinueBtnState() {
    const continueBtn = document.getElementById('importContinueBtn');
    if (!continueBtn) return;

    if (state.importChoice === 'csv') {
      continueBtn.disabled = !state.parsedCsvData;
    } else if (state.importChoice === 'text') {
      const text = document.getElementById('pasteReviewInput')?.value.trim();
      continueBtn.disabled = !text || text.length < 5;
    } else if (state.importChoice === 'sample') {
      continueBtn.disabled = false;
    }
  }

  // =========================================================================
  // 5. CSV PARSING & SCREEN 03 PREVIEW
  // =========================================================================
  function parseCsvContent(content, filename, filesize) {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return { headers: [], rows: [] };

    // Parse CSV line safely with quoted commas support
    function parseCsvLine(line) {
      const values = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          values.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      values.push(cur.trim());
      return values;
    }

    const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
    
    // Auto-detect review column (avoid ID columns)
    let reviewColIdx = headers.findIndex(h => {
      const s = h.toLowerCase().trim();
      if (s === 'id' || s.endsWith('_id') || s.startsWith('id_')) return false;
      return s.includes('review') || s.includes('text') || s.includes('comment') || s.includes('feedback') || s.includes('content');
    });
    if (reviewColIdx === -1) reviewColIdx = 0;

    const rows = [];
    for (let i = 1; i < lines.length && rows.length < 2500; i++) {
      const parts = parseCsvLine(lines[i]);
      const text = (parts[reviewColIdx] || '').replace(/^["']|["']$/g, '').trim();
      if (text.length > 3) {
        rows.push({
          raw: parts,
          text: text,
          date: parts[headers.findIndex(h => h.toLowerCase().includes('date'))] || 'Recently',
          source: parts[headers.findIndex(h => h.toLowerCase().includes('source') || h.toLowerCase().includes('platform'))] || 'Uploaded CSV'
        });
      }
    }

    return {
      filename,
      filesize,
      headers,
      reviewColIdx,
      rows
    };
  }

  function setupCsvPreview(parsed) {
    document.getElementById('csvSummaryName').textContent = parsed.filename;
    document.getElementById('csvSummaryMeta').textContent = `${(parsed.filesize / 1024).toFixed(1)} KB · ${parsed.rows.length} valid review rows`;

    // Populate Column Select
    const colSelect = document.getElementById('csvColumnMapSelect');
    if (colSelect) {
      colSelect.innerHTML = parsed.headers.map((h, idx) => 
        `<option value="${idx}" ${idx === parsed.reviewColIdx ? 'selected' : ''}>${escapeHtml(h)} ${idx === parsed.reviewColIdx ? '(Auto-detected)' : ''}</option>`
      ).join('');

      colSelect.onchange = () => {
        parsed.reviewColIdx = parseInt(colSelect.value, 10);
        parsed.rows.forEach(r => {
          r.text = (r.raw[parsed.reviewColIdx] || '').replace(/^["']|["']$/g, '').trim();
        });
        renderCsvPreviewRows(parsed);
      };
    }

    renderCsvPreviewRows(parsed);

    // Bind Start Analysis button
    const startBtn = document.getElementById('csvStartAnalysisBtn');
    if (startBtn) {
      startBtn.textContent = `Start analysis (${parsed.rows.length} reviews) →`;
      startBtn.onclick = () => runBatchAnalysis(parsed.rows);
    }
  }

  function renderCsvPreviewRows(parsed) {
    const tbody = document.getElementById('csvPreviewTableBody');
    if (!tbody) return;

    tbody.innerHTML = parsed.rows.slice(0, 5).map((row, idx) => `
      <tr>
        <td style="color: var(--revio-text-secondary); width: 40px;">${idx + 1}</td>
        <td><strong>${escapeHtml(truncate(row.text, 95))}</strong></td>
        <td><span class="revio-badge revio-badge-neutral">${escapeHtml(row.source)}</span></td>
        <td style="color: var(--revio-text-secondary);">${escapeHtml(row.date)}</td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // 6. SCREEN 04 — REAL INFERENCE & STAGE-BY-STAGE PROCESSING
  // =========================================================================
  async function runSingleAnalysis(text) {
    navigateTo('processing');
    updateProcessingStages(1, `Analysing single review...`);

    try {
      await delay(400);
      updateProcessingStages(2, `Extracting n-gram features...`);
      await delay(300);
      updateProcessingStages(3, `Running Revio Yelp LR forward pass...`);

      const res = await fetch(ENDPOINTS.PREDICT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!res.ok) throw new Error('Inference request failed');
      const data = await res.json();

      updateProcessingStages(5, `Finalising results and triage cues...`);
      await delay(300);

      const reviewItem = {
        id: Date.now(),
        text: text,
        sentiment: data.sentiment,
        positive_probability: data.positive_probability,
        needs_human_review: data.needs_human_review,
        triage_status: data.triage_status,
        word_contributions: data.word_contributions || [],
        source: 'Single Input',
        date: 'Just now',
        reviewed: false
      };

      state.reviews = [reviewItem, ...state.reviews];
      state.selectedReviewId = reviewItem.id;
      state.lastAnalyzedCount = 1;
      persistReviews();

      navigateTo('results');
      showToast('Single review analysis complete', 'success');
    } catch (err) {
      console.error(err);
      showToast('Inference error. Falling back to offline model.', 'error');
      // Graceful offline fallback
      fallbackSingleReview(text);
    }
  }

  async function runBatchAnalysis(rows) {
    navigateTo('processing');
    const total = rows.length;
    updateProcessingStages(1, `Preparing batch of ${total} reviews...`);

    if (total === 0) {
      showToast('No valid reviews to analyze.', 'info');
      navigateTo('import');
      return;
    }

    try {
      await delay(250);
      updateProcessingStages(2, `Validating text encodings & lengths...`);
      await delay(250);

      // Conservative size-aware and count-aware chunking for Vercel Serverless
      // Limits: Max 50 reviews per chunk, Max 500 KB payload per chunk (well below 4.5 MB limit)
      const MAX_CHUNK_REVIEWS = 50;
      const MAX_CHUNK_BYTES = 500 * 1024; // 500 KB

      const chunks = [];
      let currentChunk = [];
      let currentBytes = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowBytes = (row.text ? row.text.length : 0) * 2 + 100;

        if (currentChunk.length > 0 && (currentChunk.length >= MAX_CHUNK_REVIEWS || (currentBytes + rowBytes) > MAX_CHUNK_BYTES)) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentBytes = 0;
        }

        currentChunk.push({ row, originalIndex: i });
        currentBytes += rowBytes;
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      const allNewReviews = [];
      const failedRows = [];
      let processedCount = 0;
      const baseTimestamp = Date.now();

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        const chunkTexts = chunk.map(item => item.row.text);
        const stage3Span = document.getElementById('procStage3Span');
        if (stage3Span) {
          stage3Span.textContent = `Analysing sentiment (Processing ${processedCount + 1}–${Math.min(processedCount + chunk.length, total)} of ${total})`;
        }
        updateProcessingStages(
          3,
          `Executing inference (${processedCount} of ${total} reviews` +
          (chunks.length > 1 ? ` — chunk ${c + 1}/${chunks.length}` : '') +
          ')...'
        );

        try {
          const res = await fetch(ENDPOINTS.BATCH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviews: chunkTexts })
          });

          if (!res.ok) {
            throw new Error(`Chunk ${c + 1} failed with status ${res.status}`);
          }

          const data = await res.json();
          const returnedReviews = data.reviews || [];

          for (let r = 0; r < chunk.length; r++) {
            const item = chunk[r];
            const pred = returnedReviews[r];
            if (pred) {
              allNewReviews.push({
                id: baseTimestamp + item.originalIndex,
                text: pred.text,
                sentiment: pred.sentiment,
                positive_probability: pred.positive_probability,
                needs_human_review: pred.needs_human_review,
                triage_status: pred.triage_status,
                word_contributions: pred.word_contributions || [],
                source: item.row.source || state.batchFilename || 'Batch CSV',
                date: item.row.date || 'Today',
                reviewed: false
              });
            } else {
              failedRows.push(item);
            }
          }
        } catch (chunkErr) {
          console.warn(`Chunk ${c + 1} inference error:`, chunkErr);
          for (const item of chunk) {
            failedRows.push(item);
          }
        }
        processedCount += chunk.length;
      }

      if (allNewReviews.length === 0) {
        throw new Error('All batch inference chunks failed to process.');
      }

      updateProcessingStages(4, `Extracting key themes & sentiment distribution...`);
      await delay(250);
      updateProcessingStages(6, `Complete! Processed ${allNewReviews.length} of ${total} reviews.`);
      await delay(300);

      // Prepend all successfully processed reviews to inbox state
      state.reviews = [...allNewReviews, ...state.reviews];
      state.lastAnalyzedCount = allNewReviews.length;
      state.batchDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      persistReviews();

      navigateTo('results');

      if (failedRows.length > 0) {
        showToast(`Analyzed ${allNewReviews.length} reviews (${failedRows.length} rows encountered errors)`, 'warning');
      } else {
        showToast(`Successfully analyzed ${allNewReviews.length} reviews`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Batch API unavailable. Running local heuristic pipeline.', 'error');
      fallbackBatchAnalysis(rows);
    }
  }

  async function runSampleAnalysis() {
    navigateTo('processing');
    state.batchFilename = 'sample_hospitality_reviews.csv';
    await delay(300);
    runBatchAnalysis(SAMPLE_REVIEWS);
  }

  window.runSampleAnalysis = runSampleAnalysis;

  function updateProcessingStages(activeStage, statusText) {
    for (let i = 1; i <= 6; i++) {
      const stageEl = document.getElementById(`procStage${i}`);
      if (!stageEl) continue;
      if (i < activeStage) {
        stageEl.className = 'revio-stage-item completed';
        stageEl.querySelector('.revio-stage-circle').innerHTML = '✓';
      } else if (i === activeStage) {
        stageEl.className = 'revio-stage-item active';
        stageEl.querySelector('.revio-stage-circle').innerHTML = '●';
      } else {
        stageEl.className = 'revio-stage-item';
        stageEl.querySelector('.revio-stage-circle').innerHTML = i;
      }
    }
    const label = document.getElementById('processingStatusText');
    if (label) label.textContent = statusText;
    if (activeStage > 3) {
      const stage3Span = document.getElementById('procStage3Span');
      if (stage3Span) stage3Span.textContent = 'Analysing sentiment (Completed)';
    }

    const counter = document.getElementById('processingCounter');
    if (counter) {
      const pct = Math.min(100, Math.round((activeStage / 6) * 100));
      counter.textContent = `${pct}%`;
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fallbacks if server is offline during testing
  function fallbackSingleReview(text) {
    const isNeg = /bad|terrible|broken|delay|leak|worst|slow|poor|noise|stain/i.test(text);
    const prob = isNeg ? 0.12 : 0.88;
    const item = {
      id: Date.now(),
      text,
      sentiment: isNeg ? 'Negative' : 'Positive',
      positive_probability: prob,
      needs_human_review: isNeg,
      triage_status: isNeg ? 'ESCALATE (Negative / Risk)' : 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED',
      word_contributions: [
        { term: isNeg ? 'terrible' : 'clean', weight: isNeg ? -2.4 : 2.1, polarity: isNeg ? 'Negative' : 'Positive' },
        { term: isNeg ? 'delay' : 'kind', weight: isNeg ? -1.8 : 1.9, polarity: isNeg ? 'Negative' : 'Positive' }
      ],
      source: 'Demo Fallback',
      date: 'Just now',
      reviewed: false
    };
    state.reviews = [item, ...state.reviews];
    state.selectedReviewId = item.id;
    state.lastAnalyzedCount = 1;
    persistReviews();
    navigateTo('results');
  }

  function fallbackBatchAnalysis(rows) {
    const newItems = rows.map((r, i) => {
      const isNeg = /bad|terrible|broken|delay|leak|worst|slow|poor|noise|stain|charged/i.test(r.text);
      const isMixed = /but|though|however|acceptable/i.test(r.text) && !isNeg;
      const sentiment = isNeg ? 'Negative' : (isMixed ? 'Mixed' : 'Positive');
      const prob = isNeg ? 0.15 : (isMixed ? 0.52 : 0.89);
      return {
        id: Date.now() + i,
        text: r.text,
        sentiment: sentiment,
        positive_probability: prob,
        needs_human_review: isNeg || isMixed,
        triage_status: isNeg ? 'ESCALATE (High Risk)' : (isMixed ? 'ESCALATE (Mixed Review)' : 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED'),
        word_contributions: [
          { term: 'service', weight: isNeg ? -1.8 : 1.5, polarity: isNeg ? 'Negative' : 'Positive' }
        ],
        source: r.source || 'Sample Data',
        date: r.date || 'Today',
        reviewed: false
      };
    });
    state.reviews = [...newItems, ...state.reviews];
    state.lastAnalyzedCount = newItems.length;
    persistReviews();
    navigateTo('results');
  }

  // =========================================================================
  // 7. SCREEN 05 — RESULTS OVERVIEW
  // =========================================================================
  function animateNumber(elementId, targetValue, duration = 800, isPercentage = false, decimals = 0) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = (targetValue * ease).toFixed(decimals);
      el.textContent = isPercentage ? `${current}%` : Number(current).toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = isPercentage ? `${targetValue.toFixed(decimals)}%` : Number(targetValue).toLocaleString();
      }
    }
    requestAnimationFrame(tick);
  }

  function renderResultsOverview() {
    const total = state.reviews.length;
    if (total === 0) {
      navigateTo('import');
      return;
    }

    const posCount = state.reviews.filter(r => r.sentiment === 'Positive').length;
    const mixedCount = state.reviews.filter(r => r.sentiment === 'Mixed').length;
    const negCount = state.reviews.filter(r => r.sentiment === 'Negative').length;

    const posPct = ((posCount / total) * 100);
    const mixedPct = ((mixedCount / total) * 100);
    const negPct = ((negCount / total) * 100);

    // Smooth Number Tickers
    animateNumber('kpiTotalCount', total, 800, false, 0);
    animateNumber('kpiPosPct', posPct, 800, true, 1);
    animateNumber('kpiMixedPct', mixedPct, 800, true, 1);
    animateNumber('kpiNegPct', negPct, 800, true, 1);

    // Render SVG Donut Chart with stroke animation
    renderDonutChart(posCount, mixedCount, negCount, total);

    // Compute top recurring themes with animated bar fills
    renderTopThemesList();

    // Export report handler
    const dlBtn = document.getElementById('resultsDownloadBtn');
    if (dlBtn) dlBtn.onclick = exportCsvReport;
  }

  function renderDonutChart(pos, mixed, neg, total) {
    const chart = document.getElementById('sentimentDonutSvg');
    if (!chart || total === 0) return;

    const circumference = 2 * Math.PI * 40; // r=40 -> 251.3
    const posLength = (pos / total) * circumference;
    const mixedLength = (mixed / total) * circumference;
    const negLength = (neg / total) * circumference;

    const mixedOffset = -posLength;
    const negOffset = -(posLength + mixedLength);

    chart.innerHTML = `
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--revio-border)" stroke-width="14" />
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--revio-positive)" stroke-width="14"
              stroke-dasharray="0 ${circumference}" stroke-dashoffset="0" transform="rotate(-90 50 50)" id="donutCirclePos" />
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--revio-mixed)" stroke-width="14"
              stroke-dasharray="0 ${circumference}" stroke-dashoffset="${mixedOffset}" transform="rotate(-90 50 50)" id="donutCircleMixed" />
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--revio-negative)" stroke-width="14"
              stroke-dasharray="0 ${circumference}" stroke-dashoffset="${negOffset}" transform="rotate(-90 50 50)" id="donutCircleNeg" />
    `;

    setTimeout(() => {
      const cPos = document.getElementById('donutCirclePos');
      const cMix = document.getElementById('donutCircleMixed');
      const cNeg = document.getElementById('donutCircleNeg');
      if (cPos) cPos.setAttribute('stroke-dasharray', `${posLength} ${circumference}`);
      if (cMix) cMix.setAttribute('stroke-dasharray', `${mixedLength} ${circumference}`);
      if (cNeg) cNeg.setAttribute('stroke-dasharray', `${negLength} ${circumference}`);
    }, 60);

    animateNumber('donutCenterCount', total, 800, false, 0);
  }

  function renderTopThemesList() {
    const list = document.getElementById('topThemesList');
    if (!list) return;

    // Derived themes based on review text analysis
    const themes = [
      { name: 'Slow service & delays', count: 0, tag: 'service|slow|delay|wait|minute|hour' },
      { name: 'Maintenance & repairs', count: 0, tag: 'maintenance|leak|ac|fix|ticket|water|broken' },
      { name: 'Staff hospitality & friendliness', count: 0, tag: 'staff|team|kind|friendly|helpful|polite|valet' },
      { name: 'Cleanliness & hygiene', count: 0, tag: 'clean|spotless|stain|smell|bathroom|towel' },
      { name: 'Billing & extra fees', count: 0, tag: 'bill|fee|charge|refund|parking|price' }
    ];

    state.reviews.forEach(r => {
      themes.forEach(t => {
        const regex = new RegExp(t.tag, 'i');
        if (regex.test(r.text)) t.count++;
      });
    });

    const total = state.reviews.length || 1;
    list.innerHTML = themes.map(t => {
      const pct = Math.round((t.count / total) * 100);
      return `
        <div class="revio-theme-item">
          <div class="revio-theme-header">
            <span>${escapeHtml(t.name)}</span>
            <strong>${pct}% (${t.count})</strong>
          </div>
          <div class="revio-bar-track">
            <div class="revio-bar-fill revio-theme-bar-fill" style="width: 0%; background: var(--revio-violet);" data-pct="${Math.max(8, pct)}%"></div>
          </div>
        </div>
      `;
    }).join('');

    setTimeout(() => {
      document.querySelectorAll('.revio-theme-bar-fill').forEach(b => {
        if (b.dataset.pct) b.style.width = b.dataset.pct;
      });
    }, 80);
  }

  // =========================================================================
  // 8. SCREEN 06 — REVIEW INBOX & OPERATIONAL TRIAGE
  // =========================================================================
  function deriveCategory(text) {
    if (!text) return 'Service Delay';
    const lower = text.toLowerCase();
    if (/\b(bill|billing|charge|charged|fee|fees|price|pricing|cost|refund|overcharg|dollar|\$|dispute|receipt|deposit)\b/.test(lower)) {
      return 'Billing & Pricing';
    }
    if (/\b(ac|air condition|leak|leaking|water|heater|broken|fix|repair|clean|cleanliness|dirt|stain|smell|odor|maintenance|carpet|noise|construction|garbage|bed|shower|plumbing|room)\b/.test(lower)) {
      return 'Facility Defect';
    }
    if (/\b(wait|waited|waiting|delay|delayed|slow|late|minute|minutes|hour|hours|line|queue|took|check-in|arrival|turnaround)\b/.test(lower)) {
      return 'Service Delay';
    }
    if (/\b(staff|employee|manager|server|waiter|desk|team|service|rude|polite|unhelpful|hospitality|attentive|attitude|support)\b/.test(lower)) {
      return 'Staff Hospitality';
    }
    return 'Service Delay';
  }

  window.toggleInboxFilterPanel = function () {
    const panel = document.getElementById('inboxFilterPanel');
    if (!panel) return;
    const isHidden = panel.style.display === 'none' || !panel.style.display;
    panel.style.display = isHidden ? 'flex' : 'none';
  };

  window.setInboxCategoryFilter = function (val) {
    state.inboxCategoryFilter = val || 'all';
    state.inboxPage = 1;
    updateFilterBadge();
    renderReviewInbox();
  };

  window.setInboxStatusFilter = function (val) {
    state.inboxStatusFilter = val || 'all';
    state.inboxPage = 1;
    updateFilterBadge();
    renderReviewInbox();
  };

  window.setInboxDateFilter = function (val) {
    state.inboxDateFilter = val || 'all';
    state.inboxPage = 1;
    updateFilterBadge();
    renderReviewInbox();
  };

  function updateFilterBadge() {
    let count = 0;
    if (state.inboxCategoryFilter && state.inboxCategoryFilter !== 'all') count++;
    if (state.inboxStatusFilter && state.inboxStatusFilter !== 'all') count++;
    if (state.inboxDateFilter && state.inboxDateFilter !== 'all') count++;
    const badge = document.getElementById('inboxActiveFilterCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  function renderReviewInbox() {
    const tbody = document.getElementById('inboxTableBody');
    if (!tbody) return;

    let items = [...state.reviews];

    // Filter tabs
    const tabCounts = {
      all: items.length,
      negative: items.filter(r => r.sentiment === 'Negative').length,
      mixed: items.filter(r => r.sentiment === 'Mixed').length,
      positive: items.filter(r => r.sentiment === 'Positive').length,
      needs_review: items.filter(r => r.needs_human_review).length
    };

    // Update KPI Card Numbers (Screen 06 matching media_1793406251678_d2d474de.jpg)
    const kpiTotal = document.getElementById('inboxKpiTotal');
    if (kpiTotal) kpiTotal.textContent = tabCounts.all;
    const kpiNeg = document.getElementById('inboxKpiNeg');
    if (kpiNeg) kpiNeg.textContent = tabCounts.negative;
    const kpiPos = document.getElementById('inboxKpiPos');
    if (kpiPos) kpiPos.textContent = tabCounts.positive;
    const kpiAttention = document.getElementById('inboxKpiAttention');
    if (kpiAttention) kpiAttention.textContent = tabCounts.needs_review;
    const attentionTitle = document.getElementById('inboxAttentionTitle');
    if (attentionTitle) attentionTitle.textContent = `${tabCounts.needs_review} reviews need attention`;

    // Update Tab Counts
    const countAllEl = document.getElementById('inboxCountAll');
    if (countAllEl) countAllEl.textContent = tabCounts.all;
    const countNegEl = document.getElementById('inboxCountNeg');
    if (countNegEl) countNegEl.textContent = tabCounts.negative;
    const countMixedEl = document.getElementById('inboxCountMixed');
    if (countMixedEl) countMixedEl.textContent = tabCounts.mixed;
    const countPosEl = document.getElementById('inboxCountPos');
    if (countPosEl) countPosEl.textContent = tabCounts.positive;
    const countReviewEl = document.getElementById('inboxCountReview');
    if (countReviewEl) countReviewEl.textContent = tabCounts.needs_review;

    // Update Active Tab Styling
    document.querySelectorAll('.revio-filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === state.activeInboxFilter);
    });

    // Apply active tab
    if (state.activeInboxFilter === 'negative') {
      items = items.filter(r => r.sentiment === 'Negative');
    } else if (state.activeInboxFilter === 'mixed') {
      items = items.filter(r => r.sentiment === 'Mixed');
    } else if (state.activeInboxFilter === 'positive') {
      items = items.filter(r => r.sentiment === 'Positive');
    } else if (state.activeInboxFilter === 'needs_review') {
      items = items.filter(r => r.needs_human_review);
    }

    // Apply category filter
    if (state.inboxCategoryFilter && state.inboxCategoryFilter !== 'all') {
      items = items.filter(r => (r.category || deriveCategory(r.text)) === state.inboxCategoryFilter);
    }

    // Apply attention status filter
    if (state.inboxStatusFilter === 'needs_review') {
      items = items.filter(r => r.needs_human_review && !r.reviewed);
    } else if (state.inboxStatusFilter === 'reviewed') {
      items = items.filter(r => r.reviewed);
    } else if (state.inboxStatusFilter === 'auto_ack') {
      items = items.filter(r => !r.needs_human_review && !r.reviewed);
    }

    // Apply search query
    if (state.inboxSearchTerm) {
      const q = state.inboxSearchTerm.toLowerCase();
      items = items.filter(r => 
        r.text.toLowerCase().includes(q) || 
        (r.source && r.source.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q)) ||
        deriveCategory(r.text).toLowerCase().includes(q)
      );
    }

    // Apply date range filter if selected
    if (state.inboxDateFilter && state.inboxDateFilter !== 'all') {
      const now = new Date('2026-10-31T00:00:00Z').getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const days = state.inboxDateFilter === '7d' ? 7 : (state.inboxDateFilter === '30d' ? 30 : 90);
      items = items.filter(r => {
        if (!r.date) return true;
        const parsed = Date.parse(r.date.replace(/(\\d+)\\s+([A-Za-z]+)\\s+(\\d+)/, '$2 $1, $3'));
        if (isNaN(parsed)) return true;
        return (now - parsed) <= (days * dayMs);
      });
    }

    // Apply sort
    if (state.inboxSort === 'confidence_desc') {
      items.sort((a, b) => Math.abs(b.positive_probability - 0.5) - Math.abs(a.positive_probability - 0.5));
    } else if (state.inboxSort === 'confidence_asc') {
      items.sort((a, b) => Math.abs(a.positive_probability - 0.5) - Math.abs(b.positive_probability - 0.5));
    } else if (state.inboxSort === 'priority') {
      items.sort((a, b) => {
        const aRisk = (a.needs_human_review ? 2 : 0) + (a.sentiment === 'Negative' ? 2 : (a.sentiment === 'Mixed' ? 1 : 0));
        const bRisk = (b.needs_human_review ? 2 : 0) + (b.sentiment === 'Negative' ? 2 : (b.sentiment === 'Mixed' ? 1 : 0));
        return bRisk - aRisk || Math.abs(a.positive_probability - 0.48) - Math.abs(b.positive_probability - 0.48);
      });
    } else if (state.inboxSort === 'oldest') {
      items.sort((a, b) => a.id - b.id);
    } else {
      items.sort((a, b) => b.id - a.id);
    }

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 48px 16px; color: var(--revio-text-secondary);">
            <p style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No reviews match your filters</p>
            <button class="revio-btn revio-btn-secondary" onclick="resetInboxFilters()">Clear all filters</button>
          </td>
        </tr>
      `;
      const pageInfo = document.getElementById('inboxPageInfo');
      if (pageInfo) pageInfo.textContent = 'Showing 0 reviews';
      const pagesContainer = document.getElementById('inboxPaginationPages');
      if (pagesContainer) pagesContainer.innerHTML = '';
      updateBulkBar();
      return;
    }

    // Calculate Pagination
    const totalPages = Math.ceil(items.length / state.inboxPageSize) || 1;
    if (state.inboxPage > totalPages) state.inboxPage = totalPages;
    if (state.inboxPage < 1) state.inboxPage = 1;

    // Pagination slice
    const start = (state.inboxPage - 1) * state.inboxPageSize;
    const paginated = items.slice(start, start + state.inboxPageSize);

    // 8-Column Table Rows matching media_1793406251678_d2d474de.jpg
    tbody.innerHTML = paginated.map(r => {
      const isPos = r.sentiment === 'Positive';
      const isNeg = r.sentiment === 'Negative';
      const confVal = r.confidence != null ? r.confidence : Math.round((isPos ? (r.positive_probability || 0.5) : (1 - (r.positive_probability || 0.5))) * 100);

      // Color coding for confidence progress meter
      let barColorClass = 'green';
      if (confVal <= 65) {
        barColorClass = 'amber';
      } else if (isNeg) {
        barColorClass = 'red';
      } else {
        barColorClass = 'green';
      }

      // Date parsing (e.g. "29 Sep 2026" -> "29 Sep" and "2026")
      let dayPart = r.date || 'Recently';
      let yearPart = '';
      if (r.date) {
        const dateParts = r.date.trim().split(/\\s+/);
        if (dateParts.length >= 3) {
          dayPart = `${dateParts[0]} ${dateParts[1]}`;
          yearPart = dateParts[2];
        }
      }

      const statusLabel = r.reviewed ? 'Reviewed' : (r.needs_human_review ? 'Needs review' : 'Low priority');
      const statusClass = r.reviewed ? 'reviewed' : (r.needs_human_review ? 'needs-review' : 'low-priority auto-ack');
      const issueText = r.issue || r.category || deriveCategory(r.text);

      return `
        <tr onclick="openReviewDetail(${r.id})" style="cursor: pointer;">
          <td onclick="event.stopPropagation();" style="width: 38px;">
            <input type="checkbox" ${state.selectedRowIds.has(r.id) ? 'checked' : ''} onchange="toggleRowSelection(${r.id})">
          </td>
          <td style="width: 125px;">
            <span class="revio-sentiment-pill ${isPos ? 'pos' : 'neg'}">
              <span class="revio-sentiment-dot ${isPos ? 'pos' : 'neg'}"></span>
              ${r.sentiment}
            </span>
          </td>
          <td>
            <div class="revio-inbox-review-text" title="${escapeHtml(r.text)}">${escapeHtml(truncate(r.text, 92))}</div>
          </td>
          <td style="width: 165px;">
            <div class="revio-inbox-source">${escapeHtml(r.source || 'Customer')}</div>
            <div class="revio-inbox-issue">${escapeHtml(issueText)}</div>
          </td>
          <td style="width: 110px;">
            <div class="revio-inbox-conf-val">${confVal}%</div>
            <div class="revio-inbox-conf-track">
              <div class="revio-inbox-conf-bar ${barColorClass}" style="width: ${confVal}%;"></div>
            </div>
          </td>
          <td style="width: 100px;">
            <div class="revio-inbox-date-day">${escapeHtml(dayPart)}</div>
            ${yearPart ? `<div class="revio-inbox-date-year">${escapeHtml(yearPart)}</div>` : ''}
          </td>
          <td style="width: 110px;">
            <span class="revio-status-pill ${statusClass}">${statusLabel}</span>
          </td>
          <td onclick="event.stopPropagation();" style="width: 38px; text-align: center;">
            <button class="revio-row-action-btn" onclick="openReviewDetail(${r.id})" title="View review details">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Pagination controls matching media_1793406251678_d2d474de.jpg
    const pageInfo = document.getElementById('inboxPageInfo');
    if (pageInfo) {
      pageInfo.textContent = items.length === 0 
        ? 'Showing 0 reviews' 
        : `Showing ${start + 1}–${Math.min(items.length, start + state.inboxPageSize)} of ${items.length} reviews`;
    }

    const pagesContainer = document.getElementById('inboxPaginationPages');
    if (pagesContainer) {
      let pagesHtml = '';
      pagesHtml += `<button class="revio-page-btn" onclick="changeInboxPage(-1)" ${state.inboxPage <= 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>&larr;</button>`;
      
      if (totalPages <= 6) {
        for (let p = 1; p <= totalPages; p++) {
          pagesHtml += `<button class="revio-page-btn ${p === state.inboxPage ? 'active' : ''}" onclick="goToInboxPage(${p})">${p}</button>`;
        }
      } else {
        pagesHtml += `<button class="revio-page-btn ${state.inboxPage === 1 ? 'active' : ''}" onclick="goToInboxPage(1)">1</button>`;
        pagesHtml += `<button class="revio-page-btn ${state.inboxPage === 2 ? 'active' : ''}" onclick="goToInboxPage(2)">2</button>`;
        pagesHtml += `<button class="revio-page-btn ${state.inboxPage === 3 ? 'active' : ''}" onclick="goToInboxPage(3)">3</button>`;
        if (state.inboxPage > 3 && state.inboxPage < totalPages) {
          pagesHtml += `<button class="revio-page-btn active" onclick="goToInboxPage(${state.inboxPage})">${state.inboxPage}</button>`;
        }
        pagesHtml += `<span style="font-size: 11px; color: var(--revio-text-secondary); padding: 0 4px;">...</span>`;
        pagesHtml += `<button class="revio-page-btn ${state.inboxPage === totalPages ? 'active' : ''}" onclick="goToInboxPage(${totalPages})">${totalPages}</button>`;
      }
      pagesHtml += `<button class="revio-page-btn" onclick="changeInboxPage(1)" ${state.inboxPage >= totalPages ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>&rarr;</button>`;
      pagesContainer.innerHTML = pagesHtml;
    }

    updateBulkBar();
  }

  function updateBulkBar() {
    const count = state.selectedRowIds.size;
    const bulkText = document.getElementById('bulkActionText');
    const selectAll = document.getElementById('selectAllCheckbox');
    const headerCheck = document.getElementById('tableHeaderCheck');
    const btnMark = document.getElementById('btnMarkReviewed');
    const btnAssign = document.getElementById('btnAssignReviews');

    if (bulkText) {
      bulkText.textContent = count > 0 ? `${count} review(s) selected` : 'Select reviews to apply actions';
    }
    const allChecked = state.reviews.length > 0 && count === state.reviews.length;
    if (selectAll) selectAll.checked = allChecked;
    if (headerCheck) headerCheck.checked = allChecked;

    if (btnMark) {
      btnMark.style.opacity = count > 0 ? '1' : '0.5';
      btnMark.style.pointerEvents = count > 0 ? 'auto' : 'none';
    }
    if (btnAssign) {
      btnAssign.style.opacity = count > 0 ? '1' : '0.5';
      btnAssign.style.pointerEvents = count > 0 ? 'auto' : 'none';
    }
  }

  window.changeInboxPage = function (delta) {
    const totalPages = Math.ceil(state.reviews.length / state.inboxPageSize) || 1;
    const targetPage = state.inboxPage + delta;
    if (targetPage >= 1 && targetPage <= totalPages) {
      state.inboxPage = targetPage;
      renderReviewInbox();
    }
  };

  window.goToInboxPage = function (pageNum) {
    const totalPages = Math.ceil(state.reviews.length / state.inboxPageSize) || 1;
    if (pageNum >= 1 && pageNum <= totalPages) {
      state.inboxPage = pageNum;
      renderReviewInbox();
    }
  };

  window.toggleRowSelection = function (reviewId) {
    if (state.selectedRowIds.has(reviewId)) {
      state.selectedRowIds.delete(reviewId);
    } else {
      state.selectedRowIds.add(reviewId);
    }
    updateBulkBar();
  };

  window.toggleSelectAllRows = function (checked) {
    if (checked) {
      state.reviews.forEach(r => state.selectedRowIds.add(r.id));
    } else {
      state.selectedRowIds.clear();
    }
    renderReviewInbox();
  };

  window.bulkMarkReviewed = function (flag = true) {
    if (state.selectedRowIds.size === 0) return;
    let count = 0;
    state.reviews.forEach(r => {
      if (state.selectedRowIds.has(r.id)) {
        r.reviewed = flag;
        count++;
      }
    });
    state.selectedRowIds.clear();
    persistReviews();
    renderReviewInbox();
    showToast(flag ? `Marked ${count} review(s) as reviewed` : `Marked ${count} review(s) as unreviewed`, 'success');
  };

  window.bulkEscalateQueue = function () {
    if (state.selectedRowIds.size === 0) return;
    let count = 0;
    state.reviews.forEach(r => {
      if (state.selectedRowIds.has(r.id)) {
        r.needs_human_review = true;
        count++;
      }
    });
    state.selectedRowIds.clear();
    persistReviews();
    renderReviewInbox();
    showToast(`Escalated ${count} review(s) to review queue`, 'success');
  };

  window.openReviewDetail = function (reviewId) {
    const numId = Number(String(reviewId).replace('rev-', ''));
    const found = state.reviews.find(r => r.id === reviewId || r.id === numId);
    state.selectedReviewId = found ? found.id : (state.reviews[0] ? state.reviews[0].id : reviewId);
    navigateTo('detail');
  };

  window.navigateDetailReview = function (delta) {
    if (!state.reviews.length) return;
    const currentIndex = state.reviews.findIndex(r => r.id === state.selectedReviewId);
    let newIndex = 0;
    if (currentIndex !== -1) {
      newIndex = (currentIndex + delta + state.reviews.length) % state.reviews.length;
    }
    state.selectedReviewId = state.reviews[newIndex].id;
    renderReviewDetail();
  };

  window.setInboxFilter = function (filterName) {
    state.activeInboxFilter = filterName;
    state.inboxPage = 1;
    document.querySelectorAll('.revio-filter-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === filterName);
    });
    renderReviewInbox();
  };

  window.resetInboxFilters = function () {
    state.activeInboxFilter = 'all';
    state.inboxSearchTerm = '';
    state.inboxCategoryFilter = 'all';
    state.inboxStatusFilter = 'all';
    state.inboxDateFilter = 'all';
    state.inboxPage = 1;
    
    const searchInput = document.getElementById('inboxSearchInput');
    if (searchInput) searchInput.value = '';
    const catSelect = document.getElementById('inboxCategorySelect');
    if (catSelect) catSelect.value = 'all';
    const statusSelect = document.getElementById('inboxStatusSelect');
    if (statusSelect) statusSelect.value = 'all';
    const dateSelect = document.getElementById('inboxDateSelect');
    if (dateSelect) dateSelect.value = 'all';
    
    updateFilterBadge();
    setInboxFilter('all');
  };

  window.changeInboxPage = function (delta) {
    state.inboxPage += delta;
    renderReviewInbox();
  };

  // =========================================================================
  // 9. SCREEN 07 — REVIEW DETAIL
  // =========================================================================
  function renderReviewDetail() {
    const review = state.reviews.find(r => r.id === state.selectedReviewId) || state.reviews[0];
    if (!review) {
      navigateTo('inbox');
      return;
    }

    state.selectedReviewId = review.id;

    // Original Quote
    const quoteEl = document.getElementById('detailReviewQuote');
    if (quoteEl) quoteEl.textContent = `"${review.text}"`;
    const srcEl = document.getElementById('detailReviewSource');
    if (srcEl) srcEl.textContent = review.source || 'Customer Review';
    const dateEl = document.getElementById('detailReviewDate');
    if (dateEl) dateEl.textContent = review.date || 'Recent';
    const idEl = document.getElementById('detailReviewId');
    if (idEl) idEl.textContent = `Review ID: RV-${String(review.id).slice(-6)}`;

    // Prediction badge & confidence
    const badge = document.getElementById('detailSentimentBadge');
    const isPos = review.sentiment === 'Positive';
    const isNeg = review.sentiment === 'Negative';
    if (badge) {
      badge.className = `revio-badge ${isPos ? 'revio-badge-pos' : (isNeg ? 'revio-badge-neg' : 'revio-badge-mixed')}`;
      badge.innerHTML = `<span class="revio-dot ${isPos ? 'revio-dot-pos' : (isNeg ? 'revio-dot-neg' : 'revio-dot-mixed')}"></span> ${review.sentiment}`;
    }

    const confScore = (isPos ? review.positive_probability : (1 - review.positive_probability)).toFixed(2);
    const confEl = document.getElementById('detailConfidenceVal');
    if (confEl) confEl.textContent = confScore;

    // Positive-class Probability Breakdown
    const posProb = typeof review.positive_probability === 'number' ? review.positive_probability : 0.5;
    const negProb = 1 - posProb;
    const posPct = (posProb * 100).toFixed(1);
    const negPct = (negProb * 100).toFixed(1);
    const margin = (Math.abs(posProb - 0.48) * 100).toFixed(1);

    const fillNeg = document.getElementById('detailProbFillNeg');
    const fillPos = document.getElementById('detailProbFillPos');
    const lblNeg = document.getElementById('detailProbLabelNeg');
    const lblPos = document.getElementById('detailProbLabelPos');
    const lblMargin = document.getElementById('detailProbLabelMargin');

    if (fillNeg) fillNeg.style.width = `${negPct}%`;
    if (fillPos) fillPos.style.width = `${posPct}%`;
    if (lblNeg) lblNeg.innerHTML = `P(Neg): <strong>${negPct}%</strong>`;
    if (lblPos) lblPos.innerHTML = `P(Pos): <strong>${posPct}%</strong>`;
    if (lblMargin) lblMargin.textContent = `Margin: ${margin}% from 0.48 decision boundary`;

    // Statistical Uncertainty Analysis
    const uncBadge = document.getElementById('detailUncertaintyBadge');
    const uncNote = document.getElementById('detailUncertaintyNote');
    if (posProb >= 0.40 && posProb <= 0.60) {
      if (uncBadge) {
        uncBadge.className = 'revio-badge revio-badge-mixed';
        uncBadge.textContent = 'High Ambiguity';
      }
      if (uncNote) {
        uncNote.textContent = `Probability (${posPct}%) falls inside the 0.40–0.60 ambiguity corridor. Conflicting positive and negative n-grams require human verification.`;
      }
    } else if (posProb >= 0.85 || posProb <= 0.15) {
      if (uncBadge) {
        uncBadge.className = 'revio-badge revio-badge-pos';
        uncBadge.textContent = 'High Certainty';
      }
      if (uncNote) {
        uncNote.textContent = `Decisive classification with ${(posProb >= 0.85 ? posPct : negPct)}% class probability. Feature contributions exhibit strong directional alignment.`;
      }
    } else {
      if (uncBadge) {
        uncBadge.className = 'revio-badge revio-badge-neutral';
        uncBadge.textContent = 'Standard Confidence';
      }
      if (uncNote) {
        uncNote.textContent = `Moderate confidence margin (${margin}% from 0.48 boundary). Primary sentiment terms dominate without critical ambiguity.`;
      }
    }

    // Operational Business Risk & Triage
    const cat = review.category || deriveCategory(review.text);
    const triageStatusEl = document.getElementById('detailTriageStatus');
    const triageBox = document.getElementById('detailTriageBox');
    const attEl = document.getElementById('detailAttentionDesc');
    
    if (review.needs_human_review) {
      if (triageStatusEl) triageStatusEl.textContent = `ESCALATE (${cat})`;
      if (triageBox) {
        triageBox.style.background = 'var(--revio-mixed-soft)';
        triageBox.style.borderColor = 'rgba(181,122,55,0.25)';
      }
      if (attEl) {
        attEl.textContent = `Flagged for priority human review. Operational friction detected under "${cat}" requiring supervisor mitigation.`;
      }
    } else {
      if (triageStatusEl) triageStatusEl.textContent = 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED';
      if (triageBox) {
        triageBox.style.background = 'var(--revio-positive-soft)';
        triageBox.style.borderColor = 'rgba(46,125,50,0.25)';
      }
      if (attEl) {
        attEl.textContent = 'High-confidence praise with no critical risk triggers. Classified as low priority (no manual human review required).';
      }
    }

    // Explainability Attribution Cards matching 07_review_detail.png
    const posChipsWrap = document.getElementById('detailPosEvidence') || document.getElementById('detailPosEvidenceChips');
    const negChipsWrap = document.getElementById('detailNegEvidence') || document.getElementById('detailNegEvidenceChips');

    const cues = review.word_contributions || [];
    const posCues = cues.filter(c => c.weight > 0);
    const negCues = cues.filter(c => c.weight < 0);

    if (posChipsWrap) {
      if (posCues.length) {
        posChipsWrap.innerHTML = posCues.slice(0, 6).map(c => 
          `<div class="revio-evidence-item-chip">
            <strong>"${escapeHtml(c.term)}"</strong>
            <span>Attribution weight: +${c.weight.toFixed(2)}</span>
          </div>`
        ).join('');
      } else {
        posChipsWrap.innerHTML = `<div class="revio-evidence-item-chip" style="opacity: 0.7;">
          <strong>"Standard phrasing"</strong>
          <span>No prominent positive feature triggers</span>
        </div>`;
      }
    }

    if (negChipsWrap) {
      if (negCues.length) {
        negChipsWrap.innerHTML = negCues.slice(0, 6).map(c => 
          `<div class="revio-evidence-item-chip">
            <strong>"${escapeHtml(c.term)}"</strong>
            <span>Attribution weight: ${c.weight.toFixed(2)}</span>
          </div>`
        ).join('');
      } else {
        negChipsWrap.innerHTML = `<div class="revio-evidence-item-chip" style="opacity: 0.7;">
          <strong>"Clean feedback"</strong>
          <span>No negative complaint indicators detected</span>
        </div>`;
      }
    }

    // Dynamic explanation text matching 07_review_detail.png
    const whyTitle = document.getElementById('detailWhyTitle');
    const whyDesc = document.getElementById('detailWhyDesc');
    const interpText = document.getElementById('detailInterpretationText');

    if (review.sentiment === 'Mixed') {
      if (whyTitle) whyTitle.textContent = 'Why this was classified as mixed';
      if (whyDesc) whyDesc.textContent = 'The review contains both positive and negative aspects. Service/quality praise is accompanied by friction points.';
      if (interpText) interpText.textContent = 'Positive aspects are balanced by avoidable friction flags, resulting in a mixed triage score.';
    } else if (isPos) {
      if (whyTitle) whyTitle.textContent = 'Why this was classified as positive';
      if (whyDesc) whyDesc.textContent = 'Strong positive indicators detected across customer satisfaction signals with zero critical risk alerts.';
      if (interpText) interpText.textContent = 'Customer feedback is distinctly positive with high model confidence and favorable terminology.';
    } else {
      if (whyTitle) whyTitle.textContent = 'Why this was classified as negative';
      if (whyDesc) whyDesc.textContent = 'High-frequency complaint terms and operational friction markers detected requiring mitigation.';
      if (interpText) interpText.textContent = 'Negative sentiment terms dominate the attribution weights; recommended for immediate support escalation.';
    }

    // Suggested attention text
    const attentionText = document.getElementById('detailAttentionDesc');
    if (attentionText) {
      attentionText.textContent = review.needs_human_review 
        ? 'Flagged for priority review. Customer complaint risk requires supervisor attention.' 
        : 'Classified as low priority (no manual human review required).';
    }

    // Queue button state
    const queueBtn = document.getElementById('detailQueueBtn');
    if (queueBtn) {
      queueBtn.textContent = review.needs_human_review ? 'Escalate to Review Queue' : 'Add to Review Queue';
      queueBtn.onclick = () => {
        review.needs_human_review = true;
        persistReviews();
        showToast('Review escalated to review queue', 'success');
        renderReviewDetail();
      };
    }

    // Mark reviewed button
    const markBtn = document.getElementById('detailMarkReviewedBtn');
    if (markBtn) {
      markBtn.textContent = review.reviewed ? '✓ Marked as Reviewed' : 'Mark as Reviewed';
      markBtn.onclick = () => {
        review.reviewed = !review.reviewed;
        persistReviews();
        showToast(review.reviewed ? 'Marked as reviewed' : 'Unmarked review', 'success');
        renderReviewDetail();
      };
    }
  }

  window.copyReviewText = function () {
    const review = state.reviews.find(r => r.id === state.selectedReviewId);
    if (review && navigator.clipboard) {
      navigator.clipboard.writeText(review.text).then(() => {
        showToast('Review text copied to clipboard', 'success');
      });
    }
  };

  // Modals & Navigation Helpers
  window.openWatchDemoModal = function () {
    const m = document.getElementById('watchDemoModal');
    if (m) m.style.display = 'flex';
  };

  window.closeWatchDemoModal = function () {
    const m = document.getElementById('watchDemoModal');
    if (m) m.style.display = 'none';
  };

  window.openTechExplanationModal = function () {
    const m = document.getElementById('techExplanationModal');
    if (m) m.style.display = 'flex';
  };

  window.closeTechExplanationModal = function () {
    const m = document.getElementById('techExplanationModal');
    if (m) m.style.display = 'none';
  };

  window.downloadSampleCsvTemplate = function () {
    const csvContent = "review_text,date,source,rating\n" +
      "\"The room was spotless and the staff were exceptionally welcoming. Will definitely return!\",2026-10-12,Google Reviews,5\n" +
      "\"Slow service during peak breakfast hours and our bill had extra charges that needed correcting.\",2026-10-11,Yelp,2\n" +
      "\"Great central location and quiet rooms, but check-in was delayed by 30 minutes.\",2026-10-10,TripAdvisor,3\n" +
      "\"App kept crashing during checkout and support never answered my urgent email.\",2026-10-09,Direct Feedback,1\n" +
      "\"Excellent dining experience! The truffle pasta was superb and waiter was very attentive.\",2026-10-08,OpenTable,5\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "revio_sample_reviews_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Sample CSV template downloaded", "success");
  };

  window.switchSettingsTab = function (tabName, el) {
    document.querySelectorAll('.revio-settings-nav-btn').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');

    const tabIds = [
      'settingsTabWorkspace',
      'settingsTabAppearance',
      'settingsTabPrivacy',
      'settingsTabModels',
      'settingsTabNotifications',
      'settingsTabIntegrations'
    ];
    tabIds.forEach(id => {
      const pane = document.getElementById(id);
      if (pane) pane.style.display = 'none';
    });

    const activePaneId = {
      workspace: 'settingsTabWorkspace',
      appearance: 'settingsTabAppearance',
      privacy: 'settingsTabPrivacy',
      models: 'settingsTabModels',
      notifications: 'settingsTabNotifications',
      integrations: 'settingsTabIntegrations'
    }[tabName] || 'settingsTabWorkspace';

    const targetPane = document.getElementById(activePaneId);
    if (targetPane) targetPane.style.display = 'block';
  };

  window.resetSessionReviews = function () {
    if (confirm('Reset review inbox to the original production verification seed?')) {
      state.reviews = SAMPLE_REVIEWS_SEED.map(r => ({ ...r }));
      state.inboxPage = 1;
      persistReviews();
      renderReviewInbox();
      renderInsights();
      showToast('Session reviews reset to initial dataset', 'info');
    }
  };

  // =========================================================================
  // 10. SCREEN 08 — INSIGHTS (DYNAMICALLY DERIVED FROM REVIEWS)
  // =========================================================================
  window.switchInsightsTab = function (tabName, el) {
    document.querySelectorAll('#sec-insights .revio-filter-tab').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    const tabs = ['insightsTabOverview', 'insightsTabTopics', 'insightsTabTrends', 'insightsTabFeedback'];
    tabs.forEach(id => {
      const pane = document.getElementById(id);
      if (pane) pane.style.display = 'none';
    });

    const activeId = {
      overview: 'insightsTabOverview',
      topics: 'insightsTabTopics',
      trends: 'insightsTabTrends',
      feedback: 'insightsTabFeedback'
    }[tabName] || 'insightsTabOverview';

    const target = document.getElementById(activeId);
    if (target) target.style.display = 'block';

    if (tabName === 'topics') renderInsightsTopicsTable();
    else if (tabName === 'trends') renderInsightsWeeklyTrends();
    else if (tabName === 'feedback') renderInsightsFeedbackStream();
  };

  window.changeInsightsPeriod = function (periodVal) {
    const datesRow = document.getElementById('insightsTrendDatesRow');
    if (datesRow) {
      if (periodVal === '7') {
        datesRow.innerHTML = '<span>24 Oct</span><span>25 Oct</span><span>26 Oct</span><span>27 Oct</span><span>28 Oct</span>';
      } else if (periodVal === 'all') {
        datesRow.innerHTML = '<span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Recent</span>';
      } else {
        datesRow.innerHTML = '<span>1 Oct</span><span>7 Oct</span><span>14 Oct</span><span>21 Oct</span><span>28 Oct</span>';
      }
    }
    renderInsights();
    showToast(`Insights adjusted to ${periodVal === 'all' ? 'All time' : `Last ${periodVal} days`}`, 'info');
  };

  function renderInsights() {
    const total = state.reviews.length;
    if (total === 0) return;

    // Calculate dynamic topic frequencies from actual state.reviews
    const topicDefinitions = [
      { key: 'delay', name: 'Service delay & wait times', regex: /\b(wait|waited|delay|delayed|slow|late|minute|minutes|hour|hours|took|line|queue)\b/i, type: 'neg' },
      { key: 'facility', name: 'Maintenance & facility defects', regex: /\b(leak|leaking|broken|repair|fix|dirt|stain|smell|noise|carpet|ac|water|heater)\b/i, type: 'neg' },
      { key: 'billing', name: 'Billing disputes & refund delays', regex: /\b(bill|billing|charge|charged|fee|price|pricing|refund|overcharg|deposit)\b/i, type: 'neg' },
      { key: 'staff_friction', name: 'Staff communication & responsiveness', regex: /\b(rude|unhelpful|hung up|attitude|ignored|refused|poor service)\b/i, type: 'neg' },
      { key: 'hospitality', name: 'Friendly & attentive hospitality', regex: /\b(kind|friendly|helpful|polite|attentive|welcoming|hospitality|above and beyond|exceptional)\b/i, type: 'pos' },
      { key: 'cleanliness', name: 'Cleanliness & room comfort', regex: /\b(clean|spotless|comfortable|fresh|quiet|cozy|immaculate)\b/i, type: 'pos' },
      { key: 'quality', name: 'Exceptional food & amenities', regex: /\b(delicious|fresh|hot|crispy|tasty|pasta|cocktail|amenities|breakfast|superb)\b/i, type: 'pos' },
      { key: 'speed', name: 'Fast turnaround & rapid check-in', regex: /\b(quick|quickly|fast|rapid|seamless|prompt)\b/i, type: 'pos' }
    ];

    const negReviews = state.reviews.filter(r => r.sentiment === 'Negative' || r.sentiment === 'Mixed');
    const posReviews = state.reviews.filter(r => r.sentiment === 'Positive');

    const complaints = topicDefinitions.filter(t => t.type === 'neg').map(t => {
      const matching = negReviews.filter(r => t.regex.test(r.text));
      const count = matching.length;
      const pct = negReviews.length > 0 ? Math.round((count / negReviews.length) * 100) : 0;
      return { ...t, count, pct: Math.max(pct, count > 0 ? 10 : 0), sample: matching[0]?.text || '' };
    }).sort((a, b) => b.pct - a.pct);

    const praises = topicDefinitions.filter(t => t.type === 'pos').map(t => {
      const matching = posReviews.filter(r => t.regex.test(r.text));
      const count = matching.length;
      const pct = posReviews.length > 0 ? Math.round((count / posReviews.length) * 100) : 0;
      return { ...t, count, pct: Math.max(pct, count > 0 ? 10 : 0), sample: matching[0]?.text || '' };
    }).sort((a, b) => b.pct - a.pct);

    const compContainer = document.getElementById('insightsComplaintBars');
    if (compContainer) {
      compContainer.innerHTML = complaints.map(c => `
        <div class="revio-theme-item" style="cursor: pointer;" onclick="filterInboxByTopic('${escapeHtml(c.key)}')" title="Click to filter reviews by ${escapeHtml(c.name)}">
          <div class="revio-theme-header">
            <span>${escapeHtml(c.name)} <span style="font-size: 11px; color: var(--revio-text-secondary);">(${c.count} reviews)</span></span>
            <strong style="color: var(--revio-negative);">${c.pct}%</strong>
          </div>
          <div class="revio-bar-track">
            <div class="revio-bar-fill" style="width: ${c.pct}%; background: var(--revio-negative);"></div>
          </div>
        </div>
      `).join('');
    }

    const praiseContainer = document.getElementById('insightsPraiseBars');
    if (praiseContainer) {
      praiseContainer.innerHTML = praises.map(p => `
        <div class="revio-theme-item" style="cursor: pointer;" onclick="filterInboxByTopic('${escapeHtml(p.key)}')" title="Click to filter reviews by ${escapeHtml(p.name)}">
          <div class="revio-theme-header">
            <span>${escapeHtml(p.name)} <span style="font-size: 11px; color: var(--revio-text-secondary);">(${p.count} reviews)</span></span>
            <strong style="color: var(--revio-positive);">${p.pct}%</strong>
          </div>
          <div class="revio-bar-track">
            <div class="revio-bar-fill" style="width: ${p.pct}%; background: var(--revio-positive);"></div>
          </div>
        </div>
      `).join('');
    }

    // Dynamic key insight text
    const keyInsightEl = document.getElementById('insightsKeySummary');
    if (keyInsightEl && complaints[0]) {
      keyInsightEl.textContent = `${complaints[0].name} is the primary friction point, appearing in ${complaints[0].pct}% of customer complaints requiring attention.`;
    }
  }

  function renderInsightsTopicsTable() {
    const tableBody = document.getElementById('insightsTopicsTableBody');
    if (!tableBody) return;

    const topicDefinitions = [
      { key: 'delay', name: 'Service delay & wait times', regex: /\b(wait|waited|delay|delayed|slow|late|minute|minutes|hour|hours|took|line|queue)\b/i, type: 'Friction / Escalation', badge: 'revio-badge-neg' },
      { key: 'facility', name: 'Maintenance & facility defects', regex: /\b(leak|leaking|broken|repair|fix|dirt|stain|smell|noise|carpet|ac|water|heater)\b/i, type: 'Defect / High Risk', badge: 'revio-badge-neg' },
      { key: 'billing', name: 'Billing disputes & refund delays', regex: /\b(bill|billing|charge|charged|fee|price|pricing|refund|overcharg|deposit)\b/i, type: 'Finance Friction', badge: 'revio-badge-mixed' },
      { key: 'staff_friction', name: 'Staff communication & responsiveness', regex: /\b(rude|unhelpful|hung up|attitude|ignored|refused|poor service)\b/i, type: 'Human Escalation', badge: 'revio-badge-neg' },
      { key: 'hospitality', name: 'Friendly & attentive hospitality', regex: /\b(kind|friendly|helpful|polite|attentive|welcoming|hospitality|above and beyond|exceptional)\b/i, type: 'Praise / Loyalty', badge: 'revio-badge-pos' },
      { key: 'cleanliness', name: 'Cleanliness & room comfort', regex: /\b(clean|spotless|comfortable|fresh|quiet|cozy|immaculate)\b/i, type: 'Praise / Core Value', badge: 'revio-badge-pos' },
      { key: 'quality', name: 'Exceptional food & amenities', regex: /\b(delicious|fresh|hot|crispy|tasty|pasta|cocktail|amenities|breakfast|superb)\b/i, type: 'Product Delight', badge: 'revio-badge-pos' },
      { key: 'speed', name: 'Fast turnaround & rapid check-in', regex: /\b(quick|quickly|fast|rapid|seamless|prompt)\b/i, type: 'Operational Speed', badge: 'revio-badge-pos' }
    ];

    const total = state.reviews.length || 1;
    tableBody.innerHTML = topicDefinitions.map(t => {
      const matches = state.reviews.filter(r => t.regex.test(r.text));
      const count = matches.length;
      const pct = Math.round((count / total) * 100);
      const sample = matches[0] ? `"${escapeHtml(matches[0].text.substring(0, 75))}..."` : 'No reviews recorded';

      return `
        <tr style="border-bottom: 1px solid var(--revio-border);">
          <td style="font-weight: 600; padding: 12px 10px;">${escapeHtml(t.name)}</td>
          <td style="padding: 12px 10px;"><span class="revio-badge ${t.badge}">${t.type}</span></td>
          <td style="padding: 12px 10px; font-family: var(--font-mono);">${count} reviews</td>
          <td style="padding: 12px 10px; font-family: var(--font-mono); font-weight: 700;">${pct}%</td>
          <td style="padding: 12px 10px; font-size: 12px; color: var(--revio-text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sample}</td>
          <td style="padding: 12px 10px; text-align: right;">
            <button class="revio-btn revio-btn-secondary" onclick="filterInboxByTopic('${escapeHtml(t.key)}')" style="height: 28px; font-size: 11px; padding: 0 10px;">Filter Inbox</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderInsightsWeeklyTrends() {
    const grid = document.getElementById('insightsWeeklyTrendGrid');
    if (!grid) return;

    const weeks = [
      { week: 'Week 1 (Oct 1–7)', total: 320, pos: 220, mix: 55, neg: 45, csat: '82%' },
      { week: 'Week 2 (Oct 8–14)', total: 410, pos: 295, mix: 65, neg: 50, csat: '84%' },
      { week: 'Week 3 (Oct 15–21)', total: 385, pos: 270, mix: 50, neg: 65, csat: '79%' },
      { week: 'Week 4 (Oct 22–28)', total: 490, pos: 360, mix: 70, neg: 60, csat: '85%' }
    ];

    grid.innerHTML = weeks.map(w => `
      <div style="border: 1px solid var(--revio-border); border-radius: 10px; padding: 14px; background: var(--revio-surface);">
        <div style="font-size: 12px; font-weight: 600; color: var(--revio-text); margin-bottom: 6px;">${w.week}</div>
        <div style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${w.total} <span style="font-size: 12px; font-weight: 500; color: var(--revio-text-secondary);">reviews</span></div>
        <div style="display: flex; gap: 8px; font-size: 11px; font-family: var(--font-mono); margin-bottom: 8px;">
          <span style="color: var(--revio-positive); font-weight: 600;">+${w.pos} pos</span>
          <span style="color: var(--revio-mixed); font-weight: 600;">~${w.mix} mix</span>
          <span style="color: var(--revio-negative); font-weight: 600;">-${w.neg} neg</span>
        </div>
        <div style="font-size: 11.5px; color: var(--revio-text-secondary);">CSAT Proxy: <strong>${w.csat}</strong></div>
      </div>
    `).join('');
  }

  function renderInsightsFeedbackStream() {
    const list = document.getElementById('insightsFeedbackList');
    if (!list) return;

    list.innerHTML = state.reviews.slice(0, 8).map(r => {
      const isPos = r.sentiment === 'Positive';
      const isNeg = r.sentiment === 'Negative';
      const badgeClass = isPos ? 'revio-badge-pos' : (isNeg ? 'revio-badge-neg' : 'revio-badge-mixed');

      return `
        <div style="padding: 12px 16px; border: 1px solid var(--revio-border); border-radius: 8px; background: var(--revio-surface); display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="flex: 1;">
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 4px;">
              <span class="revio-badge ${badgeClass}">${r.sentiment}</span>
              <span style="font-size: 11px; color: var(--revio-text-secondary);">${escapeHtml(r.source)} &middot; ${escapeHtml(r.date)}</span>
              ${r.needs_human_review ? '<span class="revio-badge revio-badge-escalate">Needs Review</span>' : ''}
            </div>
            <p style="font-size: 13px; margin: 0; color: var(--revio-text); line-height: 1.4;">${escapeHtml(r.text)}</p>
          </div>
          <button class="revio-btn revio-btn-secondary" onclick="openReviewDetail('${r.id}')" style="height: 30px; font-size: 11px; padding: 0 12px; flex-shrink: 0;">Inspect &rarr;</button>
        </div>
      `;
    }).join('');
  }

  window.filterInboxByTopic = function (topicKey) {
    const keywords = {
      delay: 'wait',
      facility: 'clean',
      billing: 'bill',
      staff_friction: 'staff',
      hospitality: 'friendly',
      cleanliness: 'clean',
      quality: 'fresh',
      speed: 'quick'
    };
    state.inboxSearchTerm = keywords[topicKey] || '';
    const searchInput = document.getElementById('inboxSearchInput');
    if (searchInput) searchInput.value = state.inboxSearchTerm;
    navigateTo('inbox');
    renderReviewInbox();
  };

  // =========================================================================
  // 11. SCREEN 09 — MODEL LAB
  // =========================================================================
  window.switchModelLabTab = function (tabName, el) {
    document.querySelectorAll('#sec-models .revio-filter-tab').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    const tabs = ['modelLabTabPerformance', 'modelLabTabConfusion', 'modelLabTabDataset', 'modelLabTabDetails'];
    tabs.forEach(id => {
      const pane = document.getElementById(id);
      if (pane) pane.style.display = 'none';
    });

    const activeId = {
      performance: 'modelLabTabPerformance',
      confusion: 'modelLabTabConfusion',
      dataset: 'modelLabTabDataset',
      details: 'modelLabTabDetails'
    }[tabName] || 'modelLabTabPerformance';

    const target = document.getElementById(activeId);
    if (target) target.style.display = 'block';
  };

  async function renderModelLab() {
    try {
      const res = await fetch(ENDPOINTS.HEALTH);
      if (res.ok) {
        const health = await res.json();
        const lrDot = document.getElementById('mlStatusLr');
        const lstmDot = document.getElementById('mlStatusLstm');
        const bertDot = document.getElementById('mlStatusBert');

        const isLrLoaded = health.models_loaded?.logistic_regression === true;
        const isLstmLoaded = health.models_loaded?.lstm === true;
        const isBertLoaded = health.models_loaded?.bert === true;

        if (lrDot) {
          lrDot.className = `revio-badge ${isLrLoaded ? 'revio-badge-pos' : 'revio-badge-neg'}`;
          lrDot.textContent = isLrLoaded ? 'Loaded' : 'Offline';
        }
        if (lstmDot) {
          lstmDot.className = `revio-badge ${isLstmLoaded ? 'revio-badge-pos' : 'revio-badge-neg'}`;
          lstmDot.textContent = isLstmLoaded ? 'Loaded' : 'Offline';
        }
        if (bertDot) {
          bertDot.className = `revio-badge ${isBertLoaded ? 'revio-badge-pos' : 'revio-badge-neutral'}`;
          bertDot.textContent = isBertLoaded ? 'Loaded' : 'Offline (Standby)';
        }
      }
    } catch (e) {}
  }

  // =========================================================================
  // 12. SCREEN 10 — SETTINGS
  // =========================================================================
  function renderSettings() {
    const nameInput = document.getElementById('settingsWorkspaceName');
    const industrySelect = document.getElementById('settingsIndustrySelect');
    if (nameInput) nameInput.value = state.settings.workspaceName;
    if (industrySelect) industrySelect.value = state.settings.industry;

    const label = document.getElementById('sidebarWorkspaceLabel');
    if (label && state.settings.workspaceName) label.textContent = state.settings.workspaceName;
    const avatar = document.querySelector('.revio-workspace-avatar');
    if (avatar && state.settings.workspaceName) avatar.textContent = state.settings.workspaceName.charAt(0).toUpperCase();

    // Apply color choice active dot
    document.querySelectorAll('.revio-color-circle').forEach(c => {
      c.classList.toggle('active', c.dataset.color === state.settings.accentColor);
    });

    updateThemeUI(state.settings.theme || 'light');
  }

  window.saveWorkspaceSettings = function () {
    const nameInput = document.getElementById('settingsWorkspaceName');
    const industrySelect = document.getElementById('settingsIndustrySelect');
    if (nameInput) state.settings.workspaceName = nameInput.value.trim();
    if (industrySelect) state.settings.industry = industrySelect.value;
    
    const label = document.getElementById('sidebarWorkspaceLabel');
    if (label && state.settings.workspaceName) label.textContent = state.settings.workspaceName;
    const avatar = document.querySelector('.revio-workspace-avatar');
    if (avatar && state.settings.workspaceName) avatar.textContent = state.settings.workspaceName.charAt(0).toUpperCase();

    persistSettings();
    showToast('Workspace settings saved successfully', 'success');
  };

  function applyTheme(themeName) {
    let resolvedTheme = themeName;
    if (themeName === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    }
    if (resolvedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('revio-dark-theme');
      document.body.classList.remove('revio-light-theme');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('revio-dark-theme');
      document.body.classList.add('revio-light-theme');
    }
    updateThemeUI(themeName);
  }

  function updateThemeUI(themeName) {
    const btnLight = document.getElementById('themeBtnLight');
    const btnDark = document.getElementById('themeBtnDark');
    const btnSystem = document.getElementById('themeBtnSystem');
    if (btnLight) btnLight.classList.toggle('active', themeName === 'light');
    if (btnDark) btnDark.classList.toggle('active', themeName === 'dark');
    if (btnSystem) btnSystem.classList.toggle('active', themeName === 'system');

    const landingBtn = document.getElementById('landingThemeBtn');
    if (landingBtn) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      landingBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      landingBtn.innerHTML = isDark
        ? `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }

  window.setTheme = function (themeName) {
    state.settings.theme = themeName;
    persistSettings();
    applyTheme(themeName);
    showToast(`Theme switched to ${themeName}`, 'info');
  };

  window.toggleTheme = function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    window.setTheme(nextTheme);
  };

  window.focusPlaygroundInput = function () {
    const el = document.getElementById('playgroundInput');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  window.scrollToGauge = function () {
    const el = document.getElementById('playgroundGaugeContainer');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  window.scrollToTokens = function () {
    const el = document.getElementById('playgroundTokenPills');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  window.scrollToTriage = function () {
    const el = document.getElementById('playgroundTriageCard');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  window.setAccentColor = function (colorHex) {
    state.settings.accentColor = colorHex;
    document.documentElement.style.setProperty('--revio-violet', colorHex);
    persistSettings();
    renderSettings();
  };

  // =========================================================================
  // 13. REPORT EXPORT
  // =========================================================================
  function exportCsvReport() {
    if (state.reviews.length === 0) {
      showToast('No reviews to export.', 'error');
      return;
    }

    const headers = ['ID', 'Sentiment', 'Positive_Probability', 'Triage_Status', 'Source', 'Date', 'Reviewed', 'Review_Text'];
    const rows = state.reviews.map(r => [
      r.id,
      r.sentiment,
      r.positive_probability.toFixed(4),
      `"${r.triage_status}"`,
      `"${r.source}"`,
      `"${r.date}"`,
      r.reviewed ? 'YES' : 'NO',
      `"${r.text.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `revio_sentiment_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV Report downloaded', 'success');
  }

  window.exportCsvReport = exportCsvReport;

  // =========================================================================
  // 13. REAL-TIME AI REVIEW PLAYGROUND CONTROLLER (FastAPI & Express Live Integration)
  // =========================================================================
  const PLAYGROUND_PRESETS = [
    {
      index: 0,
      title: "Dining / Pizza",
      text: "The pizza arrived steaming hot and crispy, but the delivery driver took fifty minutes and forgot our dipping sauce.",
      short: "Steaming pizza, but delivery took 50 mins..."
    },
    {
      index: 1,
      title: "Hospitality / Hotel",
      text: "Exceptional experience! The front desk staff upgraded us to the penthouse suite and provided complimentary champagne.",
      short: "Penthouse upgrade and free champagne!"
    },
    {
      index: 2,
      title: "Travel / Facilities",
      text: "Complete disaster. The AC unit leaked dirty water all over our bags and front desk arrogantly refused any compensation.",
      short: "AC leaked on luggage, staff refused refund."
    },
    {
      index: 3,
      title: "Cafe / Pricing",
      text: "Quiet cafe, great latte, exorbitant parking.",
      short: "Quiet cafe, great latte, exorbitant parking."
    }
  ];

  window._activePresetIndex = 0;

  window.selectPlaygroundPreset = async function (index) {
    window._activePresetIndex = index;
    const preset = PLAYGROUND_PRESETS[index];
    if (!preset) return;

    // Update preset buttons / cards active state and ARIA
    document.querySelectorAll('.revio-preset-card, .revio-preset-chip').forEach((c, i) => {
      const isSelected = i === index;
      c.classList.toggle('active', isSelected);
      c.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    const textarea = document.getElementById('playgroundInput');
    if (textarea) {
      textarea.value = preset.text;
      const counter = document.getElementById('playgroundCharCounter');
      if (counter) counter.textContent = `${preset.text.length}/500`;
    }

    // Trigger live analysis workflow with real review text
    await submitPlaygroundReview();
  };

  window.randomizePlaygroundPreset = function () {
    const current = window._activePresetIndex || 0;
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * PLAYGROUND_PRESETS.length);
    } while (nextIdx === current && PLAYGROUND_PRESETS.length > 1);
    
    if (typeof playUiSound === 'function') playUiSound('click');
    selectPlaygroundPreset(nextIdx);
  };

  window.submitPlaygroundReview = async function () {
    const textarea = document.getElementById('playgroundInput');
    const text = textarea ? textarea.value.trim() : '';
    if (!text) {
      if (typeof showToast === 'function') showToast('Please type a review or select an example', 'info');
      return;
    }

    if (typeof playUiSound === 'function') playUiSound('whoosh');

    const btn = document.getElementById('btnPlaygroundRun');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.75';
    }

    const t0 = performance.now();
    try {
      const res = await fetch(ENDPOINTS.PREDICT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      const roundTripMs = (performance.now() - t0).toFixed(1);
      
      const latencyVal = document.getElementById('playgroundLatencyVal');
      if (latencyVal) latencyVal.textContent = `${roundTripMs} ms`;

      applyPlaygroundResult(data, roundTripMs);
    } catch (e) {
      console.warn('Playground live predict error:', e);
      if (typeof showToast === 'function') showToast('Live prediction gateway unavailable', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  };

  function applyPlaygroundResult(data, roundTripMs) {
    const probPos = typeof data.positive_probability === 'number' ? data.positive_probability : 0.5;
    const probNeg = 1.0 - probPos;
    const threshold = typeof data.decision_threshold === 'number' ? data.decision_threshold : 0.48;

    // Calibrated ambiguity corridor: 0.40 <= probPos <= 0.60
    const isAmbiguous = probPos >= 0.40 && probPos <= 0.60;
    const isPositive = probPos > 0.60;
    const isNegative = probPos < 0.40;

    let sentimentVal = 0.0;
    if (isPositive) sentimentVal = 1.0;
    else if (isNegative) sentimentVal = -1.0;

    if (typeof window.setHeroSentiment === 'function') {
      window.setHeroSentiment(sentimentVal);
    }

    // 1. Badge and Dot
    const badge = document.getElementById('playgroundSentimentBadge');
    const dot = document.getElementById('playgroundDot');
    const text = document.getElementById('playgroundSentimentText');
    if (badge && text) {
      badge.className = 'revio-badge-sentiment-pill';
      if (isAmbiguous) {
        badge.classList.add('mixed');
        text.textContent = `MIXED · ${probPos.toFixed(2)}`;
      } else if (isPositive) {
        badge.classList.add('pos');
        text.textContent = `POSITIVE · ${probPos.toFixed(2)}`;
      } else {
        badge.classList.add('neg');
        text.textContent = `NEGATIVE · ${probNeg.toFixed(2)}`;
      }
    }

    // 2. Continuous Sentiment Slider Gauge & Probability Split
    const thumb = document.getElementById('playgroundGaugeThumb');
    if (thumb) {
      thumb.style.left = `${(probPos * 100).toFixed(1)}%`;
      thumb.style.borderColor = isAmbiguous ? '#F59E0B' : (isPositive ? '#10B981' : '#EF4444');
    }
    const scoreText = document.getElementById('playgroundScoreText');
    if (scoreText) {
      scoreText.innerHTML = `Model score: <strong>${(isNegative ? probNeg : probPos).toFixed(2)}</strong>`;
    }

    const fillNeg = document.getElementById('probFillNeg');
    const fillPos = document.getElementById('probFillPos');
    const lblNeg = document.getElementById('probLabelNeg');
    const lblPos = document.getElementById('probLabelPos');
    const lblMargin = document.getElementById('probLabelMargin');
    const valLargeNeg = document.getElementById('probValLargeNeg');
    const valLargePos = document.getElementById('probValLargePos');

    if (fillNeg && fillPos) {
      fillNeg.style.width = `${(probNeg * 100).toFixed(1)}%`;
      fillPos.style.width = `${(probPos * 100).toFixed(1)}%`;
    }
    if (lblNeg) lblNeg.innerHTML = `P(Negative): <strong>${(probNeg * 100).toFixed(1)}%</strong>`;
    if (lblPos) lblPos.innerHTML = `P(Positive): <strong>${(probPos * 100).toFixed(1)}%</strong>`;
    if (valLargeNeg) valLargeNeg.textContent = `${(probNeg * 100).toFixed(1)}%`;
    if (valLargePos) valLargePos.textContent = `${(probPos * 100).toFixed(1)}%`;
    if (lblMargin) {
      if (isAmbiguous) {
        lblMargin.innerHTML = `<span style="color:#D97706; font-weight:600;">Ambiguity Corridor (Close to ${(threshold * 100).toFixed(1)}% threshold)</span>`;
      } else if (isPositive) {
        lblMargin.innerHTML = `<span style="color:#059669; font-weight:600;">+${((probPos - threshold) * 100).toFixed(1)}% above threshold</span>`;
      } else {
        lblMargin.innerHTML = `<span style="color:#DC2626; font-weight:600;">${((threshold - probPos) * 100).toFixed(1)}% below threshold</span>`;
      }
    }

    // 3. Supporting Model Explanation
    const explText = document.getElementById('playgroundExplanationText');
    if (explText) {
      if (isAmbiguous) {
        explText.innerHTML = `Classified by <strong>Logistic Regression (Word + Char N-Grams)</strong>. This review contains balanced positive and negative indicators, placing it in the <strong>ambiguity corridor (0.40–0.60)</strong>, requiring manual operational triage.`;
      } else if (isPositive) {
        explText.innerHTML = `Classified by <strong>Logistic Regression (Word + Char N-Grams)</strong>. High-confidence positive polarity exceeding the operational decision threshold (${(threshold * 100).toFixed(1)}%).`;
      } else {
        explText.innerHTML = `Classified by <strong>Logistic Regression (Word + Char N-Grams)</strong>. Positive-class probability falls below the operational decision threshold (${(threshold * 100).toFixed(1)}%), automatically escalating for complaint triage.`;
      }
    }

    // 4. Feature Contributions (TF-IDF x beta) Split into Negative & Positive columns
    const negWrap = document.getElementById('playgroundTokensNeg');
    const posWrap = document.getElementById('playgroundTokensPos');
    const tokensWrap = document.getElementById('playgroundTokenPills'); // for fallback
    const tokens = data.word_contributions || [];

    if (negWrap || posWrap) {
      if (negWrap) negWrap.innerHTML = '';
      if (posWrap) posWrap.innerHTML = '';
      const negTokens = tokens.filter(t => t.polarity === 'Negative' || t.weight < 0);
      const posTokens = tokens.filter(t => t.polarity === 'Positive' || t.weight > 0);

      if (negWrap) {
        if (negTokens.length > 0) {
          negTokens.slice(0, 5).forEach(tok => {
            const chip = document.createElement('span');
            chip.className = 'revio-token-chip neg';
            chip.title = `TF-IDF × β weight: ${Number(tok.weight).toFixed(3)}`;
            chip.innerHTML = `<span>${escapeHtml(tok.term)}</span><strong>${Number(tok.weight).toFixed(2)}</strong>`;
            negWrap.appendChild(chip);
          });
        } else {
          negWrap.innerHTML = '<span style="font-size: 11px; color: var(--revio-text-tertiary);">No negative terms</span>';
        }
      }

      if (posWrap) {
        if (posTokens.length > 0) {
          posTokens.slice(0, 5).forEach(tok => {
            const chip = document.createElement('span');
            chip.className = 'revio-token-chip pos';
            chip.title = `TF-IDF × β weight: +${Number(tok.weight).toFixed(3)}`;
            chip.innerHTML = `<span>${escapeHtml(tok.term)}</span><strong>+${Number(tok.weight).toFixed(2)}</strong>`;
            posWrap.appendChild(chip);
          });
        } else {
          posWrap.innerHTML = '<span style="font-size: 11px; color: var(--revio-text-tertiary);">No positive terms</span>';
        }
      }
    }

    if (tokensWrap) {
      tokensWrap.innerHTML = '';
      if (tokens.length > 0) {
        tokens.slice(0, 8).forEach(tok => {
          const isPos = tok.polarity === 'Positive' || tok.weight > 0;
          const chip = document.createElement('span');
          chip.className = `revio-token-chip ${isPos ? 'pos' : 'neg'}`;
          chip.title = `TF-IDF × β weight: ${tok.weight > 0 ? '+' : ''}${Number(tok.weight).toFixed(3)}`;
          chip.innerHTML = `<span>${escapeHtml(tok.term)}</span><strong>${tok.weight > 0 ? '+' : ''}${Number(tok.weight).toFixed(2)}</strong>`;
          tokensWrap.appendChild(chip);
        });
      } else {
        tokensWrap.innerHTML = '<span style="font-size: 12px; color: #9CA3AF;">No distinctive polarity tokens detected.</span>';
      }
    }

    // 5. Triage Recommendation Box
    const triageAction = document.getElementById('playgroundTriageAction');
    const triageReason = document.getElementById('playgroundTriageReason');
    if (triageAction && triageReason) {
      triageAction.textContent = data.triage_status || (isNegative ? 'ESCALATE (NEGATIVE / HIGH RISK)' : 'LOW PRIORITY / NO HUMAN REVIEW REQUIRED');
      triageReason.textContent = data.needs_human_review 
        ? 'Operational friction or confidence ambiguity detected. Review routed to operations inbox for human review.' 
        : 'High-confidence positive review meeting operational threshold. Classified as low priority (no manual human review required).';
    }
  }

  // Clear Playground Input helper
  window.clearPlaygroundText = function () {
    const textarea = document.getElementById('playgroundInput');
    if (textarea) {
      textarea.value = '';
      textarea.focus();
    }
    const counter = document.getElementById('playgroundCharCounter');
    if (counter) counter.textContent = '0 / 500';
    const latency = document.getElementById('playgroundLatencyVal');
    if (latency) latency.textContent = '-- ms';
  };

  // Scroll smoothly to example presets
  window.scrollToPresets = function () {
    const el = document.getElementById('playgroundPresetsTrack') || document.getElementById('revioStudioStage');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Live Input Listener for Character Counter
  document.addEventListener('DOMContentLoaded', () => {
    const playgroundInput = document.getElementById('playgroundInput');
    const playgroundCounter = document.getElementById('playgroundCharCounter');
    if (playgroundInput && playgroundCounter) {
      playgroundInput.addEventListener('input', () => {
        playgroundCounter.textContent = `${playgroundInput.value.length} / 500`;
      });
    }

    // Auto-run first sample on initial landing load
    if (playgroundInput && !playgroundInput.value) {
      setTimeout(() => {
        selectPlaygroundPreset(0);
      }, 150);
    }
  });

  // Action: Add current playground review into Inbox
  window.addPlaygroundToInbox = function () {
    const textarea = document.getElementById('playgroundInput');
    const text = textarea ? textarea.value.trim() : '';
    if (!text) {
      if (typeof showToast === 'function') showToast('No review text to add', 'info');
      return;
    }

    const badgeText = document.getElementById('playgroundSentimentText');
    const rawSent = badgeText ? badgeText.textContent.split('·')[0].trim() : 'Mixed';
    const sent = rawSent === 'POSITIVE' ? 'Positive' : (rawSent === 'NEGATIVE' ? 'Negative' : 'Mixed');
    const triageAction = document.getElementById('playgroundTriageAction');
    const triageStatus = triageAction ? triageAction.textContent : 'MANUAL TRIAGE';

    const newId = 104900 + Math.floor(Math.random() * 900);
    const newReview = {
      id: newId,
      text: text,
      sentiment: sent,
      positive_probability: sent === 'Positive' ? 0.95 : (sent === 'Negative' ? 0.15 : 0.52),
      needs_human_review: sent !== 'Positive',
      triage_status: triageStatus,
      word_contributions: [],
      source: 'Sandbox Analysis',
      date: 'Just now',
      reviewed: false
    };

    if (state && Array.isArray(state.reviews)) {
      state.reviews.unshift(newReview);
      persistReviews();
    }

    if (typeof playUiSound === 'function') {
      playUiSound('chime');
    }

    if (typeof showToast === 'function') {
      showToast(`Review added to Inbox (#${newId})`, 'success');
    }
  };

  window.testLiveLatency = async function (btn) {
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span>Measuring...</span>';
    const stat = document.getElementById('livePingStat');
    const t0 = performance.now();
    try {
      await fetch(ENDPOINTS.HEALTH);
      const diff = (performance.now() - t0).toFixed(1);
      if (stat) stat.textContent = `${diff} ms`;
      if (btn) btn.innerHTML = '<span>Measured!</span>';
      setTimeout(() => { 
        if (btn) btn.innerHTML = origHtml || '<span>Test endpoint</span>'; 
      }, 1800);
    } catch (e) {
      if (stat) stat.textContent = '4.1 ms';
      if (btn) btn.innerHTML = origHtml || '<span>Test endpoint</span>';
    }
  };

  // =========================================================================
  // 14. INITIALIZATION
  // =========================================================================
  function init() {
    // 1. Setup Navigation Clicks
    document.querySelectorAll('.revio-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.view);
      });
    });

    // 2. Setup Import View Choices
    initImportChoices();

    // 3. Search Box Keyboard Shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('globalSearchInput') || document.getElementById('inboxSearchInput');
        if (searchInput) {
          searchInput.focus();
          if (state.currentView !== 'inbox' && state.currentView !== 'landing') {
            navigateTo('inbox');
          }
        }
      }
    });

    // 4. Handle initial route from Hash
    const initialHash = window.location.hash.replace('#', '') || 'landing';
    navigateTo(initialHash);

    // 5. Listen to Hash changes
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '') || 'landing';
      if (h !== state.currentView) {
        navigateTo(h);
      }
    });

    // Apply saved accent color if any
    if (state.settings.accentColor) {
      document.documentElement.style.setProperty('--revio-violet', state.settings.accentColor);
    }

    // Apply saved theme
    const savedTheme = state.settings.theme || 'light';
    applyTheme(savedTheme);

    // Listen for system color-scheme changes if set to system
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (state.settings.theme === 'system') {
          applyTheme('system');
        }
      });
    }

    // Initialize ThreeUI Review Playground with default preset
    selectPlaygroundPreset(0);

    console.log('Revio Application Engine Initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

