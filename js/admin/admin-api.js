
/**
 * =========================================================
 * UCPP V2 — Admin API Client
 * File: js/admin/admin-api.js
 * Version: 4.0
 *
 * FEATURES:
 * - Secure admin login
 * - Cryptographically secure session token
 * - Admin session validation
 * - Secure logout
 * - Live dashboard metrics
 * - Reporting-period filters
 * - Secure CSV export
 * - Secure Excel (.xlsx) export
 * - Custom date-range support
 * - Request timeout handling
 *
 * Existing Candidate/Employer APIs unaffected.
 * =========================================================
 */

(function (window) {
  'use strict';

  // =====================================================
  // CONFIGURATION
  // =====================================================

  const CONFIG = window.UCPP_ADMIN_CONFIG;

  if (!CONFIG) {
    console.error(
      'UCPP Admin configuration is missing.'
    );
    return;
  }

  // =====================================================
  // API URL VALIDATION
  // =====================================================

  function getApiUrl() {
    const url = String(
      CONFIG.API_URL || ''
    ).trim();

    if (!url) {
      throw new Error(
        'Admin API is not configured. Contact the system administrator.'
      );
    }

    let parsed;

    try {
      parsed = new URL(url);
    } catch (_) {
      throw new Error(
        'Invalid Admin API configuration.'
      );
    }

    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[^/]+\/exec\/?$/.test(
        parsed.pathname
      ) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        'Invalid Admin API endpoint.'
      );
    }

    return parsed.href;
  }

  // =====================================================
  // RESPONSE VALIDATION
  // =====================================================

  function normalizeResponse(payload) {
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error(
        'Invalid response received from the server.'
      );
    }

    return payload;
  }

  // =====================================================
  // SECURE SESSION TOKEN GENERATION
  // =====================================================

  function generateSessionToken() {
    if (
      !window.isSecureContext ||
      !window.crypto ||
      typeof window.crypto.getRandomValues !== 'function'
    ) {
      throw new Error(
        'Secure browser cryptography is unavailable.'
      );
    }

    const bytes = new Uint8Array(32);

    window.crypto.getRandomValues(bytes);

    return Array.from(
      bytes,
      function (byte) {
        return byte
          .toString(16)
          .padStart(2, '0');
      }
    ).join('');
  }

  // =====================================================
  // COMMON API REQUEST HANDLER
  // =====================================================

  async function request(action, payload = {}) {
    const url = getApiUrl();

    if (
      typeof action !== 'string' ||
      !action.trim() ||
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error(
        'Invalid Admin API request.'
      );
    }

    const controller = new AbortController();

    const configuredTimeout = Number(
      CONFIG.REQUEST?.TIMEOUT_MS
    );

    const timeoutMs =
      Number.isFinite(configuredTimeout) &&
      configuredTimeout > 0
        ? configuredTimeout
        : 30000;

    // XLSX generation can take longer than
    // standard dashboard requests.
    const effectiveTimeout =
      action === 'exportAdminData'
        ? Math.max(timeoutMs, 120000)
        : timeoutMs;

    const timeout = window.setTimeout(
      function () {
        controller.abort();
      },
      effectiveTimeout
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',

        headers: {
          'Content-Type':
            'text/plain;charset=UTF-8'
        },

        body: JSON.stringify({
          ...payload,
          action
        }),

        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          'Admin server request failed. Please try again.'
        );
      }

      const result = await response.json();

      return normalizeResponse(result);

    } catch (error) {
      if (
        error &&
        error.name === 'AbortError'
      ) {
        throw new Error(
          'The server took too long to respond. Please try again.'
        );
      }

      if (error instanceof TypeError) {
        throw new Error(
          'Unable to connect to the Admin server. Check the deployment URL and network.'
        );
      }

      throw error;

    } finally {
      window.clearTimeout(timeout);
    }
  }

  // =====================================================
  // ADMIN LOGIN
  // =====================================================

  function login(email, password) {
    const sessionToken =
      generateSessionToken();

    return request(
      CONFIG.ACTIONS.LOGIN,
      {
        email: String(
          email || ''
        ).trim(),

        password: String(
          password || ''
        ),

        sessionToken
      }
    );
  }

  // =====================================================
  // SESSION VALIDATION
  // =====================================================

  function validateSession(token) {
    return request(
      CONFIG.ACTIONS.VALIDATE_SESSION,
      {
        token: String(
          token || ''
        ).trim()
      }
    );
  }

  // =====================================================
  // ADMIN LOGOUT
  // =====================================================

  function logout(token) {
    return request(
      CONFIG.ACTIONS.LOGOUT,
      {
        token: String(
          token || ''
        ).trim()
      }
    );
  }

  // =====================================================
  // LIVE DASHBOARD METRICS
  // =====================================================

  /**
   * Supported backend periods:
   *
   * all
   * this_month
   * last_month
   * custom
   *
   * Today and Last 7 Days are converted
   * into custom dates by dashboard.js.
   */

  function getDashboard(
    token,
    options = {}
  ) {
    return request(
      CONFIG.ACTIONS.DASHBOARD,
      {
        token: String(
          token || ''
        ).trim(),

        period: String(
          options.period || 'all'
        ).trim().toLowerCase(),

        startDate: String(
          options.startDate || ''
        ).trim(),

        endDate: String(
          options.endDate || ''
        ).trim()
      }
    );
  }

  // =====================================================
  // SECURE REPORT EXPORT — CSV + XLSX
  // =====================================================

  /**
   * Supported report segments:
   *
   * candidates
   * employers
   * jobs
   * applications
   * enquiries
   *
   * Supported formats:
   *
   * csv
   * xlsx
   *
   * Supported periods:
   *
   * all
   * this_month
   * last_month
   * custom
   *
   * Backend response:
   *
   * CSV:
   * {
   *   success: true,
   *   filename: "UCPP_Candidates_2026-10-14.csv",
   *   mimeType: "text/csv;charset=utf-8",
   *   content: "...",
   *   rowCount: 100
   * }
   *
   * XLSX:
   * {
   *   success: true,
   *   filename: "UCPP_Candidates_2026-10-14.xlsx",
   *   mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
   *   encoding: "base64",
   *   content: "...",
   *   rowCount: 100
   * }
   */

  function exportData(
    token,
    options = {}
  ) {
    const cleanToken = String(
      token || ''
    ).trim();

    const segment = String(
      options.segment || ''
    ).trim().toLowerCase();

    const format = String(
      options.format || 'csv'
    ).trim().toLowerCase();

    const period = String(
      options.period || 'all'
    ).trim().toLowerCase();

    const startDate = String(
      options.startDate || ''
    ).trim();

    const endDate = String(
      options.endDate || ''
    ).trim();

    // ---------------------------------------------
    // AUTHENTICATION INPUT CHECK
    // ---------------------------------------------

    if (!cleanToken) {
      return Promise.reject(
        new Error(
          'Administrator session is missing. Please sign in again.'
        )
      );
    }

    // ---------------------------------------------
    // REPORT SEGMENT VALIDATION
    // ---------------------------------------------

    const allowedSegments = [
      'candidates',
      'employers',
      'jobs',
      'applications',
      'enquiries'
    ];

    if (
      !allowedSegments.includes(segment)
    ) {
      return Promise.reject(
        new Error(
          'Selected report is not available yet.'
        )
      );
    }

    // ---------------------------------------------
    // FILE FORMAT VALIDATION
    // ---------------------------------------------

    const allowedFormats = [
      'csv',
      'xlsx'
    ];

    if (
      !allowedFormats.includes(format)
    ) {
      return Promise.reject(
        new Error(
          'Unsupported export format. Select Excel or CSV.'
        )
      );
    }

    // ---------------------------------------------
    // REPORTING PERIOD VALIDATION
    // ---------------------------------------------

    const allowedPeriods = [
      'all',
      'all_time',
      'this_month',
      'last_month',
      'custom'
    ];

    if (
      !allowedPeriods.includes(period)
    ) {
      return Promise.reject(
        new Error(
          'Unsupported reporting period.'
        )
      );
    }

    if (period === 'custom') {
      const datePattern =
        /^\d{4}-\d{2}-\d{2}$/;

      if (
        !datePattern.test(startDate) ||
        !datePattern.test(endDate)
      ) {
        return Promise.reject(
          new Error(
            'Please select valid From Date and To Date.'
          )
        );
      }

      if (startDate > endDate) {
        return Promise.reject(
          new Error(
            'From Date cannot be after To Date.'
          )
        );
      }
    }

    // ---------------------------------------------
    // BACKEND REQUEST
    // ---------------------------------------------

    return request(
      'exportAdminData',
      {
        token: cleanToken,
        segment,
        format,
        period,
        startDate,
        endDate
      }
    );
  }

  // =====================================================
  // PUBLIC ADMIN API
  // =====================================================

  const API = Object.freeze({
    request,
    login,
    validateSession,
    logout,
    getDashboard,
    exportData
  });

  Object.defineProperty(
    window,
    'UCPP_ADMIN_API',
    {
      value: API,
      writable: false,
      configurable: false
    }
  );

})(window);
