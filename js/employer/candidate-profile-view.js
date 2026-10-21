
'use strict';

/*
 * UCPP V2 - Employer Candidate Profile View v1.4
 *
 * Candidate Digital Resume + Recruitment Decisions
 *
 * - Authorized candidate profile loading
 * - Shortlist / Interview / Reject actions
 * - Confirmation before rejection
 * - Duplicate-click protection
 * - Backend response validation
 * - Status refresh after successful update
 * - No automatic Viewed status update
 *
 * Backend write permission remains independently controlled.
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;
  const $ = (id) => document.getElementById(id);

  const state = {
    sessionToken: '',
    application: null,
    candidate: null,
    experience: [],
    certifications: [],
    socialLinks: {},
    updating: false,
    profileLoaded: false
  };

  const ACTIONS = {
    candidateShortlistButton: 'Shortlisted',
    candidateInterviewButton: 'Interview',
    candidateRejectButton: 'Rejected'
  };

  /* ===================== HELPERS ===================== */

  function getField(object, keys, fallback = '') {
    if (!object || typeof object !== 'object') return fallback;

    for (const key of keys) {
      const value = object[key];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        return value;
      }
    }

    return fallback;
  }

  function setText(id, value) {
    const element = $(id);
    if (!element) return;

    element.textContent =
      value === undefined ||
      value === null ||
      String(value).trim() === ''
        ? '—'
        : String(value);
  }

  function show(id, visible) {
    const element = $(id);
    if (element) element.hidden = !visible;
  }

  function showAlert(message) {
    const element = $('candidateViewAlert');
    if (!element) return;

    element.textContent = message;
    element.className = 'profile-alert error';
    element.hidden = false;
  }

  function clearAlert() {
    const element = $('candidateViewAlert');
    if (!element) return;

    element.textContent = '';
    element.hidden = true;
  }

  function setActionMessage(message, type = 'info') {
    const element = $('candidateActionMessage');
    if (!element) return;

    element.textContent = message;
    element.dataset.state = type;
  }

  function isInvalidSession(result) {
    return [
      'INVALID_SESSION',
      'NO_SESSION',
      'SESSION_EXPIRED',
      'SESSION_NOT_FOUND',
      'UNAUTHORIZED'
    ].includes(String(result?.code || '').toUpperCase());
  }

  function getApplicationId(app) {
    return String(getField(app, [
      'applicationId',
      'Application_ID'
    ])).trim();
  }

  function getCandidateId(app) {
    return String(getField(app, [
      'Candidate_ID',
      'candidateId'
    ])).trim();
  }

  function getStatus(app) {
    return String(getField(app, [
      'applicationStatus',
      'Application_Status',
      'status'
    ], 'Applied')).trim();
  }

  function formatDate(value) {
    if (value === undefined || value === null || value === '') {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function getSafeHttpsUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
      const url = new URL(raw);
      return url.protocol === 'https:' && url.hostname
        ? url.href
        : null;
    } catch (_) {
      return null;
    }
  }

  function createEmptyMessage(message) {
    const element = document.createElement('p');
    element.className = 'candidate-empty-value';
    element.textContent = message;
    return element;
  }

  function isCurrentlyWorking(value) {
    if (value === true || value === 1) return true;

    return [
      'yes', 'true', '1', 'current', 'present'
    ].includes(String(value || '').trim().toLowerCase());
  }

  function setStatus(status) {
    const value = String(status || 'Applied').trim();
    const normalized = value.toLowerCase();

    const allowed = [
      'applied',
      'viewed',
      'shortlisted',
      'interview',
      'rejected'
    ];

    const element = $('candidateApplicationStatus');

    if (element) {
      element.className =
        'status-badge ' +
        (allowed.includes(normalized) ? normalized : '');

      element.textContent = value;
    }

    setText('candidateSidebarStatus', value);
  }

  /* ================= RECRUITMENT ACTIONS ================= */

  function refreshActionButtons() {
    const currentStatus = getStatus(state.application);
    const rejected = currentStatus === 'Rejected';

    Object.entries(ACTIONS).forEach(([id, targetStatus]) => {
      const button = $(id);
      if (!button) return;

      const sameStatus = currentStatus === targetStatus;

      button.disabled =
        !state.profileLoaded ||
        state.updating ||
        rejected ||
        sameStatus;

      button.setAttribute(
        'aria-busy',
        state.updating ? 'true' : 'false'
      );

      button.title = rejected
        ? 'Rejected applications cannot be reopened'
        : sameStatus
          ? 'Candidate already has this status'
          : '';
    });

    if (!state.profileLoaded || state.updating) return;

    if (rejected) {
      setActionMessage(
        'This application has been rejected. Further status changes are disabled.',
        'info'
      );
    } else {
      setActionMessage(
        'Select a recruitment action to update the application status.',
        'info'
      );
    }
  }

  async function updateRecruitmentStatus(newStatus) {
    if (
      state.updating ||
      !state.profileLoaded ||
      !state.application
    ) {
      return;
    }

    const applicationId = getApplicationId(state.application);
    const currentStatus = getStatus(state.application);

    if (!applicationId) {
      setActionMessage('Application ID is missing.', 'error');
      return;
    }

    if (
      currentStatus === 'Rejected' ||
      currentStatus === newStatus
    ) {
      refreshActionButtons();
      return;
    }

    if (newStatus === 'Rejected') {
      const confirmed = window.confirm(
        'Are you sure you want to reject this candidate?\n\n' +
        'Rejected applications cannot be reopened automatically.'
      );

      if (!confirmed) return;
    }

    state.updating = true;
    refreshActionButtons();

    setActionMessage(
      'Updating application status...',
      'info'
    );

    try {
      const result = await API.post(
        'updateEmployerApplicationStatus',
        {
          sessionToken: state.sessionToken,
          applicationId: applicationId,
          status: newStatus
        }
      );

      if (result?.success !== true) {
        if (isInvalidSession(result)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          result?.message ||
          'Unable to update application status.'
        );
      }

      const returnedId = String(
        result.data?.applicationId || ''
      ).trim();

      const returnedStatus = String(
        result.data?.status || ''
      ).trim();

      if (
        returnedId !== applicationId ||
        returnedStatus !== newStatus
      ) {
        throw new Error(
          'Status update response could not be verified. Refresh the page to check the latest status.'
        );
      }

      // Update UI only after verified backend success.
      state.application.Application_Status = returnedStatus;
      state.application.applicationStatus = returnedStatus;

      setStatus(returnedStatus);

      setActionMessage(
        'Application status updated to ' + returnedStatus + '.',
        'success'
      );

    } catch (error) {
      setActionMessage(
        error?.message ||
        'Unable to update application status.',
        'error'
      );

    } finally {
      state.updating = false;

      // Preserve the success/error message.
      const messageElement = $('candidateActionMessage');
      const message = messageElement?.textContent || '';
      const messageType = messageElement?.dataset.state || 'info';

      refreshActionButtons();

      if (messageType === 'success' || messageType === 'error') {
        setActionMessage(message, messageType);
      }
    }
  }

  function initializeRecruitmentActions() {
    Object.entries(ACTIONS).forEach(([id, status]) => {
      const button = $(id);
      if (!button) return;

      button.disabled = true;

      button.addEventListener('click', () => {
        updateRecruitmentStatus(status);
      });
    });
  }

  /* ===================== SKILLS ===================== */

  function renderSkills(value) {
    const container = $('candidateSkills');
    if (!container) return;

    container.replaceChildren();

    const skills = Array.isArray(value)
      ? value
      : String(value || '')
          .split(/[,;\n]+/)
          .map(item => item.trim())
          .filter(Boolean);

    if (!skills.length) {
      container.appendChild(createEmptyMessage('Not provided'));
      return;
    }

    skills.forEach(skill => {
      const tag = document.createElement('span');
      tag.className = 'candidate-skill-tag';
      tag.textContent = String(skill);
      container.appendChild(tag);
    });
  }

  /* ===================== PHOTO ===================== */

  function renderPhoto(url, name) {
    const image = $('candidateProfilePhoto');
    const fallback = $('candidateAvatarFallback');

    const initials = String(name || 'Candidate')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'C';

    if (fallback) {
      fallback.textContent = initials;
      fallback.hidden = false;
    }

    if (!image) return;

    image.hidden = true;
    image.removeAttribute('src');

    const photoUrl = getSafeHttpsUrl(url);
    if (!photoUrl) return;

    image.onload = () => {
      image.hidden = false;
      if (fallback) fallback.hidden = true;
    };

    image.onerror = () => {
      image.hidden = true;
      if (fallback) fallback.hidden = false;
    };

    image.src = photoUrl;
  }

  /* ===================== EXPERIENCE ===================== */

  function renderExperienceDetails() {
    const container = $('candidateExperienceList');
    if (!container) return;

    container.replaceChildren();

    const experiences = Array.isArray(state.experience)
      ? state.experience
      : [];

    if (!experiences.length) {
      container.appendChild(
        createEmptyMessage('No work experience details available.')
      );
      return;
    }

    experiences.forEach(item => {
      if (!item || typeof item !== 'object') return;

      const card = document.createElement('div');
      card.className = 'candidate-experience-item';

      const title = document.createElement('h3');
      title.textContent = getField(
        item,
        ['jobTitle', 'Job_Title'],
        'Job title not provided'
      );

      const company = document.createElement('p');
      company.className = 'candidate-experience-company';
      company.textContent = getField(
        item,
        ['companyName', 'Company_Name'],
        'Company not provided'
      );

      const details = document.createElement('p');
      details.className = 'candidate-experience-meta';

      const parts = [];

      const startDate = getField(item, [
        'startDate', 'Start_Date'
      ]);

      const endDate = getField(item, [
        'endDate', 'End_Date'
      ]);

      const currentlyWorking = getField(item, [
        'currentlyWorking', 'Currently_Working'
      ]);

      if (
        startDate ||
        endDate ||
        isCurrentlyWorking(currentlyWorking)
      ) {
        parts.push(
          (startDate ? formatDate(startDate) : '—') +
          ' – ' +
          (isCurrentlyWorking(currentlyWorking)
            ? 'Present'
            : formatDate(endDate))
        );
      }

      const employmentType = getField(item, [
        'employmentType', 'Employment_Type'
      ]);

      const location = getField(item, [
        'location', 'Location'
      ]);

      if (employmentType) parts.push(String(employmentType));
      if (location) parts.push(String(location));

      details.textContent = parts.join(' | ');

      const description = document.createElement('p');
      description.className = 'candidate-experience-description';
      description.textContent = getField(
        item,
        ['responsibilities', 'Responsibilities'],
        'No responsibilities provided.'
      );

      card.append(title, company);

      if (details.textContent) card.appendChild(details);

      card.appendChild(description);
      container.appendChild(card);
    });

    if (!container.children.length) {
      container.appendChild(
        createEmptyMessage('No work experience details available.')
      );
    }
  }

  /* ===================== CERTIFICATIONS ===================== */

  function renderCertifications() {
    const container = $('candidateCertificationsList');
    if (!container) return;

    container.replaceChildren();

    const certifications = Array.isArray(state.certifications)
      ? state.certifications
      : [];

    if (!certifications.length) {
      container.appendChild(
        createEmptyMessage('No certifications available.')
      );
      return;
    }

    certifications.forEach(item => {
      if (!item || typeof item !== 'object') return;

      const card = document.createElement('div');
      card.className = 'candidate-certification-item';

      const title = document.createElement('h3');
      title.textContent = getField(
        item,
        ['certificationName', 'Certification_Name'],
        'Certification'
      );

      const organization = document.createElement('p');
      organization.className = 'candidate-certification-org';
      organization.textContent = getField(
        item,
        ['issuingOrganization', 'Issuing_Organization'],
        'Organization not provided'
      );

      card.append(title, organization);

      const parts = [];

      const issueDate = getField(item, [
        'issueDate', 'Issue_Date'
      ]);

      const expiryDate = getField(item, [
        'expiryDate', 'Expiry_Date'
      ]);

      if (issueDate) {
        parts.push('Issued: ' + formatDate(issueDate));
      }

      if (expiryDate) {
        parts.push('Expires: ' + formatDate(expiryDate));
      }

      if (parts.length) {
        const dates = document.createElement('p');
        dates.className = 'candidate-certification-meta';
        dates.textContent = parts.join(' | ');
        card.appendChild(dates);
      }

      const description = getField(item, [
        'description', 'Description'
      ]);

      if (description) {
        const element = document.createElement('p');
        element.className = 'candidate-certification-description';
        element.textContent = String(description);
        card.appendChild(element);
      }

      const credentialUrl = getSafeHttpsUrl(
        getField(item, [
          'credentialUrl', 'Credential_URL'
        ])
      );

      if (credentialUrl) {
        const link = document.createElement('a');
        link.href = credentialUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'candidate-credential-link';
        link.textContent = 'View Credential';
        card.appendChild(link);
      }

      container.appendChild(card);
    });

    if (!container.children.length) {
      container.appendChild(
        createEmptyMessage('No certifications available.')
      );
    }
  }

  /* ===================== SOCIAL LINKS ===================== */

  function renderSocialLinks() {
    const container = $('candidateSocialLinks');
    if (!container) return;

    container.replaceChildren();

    const links =
      state.socialLinks &&
      typeof state.socialLinks === 'object' &&
      !Array.isArray(state.socialLinks)
        ? state.socialLinks
        : {};

    const platforms = [
      { key: 'linkedIn', label: 'LinkedIn' },
      { key: 'naukri', label: 'Naukri' },
      { key: 'indeed', label: 'Indeed' },
      { key: 'github', label: 'GitHub' },
      { key: 'portfolio', label: 'Portfolio' },
      { key: 'otherLink', label: 'Other Link' }
    ];

    let count = 0;

    platforms.forEach(platform => {
      const safeUrl = getSafeHttpsUrl(
        getField(links, [platform.key])
      );

      if (!safeUrl) return;

      const link = document.createElement('a');
      link.href = safeUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'candidate-social-link';

      const label = document.createElement('span');
      label.textContent = platform.label;

      const arrow = document.createElement('span');
      arrow.textContent = '↗';
      arrow.setAttribute('aria-hidden', 'true');

      link.append(label, arrow);
      container.appendChild(link);
      count++;
    });

    if (!count) {
      container.appendChild(
        createEmptyMessage('No professional links available.')
      );
    }
  }

  /* ===================== PROFILE RENDER ===================== */

  function renderProfile() {
    const candidate = state.candidate || {};
    const application = state.application || {};

    const name = getField(
      candidate,
      ['fullName', 'Full_Name', 'Candidate_Name', 'candidateName'],
      getField(
        application,
        ['Candidate_Name', 'candidateName'],
        'Candidate'
      )
    );

    const education = getField(candidate, [
      'education', 'Education'
    ]);

    const qualification = getField(candidate, [
      'qualification', 'Qualification'
    ]);

    const experience = getField(candidate, [
      'experience', 'Experience'
    ]);

    const city = getField(candidate, [
      'currentCity', 'Current_City', 'Current City'
    ]);

    setText('candidateFullName', name);

    setText(
      'candidateId',
      getField(
        candidate,
        ['candidateId', 'Candidate_ID'],
        getCandidateId(application)
      )
    );

    setText(
      'candidateApplicationId',
      getApplicationId(application)
    );

    setText(
      'candidateHeadline',
      qualification || education || 'Candidate Digital Resume'
    );

    setText('candidateCurrentCity', city);
    setText('candidateEducationSummary', qualification || education);
    setText('candidateExperienceSummary', experience);

    setText(
      'candidateAbout',
      getField(
        candidate,
        ['aboutCandidate', 'About_Candidate'],
        'Not provided'
      )
    );

    setText('candidateEducation', education);
    setText('candidateQualification', qualification);

    setText(
      'candidatePassingYear',
      getField(candidate, ['passingYear', 'Passing_Year'])
    );

    renderSkills(getField(candidate, ['skills', 'Skills']));

    setText('candidateExperience', experience);

    setText(
      'candidateEmploymentStatus',
      getField(candidate, [
        'employmentStatus', 'Employment_Status'
      ])
    );

    setText(
      'candidatePreferredLocation',
      getField(candidate, [
        'preferredLocation', 'Preferred_Location'
      ])
    );

    setText(
      'candidateExpectedSalary',
      getField(candidate, [
        'expectedSalary', 'Expected_Salary'
      ])
    );

    setText(
      'candidateEmail',
      getField(
        candidate,
        ['email', 'Email'],
        getField(application, [
          'Candidate_Email', 'candidateEmail'
        ])
      )
    );

    setText(
      'candidateMobile',
      getField(
        candidate,
        ['mobile', 'Mobile'],
        getField(application, [
          'Candidate_Mobile', 'candidateMobile'
        ])
      )
    );

    setText('candidateContactCity', city);

    setText(
      'candidateAppliedJob',
      getField(application, ['jobTitle', 'Job_Title'])
    );

    setText(
      'candidateAppliedDate',
      formatDate(getField(application, [
        'appliedDate',
        'Applied_Date',
        'Application_Date',
        'applicationDate'
      ]))
    );

    setText(
      'candidateEmployerNotes',
      getField(
        application,
        [
          'employerRemarks',
          'Employer_Remarks',
          'Employer_Notes',
          'employerNotes'
        ],
        'No notes available.'
      )
    );

    setStatus(getStatus(application));

    renderPhoto(
      getField(candidate, [
        'profilePhotoUrl', 'Profile_Photo_URL'
      ]),
      name
    );
  }

  /* ===================== PROFILE LOADING ===================== */

  function showError(message) {
    state.profileLoaded = false;
    refreshActionButtons();

    show('candidateViewSkeleton', false);
    show('candidateViewContent', false);
    show('candidateViewEmpty', true);

    setText(
      'candidateViewEmptyTitle',
      'Candidate profile unavailable'
    );

    setText('candidateViewEmptyDescription', message);
    showAlert(message);
  }

  async function loadProfile(applicationId) {
    clearAlert();

    state.profileLoaded = false;
    refreshActionButtons();

    show('candidateViewSkeleton', true);
    show('candidateViewContent', false);
    show('candidateViewEmpty', false);

    try {
      const result = await API.post(
        'getEmployerCandidateProfile',
        {
          sessionToken: state.sessionToken,
          applicationId
        }
      );

      if (result?.success !== true) {
        if (isInvalidSession(result)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          result?.message ||
          'Candidate profile is unavailable or access was denied.'
        );
      }

      const data = result.data;

      if (
        !data ||
        typeof data !== 'object' ||
        Array.isArray(data)
      ) {
        throw new Error('Invalid candidate profile response.');
      }

      const application = data.application;

      if (
        !application ||
        typeof application !== 'object' ||
        Array.isArray(application) ||
        getApplicationId(application) !== applicationId
      ) {
        throw new Error('Invalid authorized application response.');
      }

      const candidate = data.profile;

      if (
        !candidate ||
        typeof candidate !== 'object' ||
        Array.isArray(candidate)
      ) {
        throw new Error('Candidate profile data is missing.');
      }

      const authorizedCandidateId = getCandidateId(application);

      const profileCandidateId = String(
        getField(candidate, [
          'candidateId', 'Candidate_ID'
        ])
      ).trim();

      if (
        !profileCandidateId ||
        (
          authorizedCandidateId &&
          profileCandidateId !== authorizedCandidateId
        )
      ) {
        throw new Error(
          'Candidate profile identity verification failed.'
        );
      }

      state.application = application;
      state.candidate = candidate;

      state.experience = Array.isArray(data.experience)
        ? data.experience
        : [];

      state.certifications = Array.isArray(data.certifications)
        ? data.certifications
        : [];

      state.socialLinks =
        data.socialLinks &&
        typeof data.socialLinks === 'object' &&
        !Array.isArray(data.socialLinks)
          ? data.socialLinks
          : {};

      renderProfile();
      renderExperienceDetails();
      renderCertifications();
      renderSocialLinks();

      state.profileLoaded = true;
      refreshActionButtons();

      show('candidateViewSkeleton', false);
      show('candidateViewEmpty', false);
      show('candidateViewContent', true);

    } catch (error) {
      showError(
        error?.message ||
        'Unable to load candidate profile.'
      );
    }
  }

  /* ===================== INITIALIZATION ===================== */

  async function initialize() {
    initializeRecruitmentActions();

    try {
      if (
        !API ||
        typeof API.post !== 'function' ||
        !SESSION ||
        typeof SESSION.getSession !== 'function' ||
        typeof SESSION.validateSession !== 'function'
      ) {
        throw new Error('Employer services are unavailable.');
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

      if (validation?.success !== true) {
        if (isInvalidSession(validation)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          validation?.message ||
          'Unable to validate employer session.'
        );
      }

      state.sessionToken = session.sessionToken;

      const params = new URLSearchParams(window.location.search);

      const applicationId = String(
        params.get('applicationId') || ''
      ).trim();

      if (!applicationId) {
        throw new Error(
          'Application ID is missing from the page URL.'
        );
      }

      await loadProfile(applicationId);

    } catch (error) {
      showError(
        error?.message ||
        'Unable to initialize candidate profile.'
      );
    }
  }

  initialize();

})();
