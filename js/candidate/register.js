
'use strict';

/*
 * UCPP V2 — Candidate Registration
 * Secure Backend Integration
 */

(function () {

  const form = document.getElementById('candidateRegisterForm');

  if (!form) return;

  const ids = [
    'fullName',
    'mobile',
    'email',
    'currentCity',
    'gender',
    'dob',
    'password',
    'confirmPassword',
    'consent'
  ];

  const fields = Object.fromEntries(
    ids.map(id => [id, document.getElementById(id)])
  );

  const errors = Object.fromEntries(
    ids.map(id => [id, document.getElementById(id + 'Error')])
  );

  const status = document.getElementById('registerStatus');

  const submitButton = form.querySelector(
    'button[type="submit"],input[type="submit"]'
  );

  let submitting = false;

  const val = id =>
    String(fields[id]?.value || '').trim();


  /* FIELD ERRORS */

  function clearError(id) {
    fields[id]?.classList.remove('is-invalid');

    if (errors[id]) {
      errors[id].textContent = '';
      errors[id].hidden = true;
    }
  }

  function setError(id, message) {
    fields[id]?.classList.add('is-invalid');

    if (errors[id]) {
      errors[id].textContent = message;
      errors[id].hidden = false;
    }
  }


  /* STATUS */

  function clearStatus() {
    if (!status) return;

    status.hidden = true;
    status.textContent = '';
    status.className = 'register-status';
  }

  function showStatus(message, type) {
    if (!status) return;

    status.hidden = false;
    status.textContent = message;
    status.className = 'register-status register-status--' + type;
  }


  /* VALIDATION */

  function validateName() {
    clearError('fullName');

    const name = val('fullName').replace(/\s+/g, ' ');

    if (name.length < 2 || name.length > 120) {
      setError('fullName', 'Please enter a valid full name.');
      return false;
    }

    return true;
  }

  function validateMobile() {
    clearError('mobile');

    if (!/^[6-9][0-9]{9}$/.test(val('mobile'))) {
      setError('mobile', 'Enter a valid 10-digit mobile number.');
      return false;
    }

    return true;
  }

  function validateEmail() {
    clearError('email');

    const email = val('email');

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError('email', 'Enter a valid email address.');
      return false;
    }

    return true;
  }

  function validateCity() {
    clearError('currentCity');

    const city = val('currentCity');

    if (city.length < 2 || city.length > 120) {
      setError('currentCity', 'Please enter a valid current city.');
      return false;
    }

    return true;
  }

  function validateGender() {
    clearError('gender');

    if (!val('gender')) {
      setError('gender', 'Please select gender.');
      return false;
    }

    return true;
  }

  function validateDOB() {
    clearError('dob');

    const dob = val('dob');
    const date = new Date(dob + 'T00:00:00Z');

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dob ||
      date.getTime() > Date.now() ||
      date.getUTCFullYear() < 1900
    ) {
      setError('dob', 'Please enter a valid date of birth.');
      return false;
    }

    return true;
  }

  function validatePassword() {
    clearError('password');

    const password = fields.password?.value || '';

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(
        'password',
        'Password must contain at least 8 characters, one letter and one number.'
      );
      return false;
    }

    return true;
  }

  function validateConfirmPassword() {
    clearError('confirmPassword');

    if (!fields.confirmPassword?.value) {
      setError('confirmPassword', 'Please confirm your password.');
      return false;
    }

    if (fields.password.value !== fields.confirmPassword.value) {
      setError('confirmPassword', 'Passwords do not match.');
      return false;
    }

    return true;
  }

  function validateConsent() {
    clearError('consent');

    if (!fields.consent?.checked) {
      setError('consent', 'Please confirm before continuing.');
      return false;
    }

    return true;
  }

  function validateForm() {
    return [
      validateName(),
      validateMobile(),
      validateEmail(),
      validateCity(),
      validateGender(),
      validateDOB(),
      validatePassword(),
      validateConfirmPassword(),
      validateConsent()
    ].every(Boolean);
  }


  /* MOBILE INPUT */

  fields.mobile?.addEventListener('input', function () {
    this.value = this.value
      .replace(/\D/g, '')
      .slice(0, 10);
  });


  /* PASSWORD SHOW / HIDE */

  document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', function () {

      const target = document.getElementById(
        this.dataset.target
      );

      if (!target) return;

      const show = target.type === 'password';

      target.type = show ? 'text' : 'password';

      this.textContent = show ? 'Hide' : 'Show';

      this.setAttribute(
        'aria-label',
        show ? 'Hide password' : 'Show password'
      );
    });
  });


  /* DOB MAX DATE */

  if (fields.dob) {
    const now = new Date();

    const localDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    fields.dob.max = localDate;
  }


  /* FIELD VALIDATION EVENTS */

  [
    ['fullName', 'blur', validateName],
    ['mobile', 'blur', validateMobile],
    ['email', 'blur', validateEmail],
    ['currentCity', 'blur', validateCity],
    ['gender', 'change', validateGender],
    ['dob', 'change', validateDOB],
    ['confirmPassword', 'blur', validateConfirmPassword],
    ['consent', 'change', validateConsent]
  ].forEach(([id, event, fn]) => {
    fields[id]?.addEventListener(event, fn);
  });

  fields.password?.addEventListener('blur', () => {
    validatePassword();

    if (fields.confirmPassword?.value) {
      validateConfirmPassword();
    }
  });


  /* BACKEND ERROR MAPPING */

  const serverErrors = {
    INVALID_NAME: 'fullName',
    INVALID_MOBILE: 'mobile',
    MOBILE_ALREADY_REGISTERED: 'mobile',
    INVALID_EMAIL: 'email',
    EMAIL_ALREADY_REGISTERED: 'email',
    INVALID_CITY: 'currentCity',
    INVALID_GENDER: 'gender',
    INVALID_DOB: 'dob',
    INVALID_PASSWORD: 'password',
    PASSWORD_MISMATCH: 'confirmPassword',
    CONSENT_REQUIRED: 'consent'
  };


  /* REGISTRATION SUBMIT */

  form.addEventListener('submit', async event => {

    event.preventDefault();

    if (submitting) return;

    clearStatus();

    if (!validateForm()) {
      showStatus(
        'Please check the highlighted fields before continuing.',
        'error'
      );

      form.querySelector('.is-invalid')?.focus();
      return;
    }

    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.registerCandidate !== 'function'
    ) {
      showStatus(
        'Registration service is not available. Please refresh and try again.',
        'error'
      );
      return;
    }

    submitting = true;

    const originalText = submitButton
      ? ('value' in submitButton
          ? submitButton.value
          : submitButton.textContent)
      : '';

    if (submitButton) {
      submitButton.disabled = true;

      if ('value' in submitButton) {
        submitButton.value = 'Creating account...';
      } else {
        submitButton.textContent = 'Creating account...';
      }
    }

    showStatus(
      'Creating your account. Please wait...',
      'info'
    );

    try {

      const result = await window.UCPP_API.registerCandidate({

        fullName: val('fullName'),
        mobile: val('mobile'),
        email: val('email').toLowerCase(),
        currentCity: val('currentCity'),
        gender: val('gender'),
        dob: val('dob'),

        password: fields.password.value,
        confirmPassword: fields.confirmPassword.value,
        consent: fields.consent.checked

      });

      if (result?.success === true) {

        showStatus(
          'Registration successful! Redirecting to login...',
          'success'
        );

        form.reset();

window.location.assign('login.html');
        
        return;
      }

      const message = String(
        result?.message || 'Unable to register. Please try again.'
      );

      const field = serverErrors[
        String(result?.code || '')
      ];

      if (field) {
        setError(field, message);
        fields[field]?.focus();
      }

      showStatus(message, 'error');

    } catch (error) {

      showStatus(
        error?.message || 'Network error. Please try again.',
        'error'
      );

    } finally {

      submitting = false;

      if (submitButton) {
        submitButton.disabled = false;

        if ('value' in submitButton) {
          submitButton.value = originalText;
        } else {
          submitButton.textContent = originalText;
        }
      }
    }

  });

})();
