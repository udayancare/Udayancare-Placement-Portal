
'use strict';

/*
 * =========================================================
 * UCPP V2 — Employer Company Profile
 * Read-only profile
 * No production data writes
 * =========================================================
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const element = $(id);
    if (element) {
      element.textContent = value == null || value === ''
        ? '—'
        : String(value);
    }
  }

  function setField(id, value) {
    const element = $(id);
    if (element) {
      element.value = value == null ? '' : String(value);
    }
  }

  function show(id, visible) {
    const element = $(id);
    if (element) {
      element.hidden = !visible;
    }
  }

  function getInitials(name) {
    const words = String(name || 'Company')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase() || 'CO';
  }

  function formatDate(value) {
    if (!value) return '';

    const raw = String(value).trim();
    const date = new Date(raw.replace(' ', 'T'));

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /*
   * PROFILE TABS
   */

  function initializeTabs() {

    const tabs = Array.from(
      document.querySelectorAll(
        '.employer-profile-page .profile-tab'
      )
    );

    const sections = Array.from(
      document.querySelectorAll(
        '.employer-profile-page .profile-section'
      )
    );

    tabs.forEach((tab) => {

      tab.addEventListener('click', () => {

        const sectionId = tab.dataset.section;

        const target = $(sectionId);

        if (!target || !sections.includes(target)) {
          return;
        }

        tabs.forEach((item) => {
          const selected = item === tab;

          item.classList.toggle('active', selected);

          item.setAttribute(
            'aria-selected',
            String(selected)
          );
        });

        sections.forEach((section) => {
          const selected = section === target;

          section.classList.toggle('active', selected);
          section.hidden = !selected;
        });

      });

    });

  }

  /*
   * PROFILE DISPLAY
   */

  function renderProfile(profile) {

    const companyName =
      profile.companyName || 'Company';

    const industry =
      profile.industry || 'Industry not specified';

    const verificationStatus =
      profile.verificationStatus || 'Not specified';

    setText('heroCompanyName', companyName);
    setText('heroIndustry', industry);

    setText(
      'heroEmployerId',
      'Employer ID: ' + (profile.employerId || '—')
    );

    setText(
      'heroEmail',
      'Email: ' + (profile.email || '—')
    );

    setText(
      'companyInitials',
      getInitials(companyName)
    );

    setText(
      'heroVerificationStatus',
      verificationStatus
    );

    setText(
      'verificationDescription',
      'Current verification status of your employer account.'
    );

    // Company Information
    setField('companyName', profile.companyName);
    setField('companyType', profile.companyType);
    setField('companyIndustry', profile.industry);
    setField('companyWebsite', profile.website);
    setField('companyDescription', profile.companyDescription);

    // Contact Information
    setField('contactPerson', profile.contactPerson);
    setField('contactDesignation', profile.designation);
    setField('contactMobile', profile.mobile);
    setField('contactEmail', profile.email);

    // Address
    setField('companyState', profile.state);
    setField('companyDistrict', profile.district);
    setField('companyCity', profile.city);
    setField('companyAddress', profile.companyAddress);

    // Verification
    setField('employerId', profile.employerId);
    setField('verificationStatus', verificationStatus);
    setField('gstNumber', profile.gstNumber);
    setField(
      'registrationDate',
      formatDate(profile.registrationDate)
    );
    setField(
      'lastLogin',
      formatDate(profile.lastLogin)
    );

  }

  /*
   * ERROR DISPLAY
   */

  function displayError(message) {

    const alert = $('companyProfileAlert');

    if (!alert) return;

    alert.textContent =
      message || 'Unable to load company profile.';

    alert.hidden = false;

  }

  /*
   * LOAD COMPANY PROFILE
   */

  async function loadCompanyProfile() {

    show('companyProfileAlert', false);
    show('companyProfileSkeleton', true);
    show('companyProfileMain', false);

    try {

      if (
        !API ||
        typeof API.post !== 'function' ||
        !SESSION ||
        typeof SESSION.getSession !== 'function' ||
        typeof SESSION.validateSession !== 'function'
      ) {
        throw new Error(
          'Company profile services are unavailable.'
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

      const validation =
        await SESSION.validateSession();

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
          'Unable to verify your session. Please try again.'
        );

      }

      const result = await API.post(
        'getEmployerProfile',
        {
          sessionToken: session.sessionToken
        }
      );

      if (!result || result.success !== true) {

        const code = String(result?.code || '');

        if (
          code === 'INVALID_SESSION' ||
          code === 'SESSION_EXPIRED' ||
          code === 'SESSION_NOT_FOUND' ||
          code === 'UNAUTHORIZED'
        ) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          result?.message ||
          'Unable to load company profile.'
        );

      }

      if (!result.data || typeof result.data !== 'object') {
        throw new Error(
          'Company profile response is incomplete.'
        );
      }

      renderProfile(result.data);

      show('companyProfileSkeleton', false);
      show('companyProfileMain', true);

    } catch (error) {

      show('companyProfileSkeleton', false);
      show('companyProfileMain', false);

      displayError(
        error?.message ||
        'Unable to load company profile. Please try again.'
      );

    }

  }

  /*
   * INITIALIZATION
   */

  initializeTabs();
  loadCompanyProfile();

})();
