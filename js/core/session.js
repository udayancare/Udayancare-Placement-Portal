
'use strict';

/*
 * =========================================================
 * UCPP V2 - Core Session Manager
 * Candidate + Employer Authentication
 * =========================================================
 */

(function () {

  const STORAGE_KEY = 'ucpp_v2_session';

  const VALID_ROLES = new Set([
    'candidate',
    'employer',
    'admin'
  ]);

  function parseJSON(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function normalizeRole(role) {
    const value = String(role || '').trim().toLowerCase();
    return VALID_ROLES.has(value) ? value : '';
  }

  function clearStoredSession() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function readStoredSession() {

    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const data = parseJSON(raw);

    if (!data || data.isAuthenticated !== true) {
      clearStoredSession();
      return null;
    }

    const role = normalizeRole(data.role);
    const sessionToken = String(data.sessionToken || '').trim();

    if (!role || !sessionToken) {
      clearStoredSession();
      return null;
    }

    return {
      isAuthenticated: true,
      role: role,
      sessionToken: sessionToken,
      userId: String(data.userId || ''),
      displayName: String(data.displayName || ''),
      email: String(data.email || '')
    };
  }

  function setSession(data) {

    if (!data) {
      throw new Error('Session data is required.');
    }

    const role = normalizeRole(data.role);
    const sessionToken = String(data.sessionToken || '').trim();

    if (!role) {
      throw new Error('Invalid session role.');
    }

    if (!sessionToken) {
      throw new Error('Session token is required.');
    }

    const session = {
      isAuthenticated: true,
      role: role,
      sessionToken: sessionToken,
      userId: String(data.userId || ''),
      displayName: String(data.displayName || ''),
      email: String(data.email || '')
    };

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(session)
    );

    syncPublicState(session);

    return session;
  }

  function getSession() {
    return readStoredSession();
  }

  function isAuthenticated() {
    return Boolean(readStoredSession());
  }

  function hasRole(requiredRole) {

    const session = readStoredSession();

    if (!session) return false;

    return session.role === normalizeRole(requiredRole);
  }

  function syncPublicState(session) {

    if (!session) {
      window.UCPP_SESSION = {
        isAuthenticated: false,
        role: 'public',
        logout: logout
      };
      return;
    }

    window.UCPP_SESSION = {
      isAuthenticated: true,
      role: session.role,
      userId: session.userId,
      displayName: session.displayName,
      email: session.email,
      logout: logout
    };
  }

  function getLoginPath(role) {

    const path = window.location.pathname;

    if (role === 'candidate') {
      return path.includes('/candidate/')
        ? 'login.html'
        : 'candidate/login.html';
    }

    if (role === 'employer') {
      return path.includes('/employer/')
        ? 'login.html'
        : 'employer/login.html';
    }

    if (role === 'admin') {
      return path.includes('/admin/')
        ? 'login.html'
        : 'admin/login.html';
    }

    return (
      path.includes('/candidate/') ||
      path.includes('/employer/') ||
      path.includes('/admin/')
    )
      ? '../index.html'
      : 'index.html';
  }

  function getHomePath() {

    const path = window.location.pathname;

    return (
      path.includes('/candidate/') ||
      path.includes('/employer/') ||
      path.includes('/admin/')
    )
      ? '../index.html'
      : 'index.html';
  }

  /*
   * =========================================================
   * SESSION VALIDATION
   * =========================================================
   */

  async function validateSession() {

    const session = readStoredSession();

    if (!session) {

      syncPublicState(null);

      return {
        success: false,
        code: 'NO_SESSION'
      };
    }

    /*
     * EMPLOYER BACKEND SESSION VALIDATION
     */

    if (session.role === 'employer') {

      if (
        !window.UCPP_API ||
        typeof window.UCPP_API.post !== 'function'
      ) {
        return {
          success: false,
          code: 'API_UNAVAILABLE'
        };
      }

      try {

        const result = await window.UCPP_API.post(
          'validateEmployerSession',
          {
            sessionToken: session.sessionToken
          }
        );

        if (!result || result.success !== true) {

          /*
           * Do not clear session for unrelated backend
           * failures. Only confirmed invalid sessions.
           */

          const code = String(result?.code || '');

          if (
            code === 'INVALID_SESSION' ||
            code === 'SESSION_EXPIRED' ||
            code === 'SESSION_NOT_FOUND' ||
            code === 'UNAUTHORIZED'
          ) {

            clearStoredSession();
            syncPublicState(null);

            return {
              success: false,
              code: 'INVALID_SESSION'
            };
          }

          return {
            success: false,
            code: code || 'SESSION_CHECK_FAILED',
            message: result?.message || 'Session validation failed.'
          };
        }

        syncPublicState(session);

        return {
          success: true,
          code: 'SESSION_VALID',
          session: session
        };

      } catch (error) {

        return {
          success: false,
          code: 'SESSION_CHECK_FAILED',
          message: error.message
        };
      }
    }

    /*
     * ADMIN SESSION
     * Backend integration pending.
     * Never trust local session alone.
     */

    if (session.role === 'admin') {

      return {
        success: false,
        code: 'API_UNAVAILABLE'
      };
    }

    /*
     * CANDIDATE BACKEND SESSION VALIDATION
     * Existing functionality preserved.
     */

    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.validateCandidateSession !== 'function'
    ) {

      return {
        success: false,
        code: 'API_UNAVAILABLE'
      };
    }

    try {

      const result =
        await window.UCPP_API.validateCandidateSession(
          session.sessionToken
        );

      if (!result || result.success !== true) {

        clearStoredSession();
        syncPublicState(null);

        return {
          success: false,
          code: result?.code || 'INVALID_SESSION'
        };
      }

      const user = result.data?.user || {};

      const updated = setSession({
        role: 'candidate',
        sessionToken: session.sessionToken,
        userId: user.candidateId || session.userId,
        displayName: user.fullName || session.displayName,
        email: user.email || session.email
      });

      return {
        success: true,
        code: 'SESSION_VALID',
        session: updated
      };

    } catch (error) {

      /*
       * Network failures should not destroy
       * the stored candidate session.
       */

      return {
        success: false,
        code: 'SESSION_CHECK_FAILED',
        message: error.message
      };
    }
  }

  /*
   * =========================================================
   * LOGOUT
   * =========================================================
   */

  async function logout() {

    const session = readStoredSession();

    /*
     * Immediately clear browser session.
     */

    clearStoredSession();
    syncPublicState(null);

    /*
     * Candidate server logout.
     * Existing behavior preserved.
     */

    if (
      session &&
      session.role === 'candidate' &&
      session.sessionToken &&
      window.UCPP_API &&
      typeof window.UCPP_API.logoutCandidate === 'function'
    ) {

      try {

        await window.UCPP_API.logoutCandidate(
          session.sessionToken
        );

      } catch (error) {

        console.warn('Candidate server logout unavailable.');
      }
    }

    /*
     * Employer server logout.
     */

    if (
      session &&
      session.role === 'employer' &&
      session.sessionToken &&
      window.UCPP_API &&
      typeof window.UCPP_API.post === 'function'
    ) {

      try {

        await window.UCPP_API.post(
          'logoutEmployer',
          {
            sessionToken: session.sessionToken
          }
        );

      } catch (error) {

        console.warn('Employer server logout unavailable.');
      }
    }

    window.location.replace(getHomePath());
  }

  /*
   * =========================================================
   * AUTH GUARDS
   * =========================================================
   */

  function requireAuth(requiredRole) {

    const session = readStoredSession();

    if (!session) return false;

    if (
      requiredRole &&
      session.role !== normalizeRole(requiredRole)
    ) {
      return false;
    }

    return true;
  }

  async function requireValidAuth(requiredRole) {

    const role = normalizeRole(requiredRole);

    if (requiredRole && !role) {
      return false;
    }

    const session = readStoredSession();

    if (!session) {

      syncPublicState(null);

      window.location.replace(
        getLoginPath(role)
      );

      return false;
    }

    if (role && session.role !== role) {

      clearStoredSession();
      syncPublicState(null);

      window.location.replace(
        getLoginPath(role)
      );

      return false;
    }

    const validation = await validateSession();

    if (validation.success === true) {
      return true;
    }

    if (
      validation.code === 'INVALID_SESSION' ||
      validation.code === 'NO_SESSION'
    ) {

      clearStoredSession();
      syncPublicState(null);

      window.location.replace(
        getLoginPath(role)
      );

      return false;
    }

    /*
     * API or network failure:
     * Do not grant access and do not
     * unnecessarily delete local session.
     */

    return false;
  }

  /*
   * =========================================================
   * INITIALIZE SESSION STATE
   * =========================================================
   */

  const existingSession = readStoredSession();

  syncPublicState(existingSession);

  window.UCPP_SESSION_MANAGER = Object.freeze({

    getSession: getSession,
    setSession: setSession,
    isAuthenticated: isAuthenticated,
    hasRole: hasRole,
    validateSession: validateSession,
    requireAuth: requireAuth,
    requireValidAuth: requireValidAuth,
    logout: logout

  });

})();
