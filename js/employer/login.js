
'use strict';

/*
 * =========================================================
 * UCPP V2 — Employer Login
 * Existing Core API + Session Manager
 * =========================================================
 */

(function () {

  const form = document.getElementById('employerLoginForm');
  if (!form) return;

  const email = document.getElementById('loginEmail');
  const password = document.getElementById('loginPassword');
  const emailError = document.getElementById('loginEmailError');
  const passwordError = document.getElementById('loginPasswordError');
  const status = document.getElementById('loginStatus');
  const passwordToggle = document.getElementById('passwordToggle');
  const submitButton = document.getElementById('employerLoginButton');
  const buttonText = document.getElementById('loginButtonText');

  let submitting = false;

  function clearError(field, element) {
    field.classList.remove('is-invalid');
    element.textContent = '';
    element.hidden = true;
  }

  function showError(field, element, message) {
    field.classList.add('is-invalid');
    element.textContent = message;
    element.hidden = false;
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'login-status login-status--' + type;
    status.hidden = false;
  }

  function clearStatus() {
    status.textContent = '';
    status.className = 'login-status';
    status.hidden = true;
  }

  function validateEmail() {
    clearError(email, emailError);

    const value = email.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showError(
        email,
        emailError,
        'Enter a valid registered official email address.'
      );
      return false;
    }

    return true;
  }

  function validatePassword() {
    clearError(password, passwordError);

    if (!password.value) {
      showError(
        password,
        passwordError,
        'Please enter your password.'
      );
      return false;
    }

    return true;
  }

  function setLoading(loading) {
    submitting = loading;
    submitButton.disabled = loading;
    buttonText.textContent = loading
      ? 'Signing in...'
      : 'Login to Employer Portal';
  }

  function getErrorMessage(result) {
    switch (String(result?.code || '')) {
      case 'INVALID_LOGIN':
      case 'INVALID_CREDENTIALS':
      case 'INVALID_PASSWORD':
      case 'CREDENTIAL_NOT_FOUND':
        return 'Invalid email or password. Please check your login details.';

      case 'ACCOUNT_INACTIVE':
      case 'EMPLOYER_INACTIVE':
      case 'CREDENTIAL_INACTIVE':
        return 'Your employer account is inactive. Please contact the Udayan Care team.';

      default:
        return result?.message || 'Unable to login. Please try again.';
    }
  }

  if (passwordToggle) {
    passwordToggle.addEventListener('click', function () {
      const show = password.type === 'password';

      password.type = show ? 'text' : 'password';
      passwordToggle.textContent = show ? 'Hide' : 'Show';

      passwordToggle.setAttribute(
        'aria-label',
        show ? 'Hide password' : 'Show password'
      );
    });
  }

  email.addEventListener('blur', validateEmail);
  password.addEventListener('blur', validatePassword);

  email.addEventListener('input', function () {
    if (email.classList.contains('is-invalid')) {
      validateEmail();
    }
  });

  password.addEventListener('input', function () {
    if (password.classList.contains('is-invalid')) {
      validatePassword();
    }
  });

  form.addEventListener('submit', async function (event) {

    event.preventDefault();

    if (submitting) return;

    clearStatus();

    const validEmail = validateEmail();
    const validPassword = validatePassword();

    if (!validEmail || !validPassword) {
      showStatus('Please check your login details.', 'error');
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.post !== 'function' ||
      !window.UCPP_SESSION_MANAGER ||
      typeof window.UCPP_SESSION_MANAGER.setSession !== 'function'
    ) {
      showStatus(
        'Login service is temporarily unavailable.',
        'error'
      );
      return;
    }

    setLoading(true);

    try {

      const result = await window.UCPP_API.post('employerLogin', {
        email: email.value.trim().toLowerCase(),
        password: password.value
      });

      if (!result || result.success !== true) {
        showStatus(getErrorMessage(result), 'error');
        password.value = '';
        password.focus();
        return;
      }

      const data = result.data || {};
      const user = data.user || {};
      const sessionToken = String(data.sessionToken || '').trim();
      const employerId = String(user.employerId || '').trim();

      if (!sessionToken || !employerId) {
        throw new Error('INVALID_LOGIN_RESPONSE');
      }

      window.UCPP_SESSION_MANAGER.setSession({
        role: 'employer',
        sessionToken: sessionToken,
        userId: employerId,
        displayName: user.companyName || 'Employer',
        email: user.email || email.value.trim()
      });

      password.value = '';

      showStatus(
        'Login successful. Redirecting...',
        'success'
      );

      window.location.replace('dashboard.html');

    } catch (error) {

      showStatus(
        error.message === 'INVALID_LOGIN_RESPONSE'
          ? 'Unable to create your session. Please try again.'
          : 'Unable to connect to the login service. Please try again.',
        'error'
      );

    } finally {
      setLoading(false);
    }

  });

})();
