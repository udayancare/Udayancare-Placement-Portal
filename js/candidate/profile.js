
'use strict';

(function () {
  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;

  if (!API || !SESSION) {
    console.error('Profile dependencies are not available.');
    return;
  }

  const state = {
    sessionToken: '',
    profile: {},
    education: [],
    experience: [],
    certifications: [],
    socialLinks: {},
    pendingDelete: null,
    busy: false,
    editing: {
      personal: false,
      professional: false,
      social: false
    }
  };

  const el = {};
  const sections = [
    'basicSection',
    'educationSection',
    'professionalSection',
    'experienceSection',
    'certificationSection',
    'socialSection'
  ];

  const personalFields = [
    'fullName', 'mobile', 'gender', 'dob', 'currentCity'
  ];

  const professionalFields = [
    'preferredLocation', 'education', 'qualification',
    'passingYear', 'employmentStatus', 'experience',
    'expectedSalary', 'skills', 'aboutCandidate'
  ];

  const socialFields = [
    'linkedIn', 'naukri', 'indeed',
    'portfolio', 'github', 'otherLink'
  ];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    bindEvents();
    setDobMax();
    updateAboutCount();
    applyEditModes();

    try {
      if (!await ensureSession()) return;
      await loadProfile();
    } catch (error) {
      console.error('Profile initialization failed:', error);
      showFatalError(error.message || 'Unable to load profile.');
    }
  }

  function cacheElements() {
    const ids = [
      'profileSkeleton', 'profileMain', 'profileAlert',
      'heroName', 'heroMeta', 'heroCandidateId',
      'heroEmail', 'profileInitials', 'completionPercent',
      'completionBar', 'completionText',

      'basicProfileForm', 'saveBasicProfile',
      'editPersonalBtn', 'fullName', 'shaliniId',
      'email', 'mobile', 'gender', 'dob', 'currentCity',

      'professionalProfileForm', 'saveProfessionalProfile',
      'editProfessionalBtn', 'preferredLocation',
      'education', 'qualification', 'passingYear',
      'employmentStatus', 'experience', 'expectedSalary',
      'skills', 'aboutCandidate', 'aboutCount',

      'educationList', 'educationEmpty',
      'addEducationBtn', 'emptyAddEducationBtn',
      'educationNextBtn', 'educationModal',
      'educationModalTitle', 'educationForm',
      'educationId', 'educationLevel',
      'educationQualification', 'institutionName',
      'boardUniversity', 'specialization',
      'educationStatus', 'startYear', 'endYear',
      'educationScore', 'saveEducationBtn',

      'experienceList', 'experienceEmpty',
      'addExperienceBtn', 'emptyAddExperienceBtn',
      'experienceNextBtn', 'experienceModal',
      'experienceModalTitle', 'experienceForm',
      'experienceId', 'companyName', 'jobTitle',
      'employmentType', 'experienceLocation',
      'experienceStartDate', 'experienceEndDate',
      'currentlyWorking', 'responsibilities',
      'saveExperienceBtn',

      'certificationList', 'certificationEmpty',
      'addCertificationBtn', 'emptyAddCertificationBtn',
      'certificationNextBtn', 'certificationModal',
      'certificationModalTitle', 'certificationForm',
      'certificationId', 'certificationName',
      'issuingOrganization', 'issueDate', 'expiryDate',
      'credentialId', 'credentialUrl',
      'certificationDescription', 'saveCertificationBtn',

      'socialLinksForm', 'saveSocialLinks',
      'editSocialBtn', 'linkedIn', 'naukri',
      'indeed', 'portfolio', 'github', 'otherLink',

      'confirmModal', 'confirmTitle', 'confirmMessage',
      'cancelConfirmBtn', 'confirmDeleteBtn'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!state.busy) switchSection(tab.dataset.section);
      });
    });

    on('basicProfileForm', 'submit', savePersonal);
    on('professionalProfileForm', 'submit', saveProfessional);
    on('socialLinksForm', 'submit', saveSocialLinks);

    on('editPersonalBtn', 'click', () => {
      setEditMode('personal', !state.editing.personal);
    });

    on('editProfessionalBtn', 'click', () => {
      setEditMode('professional', !state.editing.professional);
    });

    on('editSocialBtn', 'click', () => {
      setEditMode('social', !state.editing.social);
    });

    on('aboutCandidate', 'input', updateAboutCount);

    on('addEducationBtn', 'click', () => openEducationModal());
    on('emptyAddEducationBtn', 'click', () => openEducationModal());
    on('educationForm', 'submit', saveEducation);
    on('educationList', 'click', handleEducationAction);

    on('addExperienceBtn', 'click', () => openExperienceModal());
    on('emptyAddExperienceBtn', 'click', () => openExperienceModal());
    on('experienceForm', 'submit', saveExperience);
    on('experienceList', 'click', handleExperienceAction);
    on('currentlyWorking', 'change', handleCurrentlyWorking);

    on('addCertificationBtn', 'click', () => openCertificationModal());
    on('emptyAddCertificationBtn', 'click', () => openCertificationModal());
    on('certificationForm', 'submit', saveCertification);
    on('certificationList', 'click', handleCertificationAction);

    on('educationNextBtn', 'click', () => switchSection('professionalSection'));
    on('experienceNextBtn', 'click', () => switchSection('certificationSection'));
    on('certificationNextBtn', 'click', () => switchSection('socialSection'));

    document.querySelectorAll('[data-close-modal]').forEach(button => {
      button.addEventListener('click', () => {
        if (!state.busy) closeModal(button.dataset.closeModal);
      });
    });

    on('cancelConfirmBtn', 'click', closeConfirm);
    on('confirmDeleteBtn', 'click', executeDelete);
    document.addEventListener('keydown', handleEscape);
  }

  function on(id, eventName, handler) {
    if (el[id]) el[id].addEventListener(eventName, handler);
  }

  async function ensureSession() {
    const session = SESSION.getSession();

    if (!session || !session.sessionToken || session.role !== 'candidate') {
      redirectLogin();
      return false;
    }

    state.sessionToken = session.sessionToken;

    let result;
    try {
      result = await API.validateCandidateSession(state.sessionToken);
    } catch (error) {
      throw new Error('Unable to verify session. Please check your connection.');
    }

    if (!result || result.success !== true) {
      if (isInvalidSession(result)) {
        handleExpiredSession();
        return false;
      }
      throw new Error(result?.message || 'Unable to verify session.');
    }

    return true;
  }

  async function loadProfile() {
    setLoading(true);
    try {
      await refreshProfileData();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }

  async function refreshProfileData() {
    const result = await API.getCandidateProfile(state.sessionToken);

    if (!result || result.success !== true) {
      if (isInvalidSession(result)) {
        handleExpiredSession();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(result?.message || 'Unable to load profile.');
    }

    const data = result.data || {};

    state.profile = data.profile || {};
    state.education = Array.isArray(data.education) ? data.education : [];
    state.experience = Array.isArray(data.experience) ? data.experience : [];
    state.certifications = Array.isArray(data.certifications) ? data.certifications : [];
    state.socialLinks = data.socialLinks || {};

    renderAll(data);
  }

  function renderAll(data) {
    renderHero();
    populateProfileFields();
    renderCompletion(data.profileCompletion);
    renderEducation();
    renderExperience();
    renderCertifications();
    populateSocialLinks();
    applyEditModes();
  }

  function renderHero() {
    const p = state.profile;
    const name = value(p.fullName, 'Candidate');

    el.heroName.textContent = name;

    const meta = [
      p.qualification,
      p.currentCity,
      p.employmentStatus
    ].filter(Boolean);

    el.heroMeta.textContent = meta.length
      ? meta.join(' • ')
      : 'Complete your profile to help employers know you better.';

    el.heroCandidateId.textContent =
      'Candidate ID: ' + value(p.candidateId, '--');

    el.heroEmail.textContent =
      'Email: ' + value(p.email, '--');

    el.profileInitials.textContent = getInitials(name);
  }

  function populateProfileFields() {
    const p = state.profile;

    [...personalFields, ...professionalFields].forEach(field => {
      setValue(el[field], field === 'dob'
        ? toDateInput(p[field])
        : p[field]);
    });

    setValue(el.shaliniId, p.shaliniId);
    setValue(el.email, p.email);
    updateAboutCount();
  }

  function renderCompletion(completion) {
    let percent = 0;

    if (typeof completion === 'number') {
      percent = completion;
    } else if (completion && typeof completion === 'object') {
      percent = Number(
        completion.percentage ??
        completion.percent ??
        completion.completion ??
        completion.value ??
        0
      );
    }

    percent = Math.round(
      Math.max(0, Math.min(100, Number(percent) || 0))
    );

    el.completionPercent.textContent = percent + '%';
    el.completionBar.style.width = percent + '%';

    el.completionText.textContent =
      percent >= 100
        ? 'Great! Your profile is complete.'
        : percent >= 75
          ? 'Almost there. Add the remaining details.'
          : percent >= 40
            ? 'Good progress. Add more details to strengthen your profile.'
            : 'Complete your profile to improve visibility.';
  }

  // ============================================
  // READ ONLY / EDIT MODE
  // ============================================

  function setEditMode(type, enabled) {
    if (state.busy) return;

    if (!enabled) {
      if (type === 'personal' || type === 'professional') {
        populateProfileFields();
      } else if (type === 'social') {
        populateSocialLinks();
      }
    }

    state.editing[type] = enabled;
    applyEditModes();
  }

  function applyEditModes() {
    applyFormMode('personal', personalFields, 'editPersonalBtn', 'saveBasicProfile');
    applyFormMode('professional', professionalFields, 'editProfessionalBtn', 'saveProfessionalProfile');
    applyFormMode('social', socialFields, 'editSocialBtn', 'saveSocialLinks');

    if (el.shaliniId) el.shaliniId.disabled = true;
    if (el.email) el.email.disabled = true;
  }

  function applyFormMode(type, fields, editButtonId, saveButtonId) {
    const editing = state.editing[type];

    fields.forEach(id => {
      if (el[id]) el[id].disabled = !editing;
    });

    if (el[editButtonId]) {
      el[editButtonId].textContent = editing ? 'Cancel Editing' : 'Edit';
      el[editButtonId].setAttribute('aria-pressed', String(editing));
    }

    if (el[saveButtonId]) {
      el[saveButtonId].hidden = !editing;
    }
  }

  // ============================================
  // PERSONAL + PROFESSIONAL SAVE
  // ============================================

  function collectFields(fields) {
    const result = {};
    fields.forEach(field => {
      result[field] = el[field]?.value?.trim() || '';
    });
    return result;
  }

  function validateProfile(profile) {
    clearFieldErrors();
    let valid = true;

    if (profile.fullName !== undefined &&
        profile.fullName.length < 2) {
      setFieldError('fullName', 'Please enter your full name.');
      valid = false;
    }

    if (profile.mobile &&
        !/^[6-9]\d{9}$/.test(profile.mobile)) {
      setFieldError('mobile', 'Enter a valid 10-digit mobile number.');
      valid = false;
    }

    if (profile.dob) {
      const dob = new Date(profile.dob + 'T00:00:00');
      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        setFieldError('dob', 'Enter a valid date of birth.');
        valid = false;
      }
    }

    if (profile.passingYear) {
      const year = Number(profile.passingYear);
      if (!Number.isInteger(year) ||
          year < 1950 ||
          year > new Date().getFullYear() + 10) {
        setFieldError('passingYear', 'Enter a valid passing year.');
        valid = false;
      }
    }

    return valid;
  }

  async function savePersonal(event) {
    event.preventDefault();
    if (!state.editing.personal || state.busy) return;

    const profile = collectFields(personalFields);
    if (!validateProfile(profile)) return;

    await saveProfileSection(
      profile, 'personal', 'saveBasicProfile',
      'educationSection'
    );
  }

  async function saveProfessional(event) {
    event.preventDefault();
    if (!state.editing.professional || state.busy) return;

    const profile = collectFields(professionalFields);
    if (!validateProfile(profile)) return;

    await saveProfileSection(
      profile, 'professional', 'saveProfessionalProfile',
      'experienceSection'
    );
  }

  async function saveProfileSection(profile, type, buttonId, nextSection) {
    setBusy(true);
    setButtonLoading(el[buttonId], true);

    try {
      const result = await API.updateCandidateProfile(
        state.sessionToken,
        profile
      );

      checkResult(result, 'Unable to update profile.');

      await refreshProfileData();

      state.editing[type] = false;
      applyEditModes();

      showAlert(result.message || 'Profile saved successfully.', 'success');
      switchSection(nextSection);
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setButtonLoading(el[buttonId], false);
      setBusy(false);
    }
  }

  // ============================================
  // EDUCATION CRUD
  // ============================================

  function getEducationId(record) {
    return String(record?.educationId ?? record?.id ?? '');
  }

  function renderEducation() {
    el.educationList.innerHTML = '';

    if (!state.education.length) {
      el.educationEmpty.hidden = false;
      return;
    }

    el.educationEmpty.hidden = true;

    state.education.forEach(record => {
      const id = getEducationId(record);
      const title = value(record.qualification, 'Qualification');
      const institution = value(record.institutionName, '');
      const meta = [
        record.educationLevel,
        record.boardUniversity,
        [record.startYear, record.endYear].filter(Boolean).join(' - '),
        record.educationStatus,
        record.score
      ].filter(Boolean);

      const card = document.createElement('article');
      card.className = 'record-card';

      card.innerHTML =
        '<div class="record-card-top">' +
          '<div class="record-card-main">' +
            '<h3>' + escapeHtml(title) + '</h3>' +
            (institution
              ? '<p class="record-subtitle">' + escapeHtml(institution) + '</p>'
              : '') +
            '<div class="record-meta">' +
              meta.map(item =>
                '<span>' + escapeHtml(item) + '</span>'
              ).join('') +
            '</div>' +
          '</div>' +
          '<div class="record-actions">' +
            '<button type="button" class="record-action" ' +
              'data-action="edit-education" data-id="' +
              escapeAttribute(id) + '">Edit</button>' +
            '<button type="button" class="record-action delete" ' +
              'data-action="delete-education" data-id="' +
              escapeAttribute(id) + '">Delete</button>' +
          '</div>' +
        '</div>' +
        (record.specialization
          ? '<p class="record-description">' +
            escapeHtml(record.specialization) + '</p>'
          : '');

      el.educationList.appendChild(card);
    });
  }

  function handleEducationAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || state.busy) return;

    const id = button.dataset.id;

    if (button.dataset.action === 'edit-education') {
      const record = state.education.find(
        item => getEducationId(item) === id
      );
      if (record) openEducationModal(record);
    }

    if (button.dataset.action === 'delete-education') {
      openConfirm({
        type: 'education',
        id,
        title: 'Delete education?',
        message: 'This education record will be removed from your profile.'
      });
    }
  }

  function openEducationModal(record = null) {
    if (state.busy) return;

    el.educationForm.reset();
    setValue(el.educationId, record ? getEducationId(record) : '');

    el.educationModalTitle.textContent =
      record ? 'Edit Education' : 'Add Education';

    if (record) {
      setValue(el.educationLevel, record.educationLevel);
      setValue(el.educationQualification, record.qualification);
      setValue(el.institutionName, record.institutionName);
      setValue(el.boardUniversity, record.boardUniversity);
      setValue(el.specialization, record.specialization);
      setValue(el.educationStatus, record.educationStatus || 'Completed');
      setValue(el.startYear, record.startYear);
      setValue(el.endYear, record.endYear);
      setValue(el.educationScore, record.score);
    }

    openModal(el.educationModal);
    el.educationLevel.focus();
  }

  async function saveEducation(event) {
    event.preventDefault();
    if (state.busy) return;

    const education = {
      educationId: el.educationId.value.trim(),
      educationLevel: el.educationLevel.value.trim(),
      qualification: el.educationQualification.value.trim(),
      institutionName: el.institutionName.value.trim(),
      boardUniversity: el.boardUniversity.value.trim(),
      specialization: el.specialization.value.trim(),
      startYear: el.startYear.value.trim(),
      endYear: el.endYear.value.trim(),
      educationStatus: el.educationStatus.value.trim(),
      score: el.educationScore.value.trim()
    };

    if (!education.educationLevel ||
        !education.qualification ||
        !education.institutionName) {
      showAlert(
        'Education Level, Qualification and Institution Name are required.',
        'error'
      );
      return;
    }

    const maxYear = new Date().getFullYear() + 10;

    for (const key of ['startYear', 'endYear']) {
      if (!education[key]) continue;

      const year = Number(education[key]);
      if (!Number.isInteger(year) || year < 1950 || year > maxYear) {
        showAlert('Please enter a valid education year.', 'error');
        return;
      }
    }

    if (education.startYear && education.endYear &&
        Number(education.endYear) < Number(education.startYear)) {
      showAlert('End Year cannot be earlier than Start Year.', 'error');
      return;
    }

    setBusy(true);
    setButtonLoading(el.saveEducationBtn, true);

    try {
      const result = await API.saveCandidateEducation(
        state.sessionToken,
        education
      );

      checkResult(result, 'Unable to save education.');

      await refreshProfileData();
      closeModal('education');
      showAlert(result.message || 'Education saved successfully.', 'success');
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setButtonLoading(el.saveEducationBtn, false);
      setBusy(false);
    }
  }

  // ============================================
  // EXPERIENCE CRUD
  // ============================================

  function getExperienceId(record) {
    return String(record?.experienceId ?? record?.id ?? '');
  }

  function renderExperience() {
    el.experienceList.innerHTML = '';

    if (!state.experience.length) {
      el.experienceEmpty.hidden = false;
      return;
    }

    el.experienceEmpty.hidden = true;

    state.experience.forEach(record => {
      const id = getExperienceId(record);
      const title = value(record.jobTitle, 'Role not specified');
      const company = value(record.companyName, 'Company');

      const meta = [
        record.employmentType,
        formatDateRange(
          record.startDate,
          record.endDate,
          isTrue(record.currentlyWorking)
        ),
        record.location
      ].filter(Boolean);

      const card = document.createElement('article');
      card.className = 'record-card';

      card.innerHTML =
        '<div class="record-card-top">' +
          '<div class="record-card-main">' +
            '<h3>' + escapeHtml(title) + '</h3>' +
            '<p class="record-subtitle">' + escapeHtml(company) + '</p>' +
            '<div class="record-meta">' +
              meta.map(item =>
                '<span>' + escapeHtml(item) + '</span>'
              ).join('') +
            '</div>' +
          '</div>' +
          '<div class="record-actions">' +
            '<button type="button" class="record-action" ' +
              'data-action="edit-experience" data-id="' +
              escapeAttribute(id) + '">Edit</button>' +
            '<button type="button" class="record-action delete" ' +
              'data-action="delete-experience" data-id="' +
              escapeAttribute(id) + '">Delete</button>' +
          '</div>' +
        '</div>' +
        (record.responsibilities
          ? '<p class="record-description">' +
            escapeHtml(record.responsibilities) + '</p>'
          : '');

      el.experienceList.appendChild(card);
    });
  }

  function handleExperienceAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || state.busy) return;

    const id = button.dataset.id;

    if (button.dataset.action === 'edit-experience') {
      const record = state.experience.find(
        item => getExperienceId(item) === id
      );
      if (record) openExperienceModal(record);
    }

    if (button.dataset.action === 'delete-experience') {
      openConfirm({
        type: 'experience',
        id,
        title: 'Delete experience?',
        message: 'This work experience will be removed from your profile.'
      });
    }
  }

  function openExperienceModal(record = null) {
    if (state.busy) return;

    el.experienceForm.reset();
    setValue(el.experienceId, record ? getExperienceId(record) : '');

    el.experienceModalTitle.textContent =
      record ? 'Edit Experience' : 'Add Experience';

    if (record) {
      setValue(el.companyName, record.companyName);
      setValue(el.jobTitle, record.jobTitle);
      setValue(el.employmentType, record.employmentType);
      setValue(el.experienceLocation, record.location);
      setValue(el.experienceStartDate, toDateInput(record.startDate));
      setValue(el.experienceEndDate, toDateInput(record.endDate));
      el.currentlyWorking.checked = isTrue(record.currentlyWorking);
      setValue(el.responsibilities, record.responsibilities);
    }

    handleCurrentlyWorking();
    openModal(el.experienceModal);
    el.companyName.focus();
  }

  async function saveExperience(event) {
    event.preventDefault();
    if (state.busy) return;

    const experience = {
      experienceId: el.experienceId.value.trim(),
      companyName: el.companyName.value.trim(),
      jobTitle: el.jobTitle.value.trim(),
      employmentType: el.employmentType.value.trim(),
      startDate: el.experienceStartDate.value,
      endDate: el.currentlyWorking.checked
        ? '' : el.experienceEndDate.value,
      currentlyWorking: el.currentlyWorking.checked,
      location: el.experienceLocation.value.trim(),
      responsibilities: el.responsibilities.value.trim()
    };

    if (!experience.companyName || !experience.jobTitle) {
      showAlert('Company Name and Job Title are required.', 'error');
      return;
    }

    if (experience.startDate && experience.endDate &&
        experience.endDate < experience.startDate) {
      showAlert('End Date cannot be earlier than Start Date.', 'error');
      return;
    }

    setBusy(true);
    setButtonLoading(el.saveExperienceBtn, true);

    try {
      const result = await API.saveCandidateExperience(
        state.sessionToken,
        experience
      );

      checkResult(result, 'Unable to save experience.');
      await refreshProfileData();
      closeModal('experience');
      showAlert(result.message || 'Experience saved successfully.', 'success');
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setButtonLoading(el.saveExperienceBtn, false);
      setBusy(false);
    }
  }

  function handleCurrentlyWorking() {
    el.experienceEndDate.disabled = el.currentlyWorking.checked;
    if (el.currentlyWorking.checked) el.experienceEndDate.value = '';
  }

  // ============================================
  // CERTIFICATIONS CRUD
  // ============================================

  function getCertificationId(record) {
    return String(record?.certificationId ?? record?.id ?? '');
  }

  function renderCertifications() {
    el.certificationList.innerHTML = '';

    if (!state.certifications.length) {
      el.certificationEmpty.hidden = false;
      return;
    }

    el.certificationEmpty.hidden = true;

    state.certifications.forEach(record => {
      const id = getCertificationId(record);
      const name = value(record.certificationName, 'Certification');
      const organization = value(record.issuingOrganization, '');

      const meta = [
        record.issueDate
          ? 'Issued ' + formatDisplayDate(record.issueDate) : '',
        record.expiryDate
          ? 'Expires ' + formatDisplayDate(record.expiryDate) : '',
        record.credentialId
          ? 'Credential ID: ' + record.credentialId : ''
      ].filter(Boolean);

      const card = document.createElement('article');
      card.className = 'record-card';

      card.innerHTML =
        '<div class="record-card-top">' +
          '<div class="record-card-main">' +
            '<h3>' + escapeHtml(name) + '</h3>' +
            (organization
              ? '<p class="record-subtitle">' +
                escapeHtml(organization) + '</p>'
              : '') +
            '<div class="record-meta">' +
              meta.map(item =>
                '<span>' + escapeHtml(item) + '</span>'
              ).join('') +
            '</div>' +
          '</div>' +
          '<div class="record-actions">' +
            '<button type="button" class="record-action" ' +
              'data-action="edit-certification" data-id="' +
              escapeAttribute(id) + '">Edit</button>' +
            '<button type="button" class="record-action delete" ' +
              'data-action="delete-certification" data-id="' +
              escapeAttribute(id) + '">Delete</button>' +
          '</div>' +
        '</div>' +
        (record.description
          ? '<p class="record-description">' +
            escapeHtml(record.description) + '</p>'
          : '') +
        (record.credentialUrl && isValidUrl(record.credentialUrl)
          ? '<a class="record-link" href="' +
            escapeAttribute(record.credentialUrl) +
            '" target="_blank" rel="noopener noreferrer">' +
            'View Credential ↗</a>'
          : '');

      el.certificationList.appendChild(card);
    });
  }

  function handleCertificationAction(event) {
    const button = event.target.closest('[data-action]');
    if (!button || state.busy) return;

    const id = button.dataset.id;

    if (button.dataset.action === 'edit-certification') {
      const record = state.certifications.find(
        item => getCertificationId(item) === id
      );
      if (record) openCertificationModal(record);
    }

    if (button.dataset.action === 'delete-certification') {
      openConfirm({
        type: 'certification',
        id,
        title: 'Delete certification?',
        message: 'This certification will be removed from your profile.'
      });
    }
  }

  function openCertificationModal(record = null) {
    if (state.busy) return;

    el.certificationForm.reset();
    setValue(el.certificationId, record ? getCertificationId(record) : '');

    el.certificationModalTitle.textContent =
      record ? 'Edit Certification' : 'Add Certification';

    if (record) {
      setValue(el.certificationName, record.certificationName);
      setValue(el.issuingOrganization, record.issuingOrganization);
      setValue(el.issueDate, toDateInput(record.issueDate));
      setValue(el.expiryDate, toDateInput(record.expiryDate));
      setValue(el.credentialId, record.credentialId);
      setValue(el.credentialUrl, record.credentialUrl);
      setValue(el.certificationDescription, record.description);
    }

    openModal(el.certificationModal);
    el.certificationName.focus();
  }

  async function saveCertification(event) {
    event.preventDefault();
    if (state.busy) return;

    const certification = {
      certificationId: el.certificationId.value.trim(),
      certificationName: el.certificationName.value.trim(),
      issuingOrganization: el.issuingOrganization.value.trim(),
      issueDate: el.issueDate.value,
      expiryDate: el.expiryDate.value,
      credentialId: el.credentialId.value.trim(),
      credentialUrl: el.credentialUrl.value.trim(),
      description: el.certificationDescription.value.trim()
    };

    if (!certification.certificationName) {
      showAlert('Certification Name is required.', 'error');
      return;
    }

    if (certification.issueDate && certification.expiryDate &&
        certification.expiryDate < certification.issueDate) {
      showAlert('Expiry Date cannot be earlier than Issue Date.', 'error');
      return;
    }

    if (certification.credentialUrl &&
        !isValidUrl(certification.credentialUrl)) {
      showAlert('Please enter a valid Credential URL.', 'error');
      return;
    }

    setBusy(true);
    setButtonLoading(el.saveCertificationBtn, true);

    try {
      const result = await API.saveCandidateCertification(
        state.sessionToken,
        certification
      );

      checkResult(result, 'Unable to save certification.');
      await refreshProfileData();
      closeModal('certification');
      showAlert(result.message || 'Certification saved successfully.', 'success');
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setButtonLoading(el.saveCertificationBtn, false);
      setBusy(false);
    }
  }

  // ============================================
  // SOCIAL LINKS
  // ============================================

  function populateSocialLinks() {
    socialFields.forEach(field => {
      setValue(el[field], state.socialLinks?.[field]);
    });
  }

  async function saveSocialLinks(event) {
    event.preventDefault();
    if (!state.editing.social || state.busy) return;

    const links = collectFields(socialFields);

    const labels = {
      linkedIn: 'LinkedIn',
      naukri: 'Naukri',
      indeed: 'Indeed',
      portfolio: 'Portfolio',
      github: 'GitHub',
      otherLink: 'Other Professional Link'
    };

    for (const [key, url] of Object.entries(links)) {
      if (url && !isValidUrl(url)) {
        showAlert('Please enter a valid ' + labels[key] + ' URL.', 'error');
        return;
      }
    }

    setBusy(true);
    setButtonLoading(el.saveSocialLinks, true);

    try {
      const result = await API.saveCandidateSocialLinks(
        state.sessionToken,
        links
      );

      checkResult(result, 'Unable to save professional links.');
      await refreshProfileData();

      state.editing.social = false;
      applyEditModes();

      showAlert(result.message || 'Profile saved successfully.', 'success');
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setButtonLoading(el.saveSocialLinks, false);
      setBusy(false);
    }
  }

  // ============================================
  // DELETE CONFIRMATION
  // ============================================

  function openConfirm(config) {
    if (state.busy) return;

    state.pendingDelete = config;
    el.confirmTitle.textContent = config.title || 'Delete record?';
    el.confirmMessage.textContent =
      config.message || 'This action cannot be undone.';

    el.confirmModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeConfirm() {
    if (state.busy) return;

    state.pendingDelete = null;
    el.confirmModal.hidden = true;

    if (!isAnyModalOpen()) {
      document.body.classList.remove('modal-open');
    }
  }

  async function executeDelete() {
    const pending = state.pendingDelete;
    if (!pending || state.busy) return;

    setBusy(true);
    setButtonLoading(el.confirmDeleteBtn, true, 'Deleting...');

    try {
      let result;

      if (pending.type === 'education') {
        result = await API.deleteCandidateEducation(
          state.sessionToken, pending.id
        );
      } else if (pending.type === 'experience') {
        result = await API.deleteCandidateExperience(
          state.sessionToken, pending.id
        );
      } else if (pending.type === 'certification') {
        result = await API.deleteCandidateCertification(
          state.sessionToken, pending.id
        );
      } else {
        throw new Error('Invalid delete request.');
      }

      checkResult(result, 'Unable to delete record.');
      await refreshProfileData();

      state.pendingDelete = null;
      el.confirmModal.hidden = true;
      if (!isAnyModalOpen()) document.body.classList.remove('modal-open');

      showAlert(result.message || 'Record deleted successfully.', 'success');
    } catch (error) {
      showAlert(error.message, 'error');
    } finally {
      setButtonLoading(el.confirmDeleteBtn, false, 'Delete');
      setBusy(false);
    }
  }

  // ============================================
  // TABS AND MODALS
  // ============================================

  function switchSection(sectionId) {
    if (!sections.includes(sectionId)) return;

    document.querySelectorAll('.profile-tab').forEach(tab => {
      const active = tab.dataset.section === sectionId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    document.querySelectorAll('.profile-section').forEach(section => {
      section.classList.toggle('active', section.id === sectionId);
    });

    if (el.profileMain) {
      const top = el.profileMain.getBoundingClientRect().top +
        window.scrollY - 90;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal(type) {
    if (state.busy) return;

    const modal = {
      education: el.educationModal,
      experience: el.experienceModal,
      certification: el.certificationModal
    }[type];

    if (modal) modal.hidden = true;

    if (!isAnyModalOpen()) {
      document.body.classList.remove('modal-open');
    }
  }

  function isAnyModalOpen() {
    return [
      el.educationModal,
      el.experienceModal,
      el.certificationModal,
      el.confirmModal
    ].some(modal => modal && !modal.hidden);
  }

  function handleEscape(event) {
    if (event.key !== 'Escape' || state.busy) return;

    if (!el.confirmModal.hidden) {
      closeConfirm();
    } else if (!el.educationModal.hidden) {
      closeModal('education');
    } else if (!el.experienceModal.hidden) {
      closeModal('experience');
    } else if (!el.certificationModal.hidden) {
      closeModal('certification');
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  function checkResult(result, fallback) {
    if (!result || result.success !== true) {
      if (isInvalidSession(result)) {
        handleExpiredSession();
      }
      throw new Error(result?.message || fallback);
    }
  }

  function setBusy(busy) {
    state.busy = busy;
  }

  function setLoading(loading) {
    if (el.profileSkeleton) el.profileSkeleton.hidden = !loading;
    if (el.profileMain) el.profileMain.hidden = loading;
  }

  function showFatalError(message) {
    setLoading(false);
    if (el.profileMain) el.profileMain.hidden = true;
    showAlert(message, 'error');
  }

  function showAlert(message, type = 'success') {
    if (!el.profileAlert) return;

    el.profileAlert.textContent = message;
    el.profileAlert.className = 'profile-alert ' + type;
    el.profileAlert.hidden = false;

    window.clearTimeout(showAlert.timer);

    if (type === 'success') {
      showAlert.timer = window.setTimeout(() => {
        el.profileAlert.hidden = true;
      }, 5000);
    }

    window.scrollTo({
      top: Math.max(
        0,
        el.profileAlert.getBoundingClientRect().top +
          window.scrollY - 100
      ),
      behavior: 'smooth'
    });
  }

  function clearFieldErrors() {
    document.querySelectorAll('.field-error').forEach(item => {
      item.textContent = '';
    });
  }

  function setFieldError(field, message) {
    const target = document.querySelector(
      '[data-error-for="' + field + '"]'
    );
    if (target) target.textContent = message;
  }

  function setButtonLoading(button, loading, loadingText = '') {
    if (!button) return;

    button.disabled = loading;

    const textNode = button.querySelector('.button-text');
    const loader = button.querySelector('.button-loader');

    if (textNode) textNode.hidden = loading;

    if (loader) {
      loader.hidden = !loading;
      if (loadingText) loader.textContent = loadingText;
    }

    if (!textNode && !loader && loadingText) {
      if (loading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
      } else {
        button.textContent = button.dataset.originalText || 'Delete';
      }
    }
  }

  function updateAboutCount() {
    if (el.aboutCount) {
      el.aboutCount.textContent =
        String(el.aboutCandidate?.value?.length || 0);
    }
  }

  function setDobMax() {
    if (!el.dob) return;

    const today = new Date();
    const localDate = new Date(
      today.getTime() - today.getTimezoneOffset() * 60000
    );

    el.dob.max = localDate.toISOString().slice(0, 10);
  }

  function getInitials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '--';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  function setValue(element, val) {
    if (element) {
      element.value = val === undefined || val === null ? '' : String(val);
    }
  }

  function value(val, fallback = '') {
    return val === undefined ||
      val === null ||
      String(val).trim() === ''
      ? fallback
      : String(val);
  }

  function toDateInput(val) {
    if (!val) return '';

    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      return val.toISOString().slice(0, 10);
    }

    const text = String(val).trim();
    const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (direct) return direct[1] + '-' + direct[2] + '-' + direct[3];

    const date = new Date(text);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toISOString().slice(0, 10);
  }

  function formatDisplayDate(val) {
    const input = toDateInput(val);
    if (!input) return '';

    return new Date(input + 'T00:00:00').toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric'
    });
  }

  function formatDateRange(start, end, current) {
    const a = formatDisplayDate(start);
    const b = current ? 'Present' : formatDisplayDate(end);

    if (a && b) return a + ' - ' + b;
    return a || b || '';
  }

  function isTrue(val) {
    return val === true ||
      String(val).toLowerCase() === 'true' ||
      String(val).toLowerCase() === 'yes' ||
      String(val) === '1';
  }

  function isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function escapeHtml(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(val) {
    return escapeHtml(val);
  }

  function isInvalidSession(result) {
    const code = String(result?.code || '').toUpperCase();
    return [
      'INVALID_SESSION',
      'SESSION_EXPIRED',
      'UNAUTHORIZED'
    ].includes(code);
  }

  function handleExpiredSession() {
    try {
      const logout = SESSION.logout();

      if (logout && typeof logout.catch === 'function') {
        logout.catch(() => redirectLogin());
      } else {
        redirectLogin();
      }
    } catch (error) {
      redirectLogin();
    }
  }

  function redirectLogin() {
    window.location.replace('login.html');
  }
})();
