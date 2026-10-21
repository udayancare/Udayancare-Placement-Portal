
'use strict';

/*
 * =========================================================
 * UCPP V2 — Employer Registration
 * File: js/employer/register.js
 * Version: 2.0
 *
 * Features:
 * - Full frontend validation
 * - Password Show / Hide
 * - Duplicate email and mobile error handling
 * - Secure backend registration through UCPP_API
 * - Prevent repeated submissions
 * - Redirect to employer login after success
 *
 * Existing Employer Login / Dashboard unaffected.
 * =========================================================
 */

(function () {

  const form = document.getElementById('employerRegisterForm');

  if (!form) return;

  const fields = {
    companyName: document.getElementById('companyName'),
    companyType: document.getElementById('companyType'),
    industry: document.getElementById('industry'),
    website: document.getElementById('website'),
    companyDescription: document.getElementById('companyDescription'),
    contactPerson: document.getElementById('contactPerson'),
    designation: document.getElementById('designation'),
    mobile: document.getElementById('mobile'),
    email: document.getElementById('email'),
    state: document.getElementById('state'),
    district: document.getElementById('district'),
    city: document.getElementById('city'),
    companyAddress: document.getElementById('companyAddress'),
    gstNumber: document.getElementById('gstNumber'),
    password: document.getElementById('password'),
    confirmPassword: document.getElementById('confirmPassword'),
    consent: document.getElementById('consent')
  };

  const errors = {};

  Object.keys(fields).forEach(function (key) {
    errors[key] = document.getElementById(key + 'Error');
  });

  const status = document.getElementById('registerStatus');
  const submitButton = document.getElementById('registerButton');

  let submitting = false;

  function value(key) {
    return String(
      fields[key] && fields[key].value || ''
    ).trim();
  }

  function clearError(key) {
    if (fields[key]) {
      fields[key].classList.remove('is-invalid');
      fields[key].removeAttribute('aria-invalid');
    }

    if (errors[key]) {
      errors[key].textContent = '';
      errors[key].hidden = true;
    }
  }

  function setError(key, message) {
    if (fields[key]) {
      fields[key].classList.add('is-invalid');
      fields[key].setAttribute('aria-invalid', 'true');
    }

    if (errors[key]) {
      errors[key].textContent = message;
      errors[key].hidden = false;
    }

    return false;
  }

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
    status.className =
      'register-status register-status--' + type;
  }

  function requiredText(key, label, minLength) {
    clearError(key);

    if (value(key).length < (minLength || 2)) {
      return setError(
        key,
        'Please enter a valid ' + label + '.'
      );
    }

    return true;
  }

  function validateCompanyName() {
    return requiredText(
      'companyName',
      'company / organization name',
      2
    );
  }

  function validateIndustry() {
    clearError('industry');

    if (!value('industry')) {
      return setError(
        'industry',
        'Please select an industry.'
      );
    }

    return true;
  }

  function validateContactPerson() {
    return requiredText(
      'contactPerson',
      'contact person name',
      2
    );
  }

  function validateDesignation() {
    return requiredText(
      'designation',
      'designation',
      2
    );
  }

  function validateMobile() {
    clearError('mobile');

    if (!/^[6-9]\d{9}$/.test(value('mobile'))) {
      return setError(
        'mobile',
        'Enter a valid 10-digit mobile number.'
      );
    }

    return true;
  }

  function validateEmail() {
    clearError('email');

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email'))
    ) {
      return setError(
        'email',
        'Enter a valid email address.'
      );
    }

    return true;
  }

  function validateState() {
    return requiredText('state', 'state', 2);
  }

  function validateCity() {
    return requiredText('city', 'city', 2);
  }

  function validateWebsite() {
    clearError('website');

    const website = value('website');

    if (!website) return true;

    try {
      const url = new URL(website);

      if (
        url.protocol !== 'https:' &&
        url.protocol !== 'http:'
      ) {
        throw new Error('Invalid protocol');
      }

      if (!url.hostname.includes('.')) {
        throw new Error('Invalid hostname');
      }

      return true;

    } catch (_) {
      return setError(
        'website',
        'Enter a valid website URL starting with https://'
      );
    }
  }

  function validateGST() {
    clearError('gstNumber');

    const gst = value('gstNumber').toUpperCase();

    if (!gst) return true;

    if (
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)
    ) {
      return setError(
        'gstNumber',
        'Enter a valid 15-character GSTIN.'
      );
    }

    return true;
  }

  function validatePassword() {
    clearError('password');

    const password = fields.password.value;

    if (password.length < 8) {
      return setError(
        'password',
        'Password must contain at least 8 characters.'
      );
    }

    if (
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return setError(
        'password',
        'Password must contain at least one letter and one number.'
      );
    }

    return true;
  }

  function validateConfirmPassword() {
    clearError('confirmPassword');

    if (!fields.confirmPassword.value) {
      return setError(
        'confirmPassword',
        'Please confirm your password.'
      );
    }

    if (
      fields.password.value !==
      fields.confirmPassword.value
    ) {
      return setError(
        'confirmPassword',
        'Passwords do not match.'
      );
    }

    return true;
  }

  function validateConsent() {
    clearError('consent');

    if (!fields.consent.checked) {
      return setError(
        'consent',
        'Please confirm the declaration before continuing.'
      );
    }

    return true;
  }

  function validateForm() {
    const results = [
      validateCompanyName(),
      validateIndustry(),
      validateContactPerson(),
      validateDesignation(),
      validateMobile(),
      validateEmail(),
      validateState(),
      validateCity(),
      validateWebsite(),
      validateGST(),
      validatePassword(),
      validateConfirmPassword(),
      validateConsent()
    ];

    return results.every(Boolean);
  }

  /*
   * MOBILE INPUT
   */
  fields.mobile.addEventListener('input', function () {
    this.value = this.value
      .replace(/\D/g, '')
      .slice(0, 10);

    clearError('mobile');
  });

  /*
   * GST INPUT
   */
  fields.gstNumber.addEventListener('input', function () {
    this.value = this.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 15);

    clearError('gstNumber');
  });

  /*
   * PASSWORD SHOW / HIDE
   */
  form.querySelectorAll('.password-toggle')
    .forEach(function (button) {

      button.addEventListener('click', function () {
        const target = document.getElementById(
          this.dataset.target
        );

        if (!target) return;

        const reveal = target.type === 'password';

        target.type = reveal ? 'text' : 'password';
        this.textContent = reveal ? 'Hide' : 'Show';

        this.setAttribute(
          'aria-label',
          reveal ? 'Hide password' : 'Show password'
        );
      });

    });

  /*
   * INDIVIDUAL FIELD VALIDATION
   */
  const validators = {
    companyName: validateCompanyName,
    industry: validateIndustry,
    contactPerson: validateContactPerson,
    designation: validateDesignation,
    mobile: validateMobile,
    email: validateEmail,
    state: validateState,
    city: validateCity,
    website: validateWebsite,
    gstNumber: validateGST,
    password: validatePassword,
    confirmPassword: validateConfirmPassword,
    consent: validateConsent
  };

  Object.keys(validators).forEach(function (key) {
    const field = fields[key];

    if (!field) return;

    field.addEventListener(
      field.tagName === 'SELECT' ||
      field.type === 'checkbox'
        ? 'change'
        : 'blur',
      validators[key]
    );
  });

  fields.password.addEventListener('input', function () {
    if (fields.confirmPassword.value) {
      validateConfirmPassword();
    }
  });

  fields.email.addEventListener('input', function () {
    clearError('email');
  });

  /*
   * BUTTON STATE
   */
  function setSubmitting(active) {
    submitting = active;

    if (!submitButton) return;

    submitButton.disabled = active;

    submitButton.textContent = active
      ? 'Creating Account...'
      : 'Create Employer Account';
  }

  /*
   * ENABLE REGISTRATION
   */
  if (submitButton) {
    submitButton.disabled = false;
    submitButton.removeAttribute('title');
  }

  /*
   * API ERROR HANDLING
   */
  function handleApiError(response) {
    const code = String(
      response && response.code || ''
    ).toUpperCase();

    const message = String(
      response && response.message ||
      'Unable to complete registration. Please try again.'
    );

    const errorFields = {
      EMAIL_ALREADY_REGISTERED: 'email',
      INVALID_EMAIL: 'email',
      MOBILE_ALREADY_REGISTERED: 'mobile',
      INVALID_MOBILE: 'mobile',
      INVALID_PASSWORD: 'password',
      INVALID_WEBSITE: 'website',
      INVALID_GST: 'gstNumber'
    };

    const key = errorFields[code];

    if (key) {
      setError(key, message);

      if (fields[key]) {
        fields[key].focus();
      }
    }

    showStatus(message, 'error');
  }

  /*
   * SUBMIT REGISTRATION
   */
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (submitting) return;

    clearStatus();

    if (!validateForm()) {
      showStatus(
        'Please check the highlighted fields.',
        'error'
      );

      const firstInvalid = form.querySelector(
        '.is-invalid'
      );

      if (firstInvalid) firstInvalid.focus();

      return;
    }

    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.post !== 'function'
    ) {
      showStatus(
        'Registration service is unavailable. Please refresh the page and try again.',
        'error'
      );
      return;
    }

    const payload = {
      companyName: value('companyName'),
      companyType: value('companyType'),
      industry: value('industry'),
      website: value('website'),
      companyDescription: value('companyDescription'),
      contactPerson: value('contactPerson'),
      designation: value('designation'),
      mobile: value('mobile'),
      email: value('email').toLowerCase(),
      state: value('state'),
      district: value('district'),
      city: value('city'),
      companyAddress: value('companyAddress'),
      gstNumber: value('gstNumber').toUpperCase(),
      password: fields.password.value
    };

    setSubmitting(true);

    showStatus(
      'Creating your employer account. Please wait...',
      'info'
    );

    try {
      const response = await window.UCPP_API.post(
        'employerRegister',
        payload
      );

      if (!response || response.success !== true) {
        handleApiError(response);
        return;
      }

      showStatus(
        'Employer account created successfully! Redirecting to login...',
        'success'
      );

      form.reset();

      if (submitButton) {
        submitButton.disabled = true;
      }

      window.setTimeout(function () {
        window.location.assign('login.html');
      }, 1800);

    } catch (error) {
      console.error('Employer registration failed:', error);

      showStatus(
        'Unable to connect to the registration service. Please try again.',
        'error'
      );

    } finally {
      if (
        !status ||
        !status.classList.contains('register-status--success')
      ) {
        setSubmitting(false);
      }
    }
  });

})();
