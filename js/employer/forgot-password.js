
'use strict';

/*
 * =========================================================
 * UCPP V2 — EMPLOYER FORGOT PASSWORD
 * =========================================================
 *
 * Email -> OTP -> Reset Token -> New Password -> Success
 *
 * Backend:
 * EMPLOYER_PASSWORD_RESET_SERVICE
 *
 * Security:
 * - OTP and reset token are never logged.
 * - Reset token is stored in memory only.
 * - No candidate authentication actions are used.
 * - No direct Google Sheets access.
 * =========================================================
 */

(function () {
  'use strict';

  const API = window.UCPP_API;

  if (!API) {
    console.error('UCPP_API is not available.');
    return;
  }

  /*
   * API Adapter
   *
   * Uses the existing core API transport.
   * The transport must expose a post(action, body) method.
   * If core/api.js uses a different method, this adapter
   * must be aligned before live testing.
   */

  async function callEmployerApi(action, payload) {
    if (typeof API.post !== 'function') {
      throw new Error(
        'Employer API transport is not configured.'
      );
    }

    const result = await API.post(action, payload);

    if (!result || typeof result.success !== 'boolean') {
      throw new Error('Invalid server response.');
    }

    return result;
  }

  const state = {
    email: '',
    resetToken: '',
    currentStep: 'email',
    resendAvailableAt: 0,
    resendTimer: null,
    busy: false
  };

  const $ = id => document.getElementById(id);

  const el = {
    emailStep: $('emailStep'),
    otpStep: $('otpStep'),
    passwordStep: $('passwordStep'),
    successStep: $('successStep'),

    progressEmail: $('progressEmail'),
    progressOtp: $('progressOtp'),
    progressPassword: $('progressPassword'),

    message: $('forgotMessage'),

    emailForm: $('emailForm'),
    emailInput: $('resetEmail'),
    emailError: $('emailError'),
    sendOtpButton: $('sendOtpButton'),

    otpForm: $('otpForm'),
    otpInput: $('resetOtp'),
    otpError: $('otpError'),
    otpEmailDisplay: $('otpEmailDisplay'),
    verifyOtpButton: $('verifyOtpButton'),
    changeEmailButton: $('changeEmailButton'),
    resendOtpButton: $('resendOtpButton'),

    newPassword: $('newPassword'),
    confirmPassword: $('confirmPassword'),
    newPasswordError: $('newPasswordError'),
    confirmPasswordError: $('confirmPasswordError'),
    passwordForm: $('passwordForm'),
    resetPasswordButton: $('resetPasswordButton'),

    toggleNewPassword: $('toggleNewPassword'),
    toggleConfirmPassword: $('toggleConfirmPassword'),

    ruleLength: $('ruleLength'),
    ruleLetter: $('ruleLetter'),
    ruleNumber: $('ruleNumber')
  };

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validOtp(otp) {
    return /^\d{6}$/.test(otp);
  }

  function passwordRules(password) {
    return {
      length: password.length >= 8 && password.length <= 100,
      letter: /[A-Za-z]/.test(password),
      number: /\d/.test(password)
    };
  }

  function validPassword(password) {
    const rules = passwordRules(password);

    return rules.length && rules.letter && rules.number;
  }

  function fieldError(input, errorElement, message) {
    input?.classList.toggle('is-error', Boolean(message));

    if (errorElement) {
      errorElement.textContent = message || '';
    }
  }

  function clearErrors() {
    [
      [el.emailInput, el.emailError],
      [el.otpInput, el.otpError],
      [el.newPassword, el.newPasswordError],
      [el.confirmPassword, el.confirmPasswordError]
    ].forEach(([input, error]) => {
      fieldError(input, error, '');
    });
  }

  function hideMessage() {
    if (!el.message) return;

    el.message.hidden = true;
    el.message.textContent = '';

    el.message.classList.remove(
      'is-success',
      'is-error',
      'is-info'
    );
  }

  function showMessage(message, type = 'info') {
    if (!el.message) return;

    el.message.textContent = String(message || '');

    el.message.classList.remove(
      'is-success',
      'is-error',
      'is-info'
    );

    el.message.classList.add('is-' + type);
    el.message.hidden = false;
  }

  function setLoading(button, loading) {
    if (!button) return;

    button.disabled = loading;

    const text = button.querySelector('.button-text');
    const loader = button.querySelector('.button-loader');

    if (text) text.style.opacity = loading ? '0.78' : '1';
    if (loader) loader.hidden = !loading;
  }

  function updateProgress(step) {
    const steps = [
      el.progressEmail,
      el.progressOtp,
      el.progressPassword
    ];

    const lines = document.querySelectorAll(
      '.forgot-progress-line'
    );

    steps.forEach(item => {
      item?.classList.remove('is-active', 'is-complete');
    });

    lines.forEach(line => {
      line.classList.remove('is-complete');
    });

    const position = {
      email: 0,
      otp: 1,
      password: 2,
      success: 3
    }[step];

    if (position === undefined) return;

    steps.forEach((item, index) => {
      if (!item) return;

      if (index < position) {
        item.classList.add('is-complete');
      } else if (index === position) {
        item.classList.add('is-active');
      }
    });

    lines.forEach((line, index) => {
      if (index < position) {
        line.classList.add('is-complete');
      }
    });
  }

  function showStep(step) {
    state.currentStep = step;

    el.emailStep.hidden = step !== 'email';
    el.otpStep.hidden = step !== 'otp';
    el.passwordStep.hidden = step !== 'password';
    el.successStep.hidden = step !== 'success';

    updateProgress(step);
    hideMessage();

    const focusTarget = {
      email: el.emailInput,
      otp: el.otpInput,
      password: el.newPassword
    }[step];

    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function stopResendTimer() {
    if (state.resendTimer !== null) {
      clearInterval(state.resendTimer);
      state.resendTimer = null;
    }
  }

  function startResendTimer() {
    stopResendTimer();

    state.resendAvailableAt = Date.now() + 60000;

    function update() {
      const remaining = Math.max(
        0,
        Math.ceil(
          (state.resendAvailableAt - Date.now()) / 1000
        )
      );

      if (remaining === 0) {
        stopResendTimer();

        el.resendOtpButton.disabled = false;
        el.resendOtpButton.textContent = 'Resend code';
        return;
      }

      el.resendOtpButton.disabled = true;
      el.resendOtpButton.textContent =
        'Resend in ' + remaining + 's';
    }

    update();
    state.resendTimer = setInterval(update, 1000);
  }

  function updatePasswordRules() {
    const rules = passwordRules(
      el.newPassword?.value || ''
    );

    el.ruleLength?.classList.toggle(
      'is-valid',
      rules.length
    );

    el.ruleLetter?.classList.toggle(
      'is-valid',
      rules.letter
    );

    el.ruleNumber?.classList.toggle(
      'is-valid',
      rules.number
    );
  }

  function togglePassword(input, button) {
    if (!input || !button) return;

    const show = input.type === 'password';

    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';

    button.setAttribute(
      'aria-label',
      show ? 'Hide password' : 'Show password'
    );
  }

  /*
   * STEP 1 — REQUEST OTP
   */

  async function requestOtp(event) {
    event.preventDefault();

    if (state.busy) return;

    clearErrors();
    hideMessage();

    const email = normalizeEmail(el.emailInput.value);

    if (!validEmail(email)) {
      fieldError(
        el.emailInput,
        el.emailError,
        'Please enter a valid registered email address.'
      );
      el.emailInput.focus();
      return;
    }

    state.busy = true;
    setLoading(el.sendOtpButton, true);

    try {
      const result = await callEmployerApi(
        'employerRequestPasswordReset',
        { email }
      );

      if (!result.success) {
        showMessage(
          result.message || 'Unable to request OTP.',
          'error'
        );
        return;
      }

      state.email = email;
      state.resetToken = '';

      el.otpEmailDisplay.textContent = email;
      el.otpInput.value = '';

      showStep('otp');

      showMessage(
        result.message ||
        'If this email is registered, an OTP will be sent.',
        'info'
      );

      startResendTimer();

    } catch (error) {
      showMessage(
        error.message || 'Unable to connect to server.',
        'error'
      );
    } finally {
      state.busy = false;
      setLoading(el.sendOtpButton, false);
    }
  }

  /*
   * STEP 2 — VERIFY OTP
   */

  async function verifyOtp(event) {
    event.preventDefault();

    if (state.busy) return;

    clearErrors();
    hideMessage();

    const otp = String(el.otpInput.value || '')
      .replace(/\D/g, '')
      .slice(0, 6);

    el.otpInput.value = otp;

    if (!validOtp(otp)) {
      fieldError(
        el.otpInput,
        el.otpError,
        'Enter the 6-digit verification code.'
      );
      return;
    }

    if (!state.email) {
      showStep('email');
      showMessage(
        'Please enter your email again.',
        'error'
      );
      return;
    }

    state.busy = true;
    setLoading(el.verifyOtpButton, true);

    try {
      const result = await callEmployerApi(
        'employerVerifyPasswordResetOTP',
        {
          email: state.email,
          otp
        }
      );

      el.otpInput.value = '';

      if (!result.success) {
        fieldError(
          el.otpInput,
          el.otpError,
          result.message || 'Invalid or expired OTP.'
        );
        return;
      }

      const token = String(
        result.data?.resetToken || ''
      ).trim();

      if (!/^[a-f0-9]{64}$/.test(token)) {
        throw new Error(
          'Unable to start password reset session.'
        );
      }

      state.resetToken = token;

      stopResendTimer();

      el.newPassword.value = '';
      el.confirmPassword.value = '';

      updatePasswordRules();
      showStep('password');

      showMessage(
        'Email verified. Create your new password.',
        'success'
      );

    } catch (error) {
      showMessage(
        error.message || 'Unable to verify OTP.',
        'error'
      );
    } finally {
      state.busy = false;
      setLoading(el.verifyOtpButton, false);
    }
  }

  /*
   * CHANGE EMAIL
   */

  function changeEmail() {
    if (state.busy) return;

    stopResendTimer();

    state.email = '';
    state.resetToken = '';
    el.otpInput.value = '';

    clearErrors();
    showStep('email');
  }

  /*
   * RESEND OTP
   */

  async function resendOtp() {
    if (
      state.busy ||
      !state.email ||
      Date.now() < state.resendAvailableAt
    ) return;

    state.busy = true;
    hideMessage();
    clearErrors();

    el.resendOtpButton.disabled = true;
    el.resendOtpButton.textContent = 'Sending...';

    try {
      const result = await callEmployerApi(
        'employerRequestPasswordReset',
        { email: state.email }
      );

      if (!result.success) {
        showMessage(
          result.message || 'Unable to resend OTP.',
          'error'
        );
        return;
      }

      el.otpInput.value = '';

      showMessage(
        result.message ||
        'A new verification code has been requested.',
        'info'
      );

      startResendTimer();

    } catch (error) {
      showMessage(
        error.message || 'Unable to resend OTP.',
        'error'
      );
    } finally {
      state.busy = false;

      if (!state.resendTimer) {
        el.resendOtpButton.disabled = false;
        el.resendOtpButton.textContent = 'Resend code';
      }
    }
  }

  /*
   * STEP 3 — RESET PASSWORD
   */

  async function resetPassword(event) {
    event.preventDefault();

    if (state.busy) return;

    clearErrors();
    hideMessage();

    const password = el.newPassword.value;
    const confirmPassword = el.confirmPassword.value;

    if (!validPassword(password)) {
      fieldError(
        el.newPassword,
        el.newPasswordError,
        'Use at least 8 characters with a letter and number.'
      );
      return;
    }

    if (!confirmPassword) {
      fieldError(
        el.confirmPassword,
        el.confirmPasswordError,
        'Please confirm your new password.'
      );
      return;
    }

    if (password !== confirmPassword) {
      fieldError(
        el.confirmPassword,
        el.confirmPasswordError,
        'Passwords do not match.'
      );
      return;
    }

    if (!state.email || !state.resetToken) {
      showMessage(
        'Reset session expired. Please request a new OTP.',
        'error'
      );
      return;
    }

    state.busy = true;
    setLoading(el.resetPasswordButton, true);

    try {
      const result = await callEmployerApi(
        'employerResetPassword',
        {
          email: state.email,
          resetToken: state.resetToken,
          newPassword: password
        }
      );

      if (!result.success) {
        if ([
          'RESET_EXPIRED',
          'INVALID_RESET_TOKEN'
        ].includes(result.code)) {
          state.resetToken = '';
          stopResendTimer();

          showStep('email');

          showMessage(
            'Reset session expired. Request a new OTP.',
            'error'
          );
          return;
        }

        showMessage(
          result.message || 'Unable to reset password.',
          'error'
        );
        return;
      }

      state.resetToken = '';
      state.email = '';

      el.newPassword.value = '';
      el.confirmPassword.value = '';
      el.otpInput.value = '';

      stopResendTimer();
      showStep('success');

    } catch (error) {
      showMessage(
        error.message || 'Unable to reset password.',
        'error'
      );
    } finally {
      state.busy = false;
      setLoading(el.resetPasswordButton, false);
    }
  }

  /*
   * EVENTS
   */

  function bindEvents() {
    el.emailForm.addEventListener('submit', requestOtp);
    el.otpForm.addEventListener('submit', verifyOtp);
    el.passwordForm.addEventListener('submit', resetPassword);

    el.otpInput.addEventListener('input', () => {
      el.otpInput.value = el.otpInput.value
        .replace(/\D/g, '')
        .slice(0, 6);

      fieldError(el.otpInput, el.otpError, '');
    });

    el.emailInput.addEventListener('input', () => {
      fieldError(el.emailInput, el.emailError, '');
    });

    el.newPassword.addEventListener('input', () => {
      fieldError(
        el.newPassword,
        el.newPasswordError,
        ''
      );
      updatePasswordRules();
    });

    el.confirmPassword.addEventListener('input', () => {
      fieldError(
        el.confirmPassword,
        el.confirmPasswordError,
        ''
      );
    });

    el.changeEmailButton.addEventListener(
      'click',
      changeEmail
    );

    el.resendOtpButton.addEventListener(
      'click',
      resendOtp
    );

    el.toggleNewPassword.addEventListener(
      'click',
      () => togglePassword(
        el.newPassword,
        el.toggleNewPassword
      )
    );

    el.toggleConfirmPassword.addEventListener(
      'click',
      () => togglePassword(
        el.confirmPassword,
        el.toggleConfirmPassword
      )
    );

    window.addEventListener('pagehide', () => {
      state.resetToken = '';
      stopResendTimer();
    });
  }

  function init() {
    const required = [
      'emailStep',
      'otpStep',
      'passwordStep',
      'successStep',
      'emailForm',
      'otpForm',
      'passwordForm',
      'emailInput',
      'otpInput',
      'newPassword',
      'confirmPassword',
      'resendOtpButton'
    ];

    const missing = required.filter(key => !el[key]);

    if (missing.length) {
      console.error(
        'Employer Forgot Password: missing elements:',
        missing.join(', ')
      );
      return;
    }

    clearErrors();
    hideMessage();
    updatePasswordRules();

    bindEvents();
    showStep('email');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
