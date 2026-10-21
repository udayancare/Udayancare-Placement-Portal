
/**
 * =========================================================
 * UCPP V2 — Admin Login Controller
 * File: js/admin/login.js
 * Version: 3.0 — Fast Login Optimization
 *
 * FEATURES:
 * - Secure administrator login
 * - Single login API request
 * - No redundant post-login validation request
 * - Secure sessionStorage token handling
 * - Session expiry tracking
 * - Remember email only
 * - Password never stored
 * - Login loading state
 * - Session-aware error handling
 *
 * Backend:
 * - AdminAuthService.gs
 * - AdminSessionService.gs
 *
 * Candidate/Employer modules unaffected.
 * =========================================================
 */

(function (window, document) {
  'use strict';

  const CONFIG = window.UCPP_ADMIN_CONFIG;
  const API = window.UCPP_ADMIN_API;

  const $ = id => document.getElementById(id);

  const form = $('adminLoginForm');
  const emailInput = $('adminEmail');
  const passwordInput = $('adminPassword');
  const loginButton = $('adminLoginButton');

  const rememberCheckbox =
    $('adminRememberEmail') ||
    $('adminRememberMe');

  const alertBox =
    $('adminLoginAlert') ||
    $('adminAlert');

  let loggingIn = false;

  // =====================================================
  // UI HELPERS
  // =====================================================

  function showAlert(message, type = 'error') {
    if (!alertBox) {
      if (message) {
        console.error('[UCPP ADMIN LOGIN]', message);
      }
      return;
    }

    alertBox.textContent = message || '';
    alertBox.hidden = !message;
    alertBox.className = 'profile-alert ' + type;
  }

  function setLoading(loading) {
    loggingIn = loading;

    if (loginButton) {
      loginButton.disabled = loading;
      loginButton.textContent = loading
        ? 'Signing In...'
        : 'Sign In';
    }

    if (emailInput) {
      emailInput.disabled = loading;
    }

    if (passwordInput) {
      passwordInput.disabled = loading;
    }

    if (rememberCheckbox) {
      rememberCheckbox.disabled = loading;
    }
  }

  // =====================================================
  // SESSION STORAGE
  // =====================================================

  function clearSession() {
    try {
      const key = CONFIG?.SESSION?.STORAGE_KEY;

      if (key) {
        sessionStorage.removeItem(key);
      }
    } catch (_) {}
  }

  function saveSession(token, expiresIn) {
    const key = CONFIG?.SESSION?.STORAGE_KEY;

    if (!key) {
      throw new Error(
        'Admin session configuration is missing.'
      );
    }

    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token)
    ) {
      throw new Error(
        'Invalid administrator session token.'
      );
    }

    const seconds = Number(expiresIn);

    if (
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      seconds > 21600
    ) {
      throw new Error(
        'Invalid administrator session expiry.'
      );
    }

    const session = {
      token,
      expiresAt: Date.now() + seconds * 1000
    };

    sessionStorage.setItem(
      key,
      JSON.stringify(session)
    );
  }

  function readSession() {
    try {
      const key = CONFIG?.SESSION?.STORAGE_KEY;

      if (!key) return null;

      const raw = sessionStorage.getItem(key);

      if (!raw) return null;

      const data = JSON.parse(raw);

      if (
        !data ||
        typeof data.token !== 'string' ||
        !/^[a-f0-9]{64}$/.test(data.token) ||
        !Number.isFinite(data.expiresAt) ||
        data.expiresAt <= Date.now()
      ) {
        clearSession();
        return null;
      }

      return data.token;

    } catch (_) {
      clearSession();
      return null;
    }
  }

  // =====================================================
  // REMEMBER EMAIL
  // =====================================================

  function getRememberKey() {
    return CONFIG?.SESSION?.REMEMBER_EMAIL_KEY ||
      'ucpp_admin_remember_email';
  }

  function loadRememberedEmail() {
    if (!emailInput) return;

    try {
      const remembered = localStorage.getItem(
        getRememberKey()
      );

      if (remembered) {
        emailInput.value = remembered;

        if (rememberCheckbox) {
          rememberCheckbox.checked = true;
        }
      }
    } catch (_) {}
  }

  function saveRememberedEmail(email) {
    try {
      if (
        rememberCheckbox &&
        rememberCheckbox.checked
      ) {
        localStorage.setItem(
          getRememberKey(),
          email
        );
      } else {
        localStorage.removeItem(
          getRememberKey()
        );
      }
    } catch (_) {}
  }

  // =====================================================
  // API RESPONSE HELPERS
  // =====================================================

  function extractLoginData(response) {
    if (
      response?.data &&
      typeof response.data === 'object'
    ) {
      return response.data;
    }

    return response;
  }

  function isValidLoginResponse(response) {
    if (
      !response ||
      response.success !== true
    ) {
      return false;
    }

    const data = extractLoginData(response);

    return Boolean(
      data &&
      typeof data.token === 'string' &&
      /^[a-f0-9]{64}$/.test(data.token) &&
      Number.isFinite(Number(data.expiresIn)) &&
      Number(data.expiresIn) > 0 &&
      Number(data.expiresIn) <= 21600
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  async function handleLogin(event) {
    event.preventDefault();

    if (loggingIn) return;

    if (
      !CONFIG ||
      !API ||
      typeof API.login !== 'function'
    ) {
      showAlert(
        'Admin login service is unavailable. Please refresh.'
      );
      return;
    }

    const email = String(
      emailInput?.value || ''
    ).trim().toLowerCase();

    const password = String(
      passwordInput?.value || ''
    );

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      showAlert(
        'Please enter a valid email address.'
      );
      return;
    }

    if (
      password.length < 12 ||
      password.length > 1024
    ) {
      showAlert(
        'Please enter your valid administrator password.'
      );
      return;
    }

    setLoading(true);
    showAlert('');

    let issuedToken = null;
    let sessionSaved = false;

    try {
      const response = await API.login(
        email,
        password
      );

      if (
        !response ||
        response.success !== true
      ) {
        throw new Error(
          response?.message ||
          'Unable to sign in. Please try again.'
        );
      }

      if (!isValidLoginResponse(response)) {
        throw new Error(
          'Incomplete administrator login response.'
        );
      }

      const data = extractLoginData(response);

      issuedToken = data.token;

      /*
       * Backend has already:
       * 1. Verified admin email/password
       * 2. Checked active account
       * 3. Registered the secure session token
       *
       * No additional validateSession() call needed.
       */

      saveSession(
        issuedToken,
        data.expiresIn
      );

      sessionSaved = true;

      saveRememberedEmail(email);

      if (passwordInput) {
        passwordInput.value = '';
      }

      const dashboardPath =
        CONFIG?.PATHS?.DASHBOARD;

      if (!dashboardPath) {
        throw new Error(
          'Admin dashboard path is missing.'
        );
      }

      window.location.assign(
        dashboardPath
      );

    } catch (error) {
      console.error(
        '[UCPP ADMIN LOGIN]',
        error?.message || 'Login failed.'
      );

      /*
       * Do not clear a previously valid session
       * unless this login attempt saved a new one.
       */
      if (sessionSaved) {
        clearSession();
      }

      showAlert(
        error?.message ||
        'Unable to sign in. Please try again.'
      );

      /*
       * If a token was issued but login handoff
       * failed, attempt server-side revocation.
       */
      if (
        issuedToken &&
        typeof API.logout === 'function'
      ) {
        try {
          await API.logout(issuedToken);
        } catch (_) {}
      }

    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  function initialize() {
    if (!form) return;

    if (
      !CONFIG ||
      !API ||
      typeof API.login !== 'function'
    ) {
      showAlert(
        'Admin configuration is unavailable.'
      );
      return;
    }

    loadRememberedEmail();

    /*
     * Existing local session is not trusted
     * as proof of backend authorization.
     *
     * Dashboard endpoint will validate it.
     */
    const existingToken = readSession();

    if (existingToken && CONFIG?.PATHS?.DASHBOARD) {
      window.location.replace(
        CONFIG.PATHS.DASHBOARD
      );
      return;
    }

    form.addEventListener(
      'submit',
      handleLogin
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})(window, document);
