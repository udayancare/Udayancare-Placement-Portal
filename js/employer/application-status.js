
'use strict';

/*
 * =========================================================
 * UCPP V2 — Employer Application Status v1.0
 *
 * READ-ONLY MODE
 * - Employer session validation
 * - Recruitment status tabs
 * - Application statistics
 * - Search, job filter, sorting
 * - Pagination and refresh
 * - No backend write operations
 * =========================================================
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;

  const PAGE_SIZE = 10;

  const STATUSES = [
    'Applied',
    'Viewed',
    'Shortlisted',
    'Interview',
    'Rejected'
  ];

  const state = {
    applications: [],
    filtered: [],
    jobs: [],
    jobMap: new Map(),
    activeStatus: 'all',
    currentPage: 1,
    sessionToken: '',
    loading: false,
    loaded: false
  };

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = String(value ?? '');
    }
  }

  function show(id, visible) {
    const element = $(id);

    if (element) {
      element.hidden = !visible;
    }
  }

  function showAlert(message, type = 'error') {
    const element = $('statusPageAlert');

    if (!element) return;

    element.textContent = message;
    element.className = 'profile-alert ' + type;
    element.hidden = false;
  }

  function hideAlert() {
    const element = $('statusPageAlert');

    if (element) {
      element.textContent = '';
      element.hidden = true;
    }
  }

  function createElement(tag, className, value) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (value !== undefined) {
      element.textContent = String(value);
    }

    return element;
  }

  function getField(object, keys, fallback = '') {
    if (!object || typeof object !== 'object') {
      return fallback;
    }

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

  function normalizeStatus(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isInvalidSession(result) {
    return [
      'INVALID_SESSION',
      'NO_SESSION',
      'SESSION_EXPIRED',
      'SESSION_NOT_FOUND',
      'UNAUTHORIZED'
    ].includes(String(result?.code || ''));
  }

  function getApplicationId(app) {
    return String(getField(app, [
      'Application_ID',
      'applicationId'
    ]));
  }

  function getCandidateName(app) {
    return String(getField(app, [
      'Candidate_Name',
      'candidateName',
      'Full_Name',
      'fullName'
    ], 'Candidate'));
  }

  function getCandidateEmail(app) {
    return String(getField(app, [
      'Candidate_Email',
      'candidateEmail',
      'Email',
      'email'
    ]));
  }

  function getCandidateId(app) {
    return String(getField(app, [
      'Candidate_ID',
      'candidateId'
    ]));
  }

  function getJobId(app) {
    return String(getField(app, [
      'Job_ID',
      'jobId'
    ]));
  }

  function getJobTitle(app) {
    const direct = getField(app, [
      'Job_Title',
      'jobTitle'
    ]);

    if (direct) {
      return String(direct);
    }

    const job = state.jobMap.get(getJobId(app));

    return String(getField(job, [
      'Job_Title',
      'jobTitle'
    ], 'Job details unavailable'));
  }

  function getStatus(app) {
    return String(getField(app, [
      'Application_Status',
      'applicationStatus',
      'status'
    ], 'Applied')).trim();
  }

  function getApplicationDate(app) {
    return getField(app, [
      'Application_Date',
      'applicationDate',
      'appliedDate'
    ]);
  }

  function formatDate(value) {
    if (!value) return '—';

    const raw = String(value).trim();

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);

      const date = new Date(year, month - 1, day);

      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return raw;
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function dateValue(value) {
    const timestamp = Date.parse(String(value || ''));

    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  /*
   * STATISTICS
   */

  function updateStatistics() {

    const applications = state.applications;

    const counts = {
      applied: 0,
      viewed: 0,
      shortlisted: 0,
      interview: 0,
      rejected: 0
    };

    applications.forEach((app) => {
      const status = normalizeStatus(getStatus(app));

      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status]++;
      }
    });

    setText('statusTotalCount', applications.length);
    setText('statusAppliedCount', counts.applied);
    setText('statusViewedCount', counts.viewed);
    setText('statusShortlistedCount', counts.shortlisted);
    setText('statusInterviewCount', counts.interview);
    setText('statusRejectedCount', counts.rejected);

    setText('tabAllCount', applications.length);
    setText('tabAppliedCount', counts.applied);
    setText('tabViewedCount', counts.viewed);
    setText('tabShortlistedCount', counts.shortlisted);
    setText('tabInterviewCount', counts.interview);
    setText('tabRejectedCount', counts.rejected);

  }

  /*
   * JOB LOOKUP AND FILTER
   */

  function buildJobMap() {

    state.jobMap.clear();

    state.jobs.forEach((job) => {
      const jobId = String(getField(job, [
        'Job_ID',
        'jobId'
      ]));

      if (jobId) {
        state.jobMap.set(jobId, job);
      }
    });

  }

  function populateJobFilter() {

    const select = $('statusJobFilter');

    if (!select) return;

    const previousValue = select.value;

    select.replaceChildren(
      new Option('All Jobs', 'all')
    );

    const jobOptions = new Map();

    state.jobs.forEach((job) => {
      const id = String(getField(job, [
        'Job_ID',
        'jobId'
      ]));

      if (!id) return;

      jobOptions.set(
        id,
        String(getField(job, [
          'Job_Title',
          'jobTitle'
        ], id))
      );
    });

    state.applications.forEach((app) => {
      const id = getJobId(app);

      if (!id || jobOptions.has(id)) return;

      jobOptions.set(id, getJobTitle(app));
    });

    [...jobOptions.entries()]
      .sort((a, b) =>
        a[1].localeCompare(b[1], 'en', {
          sensitivity: 'base'
        })
      )
      .forEach(([id, title]) => {
        select.appendChild(
          new Option(title, id)
        );
      });

    const valueExists = [...select.options].some(
      (option) => option.value === previousValue
    );

    select.value = valueExists ? previousValue : 'all';

  }

  /*
   * STATUS TABS
   */

  function updateActiveTab() {

    const tabs = document.querySelectorAll(
      '#applicationStatusTabs .status-tab'
    );

    tabs.forEach((tab) => {

      const isActive =
        normalizeStatus(tab.dataset.status) ===
        normalizeStatus(state.activeStatus);

      tab.classList.toggle('active', isActive);

      tab.setAttribute(
        'aria-pressed',
        String(isActive)
      );

    });

  }

  function selectStatus(status) {

    const validStatuses = [
      'all',
      ...STATUSES.map(normalizeStatus)
    ];

    const normalized = normalizeStatus(status);

    if (!validStatuses.includes(normalized)) {
      return;
    }

    state.activeStatus = normalized;

    updateActiveTab();
    applyFilters(true);

  }

  /*
   * SEARCH, FILTER AND SORT
   */

  function applyFilters(resetPage = true) {

    if (!state.loaded) return;

    const search = String(
      $('statusSearch')?.value || ''
    ).trim().toLowerCase();

    const jobFilter = String(
      $('statusJobFilter')?.value || 'all'
    );

    const sortBy = String(
      $('statusSort')?.value || 'newest'
    );

    let applications = state.applications.filter((app) => {

      const searchable = [
        getApplicationId(app),
        getCandidateName(app),
        getCandidateEmail(app),
        getCandidateId(app),
        getJobId(app),
        getJobTitle(app)
      ]
        .map((value) => String(value || ''))
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !search || searchable.includes(search);

      const matchesJob =
        jobFilter === 'all' ||
        getJobId(app) === jobFilter;

      const matchesStatus =
        state.activeStatus === 'all' ||
        normalizeStatus(getStatus(app)) ===
          state.activeStatus;

      return matchesSearch && matchesJob && matchesStatus;

    });

    applications.sort((a, b) => {

      if (sortBy === 'oldest') {
        return dateValue(getApplicationDate(a)) -
          dateValue(getApplicationDate(b));
      }

      if (sortBy === 'candidate') {
        return getCandidateName(a).localeCompare(
          getCandidateName(b),
          'en',
          { sensitivity: 'base' }
        );
      }

      if (sortBy === 'job') {
        return getJobTitle(a).localeCompare(
          getJobTitle(b),
          'en',
          { sensitivity: 'base' }
        );
      }

      return dateValue(getApplicationDate(b)) -
        dateValue(getApplicationDate(a));

    });

    state.filtered = applications;

    if (resetPage) {
      state.currentPage = 1;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(applications.length / PAGE_SIZE)
    );

    state.currentPage = Math.min(
      state.currentPage,
      totalPages
    );

    renderApplications();

  }

  /*
   * APPLICATION ROW
   */

  function createApplicationRow(app) {

    const row = document.createElement('tr');

    // Candidate
    const candidateCell = document.createElement('td');

    const candidateWrap = createElement(
      'div',
      'status-candidate'
    );

    const candidateName = getCandidateName(app);

    const initials = candidateName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'C';

    candidateWrap.appendChild(
      createElement(
        'div',
        'status-candidate-avatar',
        initials
      )
    );

    const candidateInfo = createElement(
      'div',
      'status-candidate-info'
    );

    candidateInfo.appendChild(
      createElement(
        'span',
        'status-candidate-name',
        candidateName
      )
    );

    const email = getCandidateEmail(app);

    if (email) {
      candidateInfo.appendChild(
        createElement(
          'span',
          'status-candidate-email',
          email
        )
      );
    }

    candidateWrap.appendChild(candidateInfo);
    candidateCell.appendChild(candidateWrap);
    row.appendChild(candidateCell);

    // Job
    const jobCell = document.createElement('td');

    jobCell.appendChild(
      createElement(
        'span',
        'status-job-title',
        getJobTitle(app)
      )
    );

    jobCell.appendChild(
      createElement(
        'span',
        'status-job-id',
        getJobId(app) || '—'
      )
    );

    row.appendChild(jobCell);

    // Application ID
    row.appendChild(
      createElement(
        'td',
        'status-application-id',
        getApplicationId(app) || '—'
      )
    );

    // Date
    row.appendChild(
      createElement(
        'td',
        '',
        formatDate(getApplicationDate(app))
      )
    );

    // Current Status
    const statusCell = document.createElement('td');

    const status = getStatus(app);
    const normalized = normalizeStatus(status);

    const badge = createElement(
      'span',
      'status-badge',
      status
    );

    if (
      STATUSES.some(
        (item) => normalizeStatus(item) === normalized
      )
    ) {
      badge.classList.add(normalized);
    }

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    // Actions — disabled
    const actionsCell = document.createElement('td');

    const actions = createElement(
      'div',
      'status-actions'
    );

    // View Candidate Digital Resume
const viewProfileButton = createElement(
  'button',
  'status-action',
  'View Profile'
);

viewProfileButton.type = 'button';

viewProfileButton.addEventListener('click', () => {
  const applicationId = getApplicationId(app);

  if (!applicationId) {
    return;
  }

  window.location.href =
    'candidate-profile-view.html?applicationId=' +
    encodeURIComponent(applicationId);
});

actions.appendChild(viewProfileButton);


    const shortlistButton = createElement(
      'button',
      'status-action success',
      'Shortlist'
    );

    shortlistButton.type = 'button';
    shortlistButton.disabled = true;
    shortlistButton.title =
      'Status changes are not enabled yet';

    const interviewButton = createElement(
      'button',
      'status-action',
      'Interview'
    );

    interviewButton.type = 'button';
    interviewButton.disabled = true;
    interviewButton.title =
      'Status changes are not enabled yet';

    const rejectButton = createElement(
      'button',
      'status-action danger',
      'Reject'
    );

    rejectButton.type = 'button';
    rejectButton.disabled = true;
    rejectButton.title =
      'Status changes are not enabled yet';

    actions.appendChild(shortlistButton);
    actions.appendChild(interviewButton);
    actions.appendChild(rejectButton);

    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    return row;

  }

  /*
   * RENDER
   */

  function renderApplications() {

    const tbody = $('statusTableBody');

    if (!tbody) return;

    tbody.replaceChildren();

    const applications = state.filtered;

    if (applications.length === 0) {

      show('statusTableWrap', false);
      show('statusPagination', false);
      show('statusEmpty', true);

      if (state.applications.length === 0) {

        setText(
          'statusEmptyTitle',
          'No applications received yet'
        );

        setText(
          'statusEmptyDescription',
          'Candidate applications will appear here once candidates apply to your jobs.'
        );

        show('statusEmptyAction', true);

      } else {

        setText(
          'statusEmptyTitle',
          'No matching applications'
        );

        setText(
          'statusEmptyDescription',
          'Try another recruitment status, job or search term.'
        );

        show('statusEmptyAction', false);

      }

      setText('statusResultsCount', '0 applications found');

      return;

    }

    const start = (state.currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    const fragment = document.createDocumentFragment();

    applications
      .slice(start, end)
      .forEach((app) => {
        fragment.appendChild(
          createApplicationRow(app)
        );
      });

    tbody.appendChild(fragment);

    show('statusEmpty', false);
    show('statusTableWrap', true);

    const totalPages = Math.ceil(
      applications.length / PAGE_SIZE
    );

    show('statusPagination', totalPages > 1);

    setText(
      'statusPageInfo',
      'Page ' + state.currentPage + ' of ' + totalPages
    );

    $('statusPreviousButton').disabled =
      state.currentPage <= 1;

    $('statusNextButton').disabled =
      state.currentPage >= totalPages;

    setText(
      'statusResultsCount',
      'Showing ' +
        (start + 1) +
        '–' +
        Math.min(end, applications.length) +
        ' of ' +
        applications.length +
        ' applications'
    );

  }

  /*
   * LOADING
   */

  function setLoading(loading) {

    state.loading = loading;

    show('statusSkeleton', loading);

    if (loading) {
      show('statusTableWrap', false);
      show('statusEmpty', false);
      show('statusPagination', false);

      setText(
        'statusResultsCount',
        'Loading applications...'
      );
    }

    const button = $('statusRefreshButton');

    if (button) {
      button.disabled = loading;
      button.textContent =
        loading ? 'Loading...' : 'Refresh';
    }

  }

  /*
   * READ-ONLY API CALLS
   */

  async function loadApplications() {

    if (state.loading) return;

    hideAlert();
    setLoading(true);

    try {

      const [applicationsResult, jobsResult] =
        await Promise.all([
          API.post('getEmployerApplications', {
            sessionToken: state.sessionToken
          }),
          API.post('getEmployerJobs', {
            sessionToken: state.sessionToken
          })
        ]);

      if (
        !applicationsResult ||
        applicationsResult.success !== true
      ) {

        if (isInvalidSession(applicationsResult)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          applicationsResult?.message ||
          'Unable to load applications.'
        );

      }

      if (
        !jobsResult ||
        jobsResult.success !== true
      ) {

        if (isInvalidSession(jobsResult)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          jobsResult?.message ||
          'Unable to load job details.'
        );

      }

      const applicationData = applicationsResult.data;

      const applicationList = Array.isArray(applicationData)
        ? applicationData
        : applicationData?.applications;

      const jobData = jobsResult.data;

      const jobList = Array.isArray(jobData)
        ? jobData
        : jobData?.jobs;

      if (!Array.isArray(applicationList)) {
        throw new Error(
          'Invalid applications data received.'
        );
      }

      if (!Array.isArray(jobList)) {
        throw new Error(
          'Invalid jobs data received.'
        );
      }

      state.jobs = jobList.filter(
        (job) => job && typeof job === 'object'
      );

      state.applications = applicationList.filter(
        (app) => app && typeof app === 'object'
      );

      state.loaded = true;

      buildJobMap();
      updateStatistics();
      populateJobFilter();
      applyFilters(false);

    } catch (error) {

      showAlert(
        error?.message ||
        'Unable to load application statuses.'
      );

      if (!state.loaded) {
        setText(
          'statusResultsCount',
          'Unable to load applications'
        );
      } else {
        applyFilters(false);
      }

    } finally {

      setLoading(false);

    }

  }

  /*
   * EVENTS
   */

  function initializeEvents() {

    document.querySelectorAll(
      '#applicationStatusTabs .status-tab'
    ).forEach((tab) => {

      tab.addEventListener('click', () => {
        selectStatus(tab.dataset.status || 'all');
      });

    });

    $('statusSearch')?.addEventListener(
      'input',
      () => applyFilters(true)
    );

    $('statusJobFilter')?.addEventListener(
      'change',
      () => applyFilters(true)
    );

    $('statusSort')?.addEventListener(
      'change',
      () => applyFilters(true)
    );

    $('statusRefreshButton')?.addEventListener(
      'click',
      loadApplications
    );

    $('statusPreviousButton')?.addEventListener(
      'click',
      () => {

        if (state.currentPage > 1) {
          state.currentPage--;
          renderApplications();
        }

      }
    );

    $('statusNextButton')?.addEventListener(
      'click',
      () => {

        const totalPages = Math.ceil(
          state.filtered.length / PAGE_SIZE
        );

        if (state.currentPage < totalPages) {
          state.currentPage++;
          renderApplications();
        }

      }
    );

  }

  /*
   * INITIALIZATION
   */

  async function initialize() {

    initializeEvents();
    updateActiveTab();

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

        if (isInvalidSession(validation)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          validation.message ||
          'Unable to verify employer session.'
        );

      }

      state.sessionToken = session.sessionToken;

      // Supports existing Shortlisted navigation
      // without creating another page.
      const params = new URLSearchParams(
        window.location.search
      );

      const requestedStatus = params.get('status');

      if (requestedStatus) {
        const validStatuses = [
          'all',
          ...STATUSES.map(normalizeStatus)
        ];

        if (
          validStatuses.includes(
            normalizeStatus(requestedStatus)
          )
        ) {
          state.activeStatus =
            normalizeStatus(requestedStatus);

          updateActiveTab();
        }
      }

      await loadApplications();

    } catch (error) {

      setLoading(false);

      showAlert(
        error?.message ||
        'Unable to initialize Application Status.'
      );

      setText(
        'statusResultsCount',
        'Unable to load applications'
      );

    }

  }

  initialize();

})();
