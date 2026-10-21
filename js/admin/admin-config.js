
/**
 * UCPP V2 — Admin Frontend Configuration
 * File: js/admin/admin-config.js
 * Version: 1.1
 *
 * Centralized configuration for Admin Portal.
 *
 * IMPORTANT:
 * - No passwords, API secrets or private keys.
 * - Existing Candidate/Employer configuration untouched.
 * - Admin authentication is enforced by the backend.
 */

(function (window) {
  'use strict';

  /**
   * Paste your actual deployed UCPP V2
   * Google Apps Script Web App URL below.
   *
   * URL must end with /exec.
   */

const API_URL = 'https://script.google.com/macros/s/AKfycbzP1iAr9ZGpbkTefWnmy6s8cQ81at4bCSMnhDdp23Gjlo9cLbQwrtFTH4ierh6S6GAb/exec';

  const SESSION = Object.freeze({
    STORAGE_KEY: 'ucpp_v2_admin_session',
    EMAIL_STORAGE_KEY: 'ucpp_v2_admin_remember_email',
    MAX_AGE_SECONDS: 21600
  });

  const PATHS = Object.freeze({
    LOGIN: 'login.html',
    DASHBOARD: 'dashboard.html'
  });

  const ACTIONS = Object.freeze({
    LOGIN: 'adminLogin',
    VALIDATE_SESSION: 'validateAdminSession',
    LOGOUT: 'logoutAdmin',
    DASHBOARD: 'getAdminDashboard'
  });

  const REQUEST = Object.freeze({
    TIMEOUT_MS: 30000
  });

  const CONFIG = Object.freeze({
    APP_NAME: 'Udayan Care Placement Portal',
    MODULE_NAME: 'UCPP Admin Portal',
    VERSION: '1.1.0',
    API_URL: API_URL.trim(),
    SESSION,
    PATHS,
    ACTIONS,
    REQUEST
  });

  Object.defineProperty(window, 'UCPP_ADMIN_CONFIG', {
    value: CONFIG,
    writable: false,
    configurable: false
  });

})(window);
