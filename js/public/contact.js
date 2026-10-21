
'use strict';

/*
 * =========================================================
 * UCPP V2 — PUBLIC CONTACT PAGE
 * Version 2.0
 *
 * Secure enquiry submission through UCPP_API.
 * Existing validation and UI preserved.
 * =========================================================
 */

(function () {

  const form = document.getElementById('contactForm');

  if (!form) return;

  const elements = {
    name: document.getElementById('contactName'),
    mobile: document.getElementById('contactMobile'),
    email: document.getElementById('contactEmail'),
    subject: document.getElementById('contactSubject'),
    message: document.getElementById('contactMessage'),

    nameError: document.getElementById('contactNameError'),
    mobileError: document.getElementById('contactMobileError'),
    emailError: document.getElementById('contactEmailError'),
    subjectError: document.getElementById('contactSubjectError'),
    messageError: document.getElementById('contactMessageError'),

    counter: document.getElementById('messageCounter'),
    status: document.getElementById('contactStatus'),
    submit: document.getElementById('contactSubmit')
  };

  let isSubmitting = false;

  const originalButtonText =
    elements.submit.textContent.trim() || 'Send Enquiry';

  function value(element) {
    return String(element?.value || '').trim();
  }

  function showFieldError(input, errorElement, message) {
    input?.classList.add('is-invalid');

    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = false;
    }
  }

  function clearFieldError(input, errorElement) {
    input?.classList.remove('is-invalid');

    if (errorElement) {
      errorElement.textContent = '';
      errorElement.hidden = true;
    }
  }

  function clearAllErrors() {
    clearFieldError(elements.name, elements.nameError);
    clearFieldError(elements.mobile, elements.mobileError);
    clearFieldError(elements.email, elements.emailError);
    clearFieldError(elements.subject, elements.subjectError);
    clearFieldError(elements.message, elements.messageError);
  }

  function showStatus(message, type = 'info') {
    if (!elements.status) return;

    elements.status.hidden = false;
    elements.status.className =
      'contact-status contact-status--' + type;
    elements.status.textContent = message;
  }

  function clearStatus() {
    if (!elements.status) return;

    elements.status.hidden = true;
    elements.status.className = 'contact-status';
    elements.status.textContent = '';
  }

  function validateName() {
    const name = value(elements.name);

    clearFieldError(elements.name, elements.nameError);

    if (!name) {
      showFieldError(
        elements.name,
        elements.nameError,
        'Please enter your full name.'
      );
      return false;
    }

    if (name.length < 2 || name.length > 100) {
      showFieldError(
        elements.name,
        elements.nameError,
        'Please enter a valid name (2–100 characters).'
      );
      return false;
    }

    return true;
  }

  function validateMobile() {
    const mobile = value(elements.mobile);

    clearFieldError(elements.mobile, elements.mobileError);

    if (!mobile) {
      showFieldError(
        elements.mobile,
        elements.mobileError,
        'Please enter your mobile number.'
      );
      return false;
    }

    if (!/^[6-9][0-9]{9}$/.test(mobile)) {
      showFieldError(
        elements.mobile,
        elements.mobileError,
        'Please enter a valid 10-digit mobile number.'
      );
      return false;
    }

    return true;
  }

  function validateEmail() {
    const email = value(elements.email);

    clearFieldError(elements.email, elements.emailError);

    if (!email) {
      showFieldError(
        elements.email,
        elements.emailError,
        'Please enter your email address.'
      );
      return false;
    }

    if (
      email.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      showFieldError(
        elements.email,
        elements.emailError,
        'Please enter a valid email address.'
      );
      return false;
    }

    return true;
  }

  function validateSubject() {
    const subject = value(elements.subject);

    clearFieldError(elements.subject, elements.subjectError);

    const allowedSubjects = [
      'Candidate Support',
      'Employer Support',
      'Job Opportunity',
      'Portal Support',
      'General Enquiry'
    ];

    if (!allowedSubjects.includes(subject)) {
      showFieldError(
        elements.subject,
        elements.subjectError,
        'Please select a valid enquiry type.'
      );
      return false;
    }

    return true;
  }

  function validateMessage() {
    const message = value(elements.message);

    clearFieldError(elements.message, elements.messageError);

    if (!message) {
      showFieldError(
        elements.message,
        elements.messageError,
        'Please enter your message.'
      );
      return false;
    }

    if (message.length < 10) {
      showFieldError(
        elements.message,
        elements.messageError,
        'Please provide a little more detail about your enquiry.'
      );
      return false;
    }

    if (message.length > 1500) {
      showFieldError(
        elements.message,
        elements.messageError,
        'Message cannot exceed 1500 characters.'
      );
      return false;
    }

    return true;
  }

  function validateForm() {
    clearAllErrors();

    const results = [
      validateName(),
      validateMobile(),
      validateEmail(),
      validateSubject(),
      validateMessage()
    ];

    return results.every(Boolean);
  }

  function updateMessageCounter() {
    if (!elements.counter || !elements.message) return;

    elements.counter.textContent =
      elements.message.value.length + ' / 1500';
  }

  function setSubmitting(submitting) {
    isSubmitting = submitting;

    elements.submit.disabled = submitting;

    elements.submit.textContent = submitting
      ? 'Sending Enquiry...'
      : originalButtonText;

    elements.submit.setAttribute(
      'aria-busy',
      String(submitting)
    );
  }

  /*
   * =======================================================
   * INPUT HANDLERS
   * =======================================================
   */

  elements.mobile?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);

    if (this.classList.contains('is-invalid')) {
      validateMobile();
    }
  });

  elements.message?.addEventListener('input', function () {
    updateMessageCounter();

    if (this.classList.contains('is-invalid')) {
      validateMessage();
    }
  });

  elements.name?.addEventListener('blur', validateName);
  elements.mobile?.addEventListener('blur', validateMobile);
  elements.email?.addEventListener('blur', validateEmail);
  elements.subject?.addEventListener('change', validateSubject);
  elements.message?.addEventListener('blur', validateMessage);

  updateMessageCounter();

  /*
   * =======================================================
   * API SUBMISSION
   * =======================================================
   */

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (isSubmitting) return;

    clearStatus();

    if (!validateForm()) {
      showStatus(
        'Please check the highlighted fields and complete the required information.',
        'error'
      );

      form.querySelector('.is-invalid')?.focus();
      return;
    }

    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.post !== 'function'
    ) {
      showStatus(
        'Enquiry service is currently unavailable. Please try again later.',
        'error'
      );
      return;
    }

    const payload = {
      fullName: value(elements.name),
      mobile: value(elements.mobile),
      email: value(elements.email).toLowerCase(),
      subject: value(elements.subject),
      message: value(elements.message)
    };

    setSubmitting(true);

    showStatus(
      'Please wait while we submit your enquiry...',
      'info'
    );

    try {
      const response = await window.UCPP_API.post(
        'submitEnquiry',
        payload
      );

      if (!response || response.success !== true) {
        const message =
          response?.message ||
          'Unable to submit your enquiry. Please try again.';

        showStatus(message, 'error');
        return;
      }

      const enquiryId = response.data?.enquiryId;

      showStatus(
        'Your enquiry has been submitted successfully.' +
        (enquiryId ? ' Reference ID: ' + enquiryId : '') +
        ' Our team will review your request.',
        'success'
      );

      form.reset();
      clearAllErrors();
      updateMessageCounter();

    } catch (error) {
      console.error('UCPP enquiry submission failed:', error);

      showStatus(
        'Unable to connect to the enquiry service. Please try again later.',
        'error'
      );

    } finally {
      setSubmitting(false);
    }
  });

})();
