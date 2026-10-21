
'use strict';

/*
 * =========================================================
 * UCPP V2 — Employer Post Job v2.0
 * Secure Job Publishing
 *
 * Features:
 * - Employer session validation
 * - Company name from employer profile
 * - Application deadline validation
 * - Required field validation
 * - Salary and vacancy validation
 * - Secure backend job publishing
 * - Duplicate submission prevention
 * - Job ID confirmation
 * - Session expiry handling
 * =========================================================
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;

  const form = document.getElementById('postJobForm');
  const publishButton = document.getElementById('publishJobButton');
  const alertBox = document.getElementById('postJobAlert');

  const REQUIRED_FIELDS = [
    'Company_Name',
    'Job_Title',
    'Job_Category',
    'Job_Type',
    'Work_Mode',
    'State',
    'City',
    'Qualification',
    'Job_Description',
    'Vacancies',
    'Application_Last_Date'
  ];

  const EDITABLE_FIELDS = [
    'Company_Name',
    'Job_Title',
    'Job_Category',
    'Job_Type',
    'Work_Mode',
    'State',
    'District',
    'City',
    'Address',
    'Experience',
    'Qualification',
    'Skills',
    'Salary_Min',
    'Salary_Max',
    'Job_Description',
    'Job_Responsibilities',
    'Required_Skills',
    'Vacancies',
    'Application_Last_Date'
  ];

  let employerSessionToken = '';
  let isSubmitting = false;
  let isReady = false;
  let hasPublished = false;

  const originalButtonText = publishButton
    ? publishButton.textContent
    : 'Publish Job';

  function getField(name) {
    return form
      ? form.elements.namedItem(name)
      : null;
  }

  function getValue(name) {
    const field = getField(name);
    return field ? String(field.value || '').trim() : '';
  }

  function showAlert(message, type = 'error') {
    if (!alertBox) return;

    alertBox.textContent = message;
    alertBox.className = 'profile-alert ' + type;
    alertBox.hidden = false;

    if (type === 'success') {
      alertBox.setAttribute('role', 'status');
    } else {
      alertBox.setAttribute('role', 'alert');
    }
  }

  function hideAlert() {
    if (alertBox) {
      alertBox.hidden = true;
      alertBox.textContent = '';
    }
  }

  function clearFieldError(name) {
    const field = getField(name);
    if (!field) return;

    const group = field.closest('.form-group');
    if (group) group.classList.remove('has-error');

    field.removeAttribute('aria-invalid');

    const error = document.querySelector(
      '[data-error-for="' + name + '"]'
    );

    if (error) error.textContent = '';
  }

  function setFieldError(name, message) {
    const field = getField(name);
    if (!field) return;

    const group = field.closest('.form-group');
    if (group) group.classList.add('has-error');

    field.setAttribute('aria-invalid', 'true');

    const error = document.querySelector(
      '[data-error-for="' + name + '"]'
    );

    if (error) error.textContent = message;
  }

  function clearAllErrors() {
    EDITABLE_FIELDS.forEach(clearFieldError);
    hideAlert();
  }

  function getLocalToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return year + '-' + month + '-' + day;
  }

  function configureDeadline() {
    const field = getField('Application_Last_Date');
    if (!field) return;

    field.min = getLocalToday();
  }

  function collectJobData() {
    const job = {};

    EDITABLE_FIELDS.forEach((name) => {
      job[name] = getValue(name);
    });

    return job;
  }

  /*
   * CLIENT-SIDE VALIDATION
   */

  function validateJobForm() {

    clearAllErrors();

    const job = collectJobData();
    let firstInvalidField = null;

    function invalidate(name, message) {
      setFieldError(name, message);

      if (!firstInvalidField) {
        firstInvalidField = getField(name);
      }
    }

    REQUIRED_FIELDS.forEach((name) => {
      if (!job[name]) {
        invalidate(name, 'This field is required.');
      }
    });

    EDITABLE_FIELDS.forEach((name) => {
      const value = job[name];

      if (value.length > 10000) {
        invalidate(name, 'Field exceeds the allowed length.');
      }

      if (
        value &&
        /^[=+\-@\t\r]/.test(value) &&
        name !== 'Salary_Min' &&
        name !== 'Salary_Max'
      ) {
        invalidate(name, 'This value is not allowed.');
      }
    });

    if (job.Vacancies) {
      if (
        !/^[1-9]\d*$/.test(job.Vacancies) ||
        Number(job.Vacancies) > 100000
      ) {
        invalidate(
          'Vacancies',
          'Enter a whole number between 1 and 100000.'
        );
      }
    }

    ['Salary_Min', 'Salary_Max'].forEach((name) => {
      const value = job[name];

      if (
        value &&
        (
          !/^\d+(\.\d{1,2})?$/.test(value) ||
          Number(value) > 100000000
        )
      ) {
        invalidate(name, 'Enter a valid salary amount.');
      }
    });

    if (
      job.Salary_Min &&
      job.Salary_Max &&
      Number(job.Salary_Min) > Number(job.Salary_Max)
    ) {
      invalidate(
        'Salary_Max',
        'Maximum salary cannot be less than minimum salary.'
      );
    }

    if (job.Application_Last_Date) {

      const deadline = job.Application_Last_Date;
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);

      let validDate = false;

      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        const parsed = new Date(year, month - 1, day);

        validDate =
          parsed.getFullYear() === year &&
          parsed.getMonth() === month - 1 &&
          parsed.getDate() === day;
      }

      if (!validDate || deadline < getLocalToday()) {
        invalidate(
          'Application_Last_Date',
          'Select a valid application deadline that is not in the past.'
        );
      }
    }

    if (firstInvalidField) {
      showAlert(
        'Please correct the highlighted fields before continuing.'
      );

      firstInvalidField.focus();
      return false;
    }

    return true;
  }

  /*
   * BUTTON STATE
   */

  function updatePublishButton() {
    if (!publishButton) return;

    publishButton.disabled =
      !isReady || isSubmitting || hasPublished;

    if (isSubmitting) {
      publishButton.textContent = 'Publishing Job...';
    } else if (hasPublished) {
      publishButton.textContent = 'Job Published';
    } else {
      publishButton.textContent = originalButtonText;
    }
  }

  /*
   * LOAD EMPLOYER PROFILE
   */

  async function loadEmployerProfile(sessionToken) {

    const result = await API.post(
      'getEmployerProfile',
      { sessionToken: sessionToken }
    );

    if (!result || result.success !== true) {
      if (
        result &&
        (
          result.code === 'INVALID_SESSION' ||
          result.code === 'SESSION_EXPIRED'
        )
      ) {
        window.location.replace('login.html');
        return false;
      }

      throw new Error(
        result?.message || 'Unable to load employer details.'
      );
    }

    const companyName = String(
      result.data?.companyName || ''
    ).trim();

    const field = getField('Company_Name');

    if (!companyName) {
      throw new Error(
        'Company name is missing from your employer profile.'
      );
    }

    if (field) {
      field.value = companyName;
      field.readOnly = true;
    }

    return true;
  }

  /*
   * PUBLISH JOB
   */

  async function publishJob(event) {

    event.preventDefault();

    if (!isReady || isSubmitting || hasPublished) {
      return;
    }

    if (!validateJobForm()) {
      return;
    }

    const session = SESSION.getSession();

    if (
      !session ||
      session.role !== 'employer' ||
      !session.sessionToken ||
      session.sessionToken !== employerSessionToken
    ) {
      isReady = false;
      updatePublishButton();

      showAlert(
        'Your session has expired. Please login again.'
      );

      return;
    }

    isSubmitting = true;
    updatePublishButton();

    showAlert(
      'Publishing your job. Please wait...',
      'info'
    );

    try {

      const result = await API.post(
        'postEmployerJob',
        {
          sessionToken: employerSessionToken,
          job: collectJobData()
        }
      );

      if (!result || result.success !== true) {

        if (
          result &&
          (
            result.code === 'INVALID_SESSION' ||
            result.code === 'SESSION_EXPIRED' ||
            result.code === 'NO_SESSION'
          )
        ) {
          isReady = false;

          showAlert(
            'Your employer session has expired. Please login again.'
          );

          return;
        }

        throw new Error(
          result?.message || 'Unable to publish job.'
        );
      }

      hasPublished = true;

      const jobId = String(
        result.data?.jobId || ''
      ).trim();

      showAlert(
        jobId
          ? 'Job published successfully! Job ID: ' + jobId
          : 'Job published successfully!',
        'success'
      );

    } catch (error) {

      showAlert(
        error?.message ||
        'Unable to publish job. Please try again.'
      );

    } finally {

      isSubmitting = false;
      updatePublishButton();

    }
  }

  /*
   * INITIALIZATION
   */

  async function initialize() {

    if (!form || !publishButton) return;

    isReady = false;
    updatePublishButton();

    configureDeadline();

    form.addEventListener('submit', publishJob);

    form.addEventListener('input', (event) => {
      const name = event.target?.name;

      if (EDITABLE_FIELDS.includes(name)) {
        clearFieldError(name);
      }
    });

    form.addEventListener('change', (event) => {
      const name = event.target?.name;

      if (EDITABLE_FIELDS.includes(name)) {
        clearFieldError(name);
      }
    });

    try {

      if (
        !API ||
        typeof API.post !== 'function' ||
        !SESSION ||
        typeof SESSION.getSession !== 'function' ||
        typeof SESSION.validateSession !== 'function'
      ) {
        throw new Error(
          'Employer services are unavailable.'
        );
      }

      const session = SESSION.getSession();

      if (
        !session ||
        session.role !== 'employer' ||
        !session.sessionToken
      ) {
        window.location.replace('login.html');
        return;
      }

      const validation = await SESSION.validateSession();

      if (validation.success !== true) {

        if (
          validation.code === 'INVALID_SESSION' ||
          validation.code === 'NO_SESSION'
        ) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          validation.message ||
          'Unable to verify employer session.'
        );
      }

      employerSessionToken = session.sessionToken;

      const profileLoaded = await loadEmployerProfile(
        employerSessionToken
      );

      if (!profileLoaded) return;

      isReady = true;
      updatePublishButton();

    } catch (error) {

      isReady = false;
      updatePublishButton();

      showAlert(
        error?.message ||
        'Unable to initialize the job form.'
      );

    }
  }

  initialize();

})();
