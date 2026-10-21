
'use strict';

/*
 * =========================================================
 * UCPP V2 — EMPLOYER APPLICATIONS
 * Version 1.2
 *
 * Features:
 * - Employer session validation
 * - Application statistics
 * - Search, filters and sorting
 * - Pagination
 * - Candidate profile navigation
 * - Export All Applications
 * - Export Job-wise Applications
 *
 * Existing read-only recruitment actions preserved.
 *
 * Export format: Excel-compatible UTF-8 CSV
 * No backend writes.
 * No external dependencies.
 * =========================================================
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;
  const PAGE_SIZE = 10;

  const state = {
    applications: [],
    filtered: [],
    jobs: [],
    currentPage: 1,
    sessionToken: '',
    loading: false,
    exporting: false,
    loaded: false
  };

  const $ = id => document.getElementById(id);

  const text = (id, value) => {
    const el = $(id);
    if (el) el.textContent = String(value ?? '');
  };

  const show = (id, visible) => {
    const el = $(id);
    if (el) el.hidden = !visible;
  };

  function alertMessage(message, type = 'error') {
    const el = $('applicationsAlert');
    if (!el) return;

    el.textContent = message;
    el.className = 'profile-alert ' + type;
    el.hidden = false;
  }

  function hideAlert() {
    const el = $('applicationsAlert');

    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
  }

  function invalidSession(result) {
    return [
      'INVALID_SESSION',
      'NO_SESSION',
      'SESSION_EXPIRED',
      'SESSION_NOT_FOUND',
      'UNAUTHORIZED'
    ].includes(String(result?.code || ''));
  }

  function node(tag, cls, value) {
    const el = document.createElement(tag);

    if (cls) el.className = cls;

    if (value !== undefined) {
      el.textContent = String(value);
    }

    return el;
  }

  function field(obj, keys, fallback = '') {
    if (!obj || typeof obj !== 'object') {
      return fallback;
    }

    for (const key of keys) {
      const value = obj[key];

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

  const applicationId = app =>
    String(field(app, ['Application_ID', 'applicationId']));

  const candidateName = app =>
    String(field(
      app,
      ['Candidate_Name', 'candidateName', 'Full_Name', 'fullName'],
      'Candidate'
    ));

  const candidateId = app =>
    String(field(app, ['Candidate_ID', 'candidateId']));

  const candidateEmail = app =>
    String(field(
      app,
      ['Candidate_Email', 'candidateEmail', 'Email', 'email']
    ));

  const candidateMobile = app =>
    String(field(
      app,
      [
        'Candidate_Mobile',
        'candidateMobile',
        'Mobile',
        'mobile'
      ]
    ));

  const jobId = app =>
    String(field(app, ['Job_ID', 'jobId']));

  function jobTitle(app) {
    const direct = field(app, ['Job_Title', 'jobTitle']);

    if (direct) return String(direct);

    const id = jobId(app);

    const job = state.jobs.find(
      item =>
        String(field(item, ['Job_ID', 'jobId'])) === id
    );

    return String(
      field(
        job,
        ['Job_Title', 'jobTitle'],
        'Job details unavailable'
      )
    );
  }

  const status = app =>
    String(field(
      app,
      ['Application_Status', 'applicationStatus', 'status'],
      'Applied'
    )).trim();

  const appliedDate = app =>
    field(
      app,
      ['Application_Date', 'applicationDate', 'appliedDate']
    );

  const qualification = app =>
    String(field(
      app,
      [
        'Qualification',
        'Qulification',
        'qualification',
        'Candidate_Qualification',
        'candidateQualification'
      ],
      '—'
    ));

  const location = app =>
    String(field(
      app,
      [
        'Current_City',
        'Current City',
        'currentCity',
        'Candidate_City',
        'candidateCity',
        'Location',
        'location'
      ],
      '—'
    ));

  const normalized = value =>
    String(value || '').trim().toLowerCase();

  function formatDate(value) {
    if (!value) return '—';

    const raw = String(value).trim();

    const match =
      /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

    if (match) {
      const y = +match[1];
      const m = +match[2];
      const d = +match[3];

      const dt = new Date(y, m - 1, d);

      if (
        dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d
      ) {
        return dt.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      }
    }

    const dt = new Date(raw);

    return Number.isNaN(dt.getTime())
      ? raw
      : dt.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
  }

  function dateValue(value) {
    const ts = Date.parse(String(value || ''));

    return Number.isFinite(ts) ? ts : 0;
  }

  /*
   * =======================================================
   * STATISTICS
   * =======================================================
   */

  function updateStatistics() {
    const count = s =>
      state.applications.filter(
        app => normalized(status(app)) === s
      ).length;

    text(
      'totalApplicationsCount',
      state.applications.length
    );

    text('appliedApplicationsCount', count('applied'));
    text('shortlistedApplicationsCount', count('shortlisted'));
    text('interviewApplicationsCount', count('interview'));
  }

  /*
   * =======================================================
   * JOB FILTER
   * =======================================================
   */

  function populateJobFilter() {
    const select = $('applicationJobFilter');

    if (!select) return;

    const previous = select.value;

    select.replaceChildren(
      new Option('All Jobs', 'all')
    );

    const map = new Map();

    state.jobs.forEach(job => {
      const id = String(
        field(job, ['Job_ID', 'jobId'])
      );

      if (id) {
        map.set(
          id,
          String(field(job, ['Job_Title', 'jobTitle'], id))
        );
      }
    });

    state.applications.forEach(app => {
      const id = jobId(app);

      if (id && !map.has(id)) {
        map.set(id, jobTitle(app));
      }
    });

    [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .forEach(([id, title]) => {
        select.appendChild(new Option(title, id));
      });

    select.value = [...select.options].some(
      opt => opt.value === previous
    )
      ? previous
      : 'all';
  }

  /*
   * =======================================================
   * SEARCH / FILTER / SORT
   * =======================================================
   */

  function applyFilters(resetPage = true) {
    const search = normalized(
      $('applicationSearch')?.value
    );

    const jobFilter = String(
      $('applicationJobFilter')?.value || 'all'
    );

    const statusFilter = normalized(
      $('applicationStatusFilter')?.value || 'all'
    );

    const sortBy = String(
      $('applicationSort')?.value || 'newest'
    );

    const result = state.applications.filter(app => {
      const searchable = [
        applicationId(app),
        candidateName(app),
        candidateId(app),
        candidateEmail(app),
        jobId(app),
        jobTitle(app)
      ].join(' ').toLowerCase();

      return (
        (!search || searchable.includes(search)) &&
        (jobFilter === 'all' || jobId(app) === jobFilter) &&
        (
          statusFilter === 'all' ||
          normalized(status(app)) === statusFilter
        )
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'oldest') {
        return (
          dateValue(appliedDate(a)) -
          dateValue(appliedDate(b))
        );
      }

      if (sortBy === 'candidate') {
        return candidateName(a).localeCompare(
          candidateName(b),
          'en',
          { sensitivity: 'base' }
        );
      }

      if (sortBy === 'job') {
        return jobTitle(a).localeCompare(
          jobTitle(b),
          'en',
          { sensitivity: 'base' }
        );
      }

      return (
        dateValue(appliedDate(b)) -
        dateValue(appliedDate(a))
      );
    });

    state.filtered = result;

    if (resetPage) {
      state.currentPage = 1;
    }

    state.currentPage = Math.min(
      state.currentPage,
      Math.max(
        1,
        Math.ceil(result.length / PAGE_SIZE)
      )
    );

    renderApplications();
  }

  /*
   * =======================================================
   * TABLE ROW
   * =======================================================
   */

  function createRow(app) {
    const row = node('tr');

    const candidateCell = node('td');
    const wrap = node('div', 'application-candidate');

    const name = candidateName(app);

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || 'C';

    wrap.appendChild(
      node('div', 'application-candidate-avatar', initials)
    );

    const info = node(
      'div',
      'application-candidate-info'
    );

    info.appendChild(
      node('span', 'application-candidate-name', name)
    );

    info.appendChild(
      node(
        'span',
        'application-candidate-id',
        candidateId(app) || applicationId(app) || '—'
      )
    );

    if (candidateEmail(app)) {
      info.appendChild(
        node(
          'span',
          'application-candidate-email',
          candidateEmail(app)
        )
      );
    }

    wrap.appendChild(info);
    candidateCell.appendChild(wrap);
    row.appendChild(candidateCell);

    const jobCell = node('td');

    jobCell.appendChild(
      node('span', 'application-job-title', jobTitle(app))
    );

    jobCell.appendChild(
      node('span', 'application-job-id', jobId(app) || '—')
    );

    row.appendChild(jobCell);

    row.appendChild(
      node('td', 'application-qualification', qualification(app))
    );

    row.appendChild(
      node('td', 'application-location', location(app))
    );

    row.appendChild(
      node('td', '', formatDate(appliedDate(app)))
    );

    const statusCell = node('td');

    const badge = node(
      'span',
      'application-status',
      status(app)
    );

    const key = normalized(status(app));

    if (
      [
        'applied',
        'viewed',
        'shortlisted',
        'rejected',
        'interview'
      ].includes(key)
    ) {
      badge.classList.add(key);
    }

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionCell = node('td');
    const actions = node('div', 'application-actions');

    const id = applicationId(app);

    const view = node(
      'a',
      'application-action',
      'View Profile'
    );

    if (id) {
      view.href =
        'candidate-profile-view.html?applicationId=' +
        encodeURIComponent(id);

      view.setAttribute(
        'aria-label',
        'View profile of ' + name
      );
    } else {
      view.removeAttribute('href');
      view.setAttribute('aria-disabled', 'true');
      view.title = 'Application ID unavailable';
    }

    actions.appendChild(view);

    // Preserve existing read-only recruitment actions.

    for (const [label, cls] of [
      ['Shortlist', 'success'],
      ['Reject', 'danger']
    ]) {
      const btn = node(
        'button',
        'application-action ' + cls,
        label
      );

      btn.type = 'button';
      btn.disabled = true;
      btn.title =
        'Application updates are not enabled yet';

      actions.appendChild(btn);
    }

    actionCell.appendChild(actions);
    row.appendChild(actionCell);

    return row;
  }

  /*
   * =======================================================
   * TABLE RENDERING
   * =======================================================
   */

  function renderApplications() {
    const tbody = $('applicationsTableBody');

    if (!tbody) return;

    tbody.replaceChildren();

    const items = state.filtered;

    if (!items.length) {
      show('applicationsTableWrap', false);
      show('applicationsPagination', false);
      show('applicationsEmpty', true);

      const none = state.applications.length === 0;

      text(
        'applicationsEmptyTitle',
        none
          ? 'No applications received yet'
          : 'No matching applications'
      );

      text(
        'applicationsEmptyDescription',
        none
          ? 'Candidate applications will appear here once candidates apply to your jobs.'
          : 'Try changing your search term or filters.'
      );

      show('applicationsEmptyAction', none);

      text(
        'applicationsResultCount',
        '0 applications found'
      );

      return;
    }

    const start =
      (state.currentPage - 1) * PAGE_SIZE;

    const fragment =
      document.createDocumentFragment();

    items
      .slice(start, start + PAGE_SIZE)
      .forEach(app => {
        fragment.appendChild(createRow(app));
      });

    tbody.appendChild(fragment);

    show('applicationsEmpty', false);
    show('applicationsTableWrap', true);

    const pages =
      Math.ceil(items.length / PAGE_SIZE);

    show(
      'applicationsPagination',
      pages > 1
    );

    text(
      'applicationsPageInfo',
      'Page ' + state.currentPage + ' of ' + pages
    );

    if ($('applicationsPreviousButton')) {
      $('applicationsPreviousButton').disabled =
        state.currentPage <= 1;
    }

    if ($('applicationsNextButton')) {
      $('applicationsNextButton').disabled =
        state.currentPage >= pages;
    }

    text(
      'applicationsResultCount',
      'Showing ' +
      (start + 1) +
      '–' +
      Math.min(start + PAGE_SIZE, items.length) +
      ' of ' +
      items.length +
      ' applications'
    );
  }

  /*
   * =======================================================
   * EXCEL EXPORT
   * =======================================================
   */

  function updateExportButtons() {
    const allButton =
      $('exportAllApplicationsButton');

    const jobButton =
      $('exportJobApplicationsButton');

    const selectedJob = String(
      $('applicationJobFilter')?.value || 'all'
    );

    const unavailable =
      state.loading ||
      state.exporting ||
      !state.loaded;

    if (allButton) {
      allButton.disabled =
        unavailable ||
        state.applications.length === 0;
    }

    if (jobButton) {
      const hasJobApplications =
        state.applications.some(
          app => jobId(app) === selectedJob
        );

      jobButton.disabled =
        unavailable ||
        selectedJob === 'all' ||
        !hasJobApplications;
    }
  }

  /*
   * Prevent spreadsheet formula injection.
   * Also preserves long identifiers as text.
   */

  function safeExcelValue(value, forceText = false) {
    let result = String(value ?? '');

    // Remove control characters except standard line breaks.
    result = result.replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ''
    );

    const dangerous =
      /^[\s]*[=+\-@]/.test(result);

    if (dangerous || (forceText && result)) {
      result = "'" + result;
    }

    return result;
  }

  function csvCell(value, forceText = false) {
    const safe = safeExcelValue(value, forceText);

    return '"' +
      safe.replace(/"/g, '""') +
      '"';
  }

  function getExportRows(applications) {
    const headers = [
      'Application ID',
      'Candidate ID',
      'Candidate Name',
      'Candidate Email',
      'Candidate Mobile',
      'Job ID',
      'Job Title',
      'Qualification',
      'Current Location',
      'Application Date',
      'Application Status',
      'Employer Notes',
      'Candidate Notes'
    ];

    const rows = applications.map(app => [
      applicationId(app),
      candidateId(app),
      candidateName(app),
      candidateEmail(app),
      candidateMobile(app),
      jobId(app),
      jobTitle(app),
      qualification(app),
      location(app),
      formatDate(appliedDate(app)),
      status(app),
      field(app, ['Employer_Notes', 'employerNotes']),
      field(app, ['Candidate_Notes', 'candidateNotes'])
    ]);

    return { headers, rows };
  }

  function buildCSV(applications) {
    const { headers, rows } =
      getExportRows(applications);

    const textColumns = new Set([
      0, // Application ID
      1, // Candidate ID
      4, // Mobile
      5  // Job ID
    ]);

    const lines = [];

    lines.push(
      headers.map(header => csvCell(header)).join(',')
    );

    rows.forEach(row => {
      lines.push(
        row.map((value, index) =>
          csvCell(
            value,
            textColumns.has(index)
          )
        ).join(',')
      );
    });

    // UTF-8 BOM improves Excel compatibility.
    return '\uFEFF' + lines.join('\r\n');
  }

  function safeFilename(value) {
    return String(value || 'Applications')
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 65) || 'Applications';
  }

  function todayForFilename() {
    const date = new Date();

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return year + '-' + month + '-' + day;
  }

  function downloadCSV(applications, filename) {
    if (!applications.length) {
      throw new Error(
        'No applications available for export.'
      );
    }

    const csv = buildCSV(applications);

    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;'
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = filename + '.csv';

    document.body.appendChild(link);

    link.click();
    link.remove();

    // Release temporary browser object URL.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function exportApplications(type) {
    if (
      state.loading ||
      state.exporting ||
      !state.loaded
    ) {
      return;
    }

    hideAlert();

    let applications = [];
    let filename = '';

    if (type === 'all') {
      applications = [...state.applications];

      filename =
        'UCPP_All_Applications_' +
        todayForFilename();

    } else if (type === 'job') {
      const selectedJob = String(
        $('applicationJobFilter')?.value || 'all'
      );

      if (selectedJob === 'all') {
        alertMessage(
          'Please select a specific job from the Job filter before exporting.',
          'info'
        );

        return;
      }

      applications = state.applications.filter(
        app => jobId(app) === selectedJob
      );

      const selectedOption =
        $('applicationJobFilter')?.selectedOptions?.[0];

      const selectedTitle =
        selectedOption?.textContent?.trim() ||
        selectedJob;

      filename =
        'UCPP_' +
        safeFilename(selectedTitle) +
        '_' +
        safeFilename(selectedJob) +
        '_' +
        todayForFilename();

    } else {
      return;
    }

    if (!applications.length) {
      alertMessage(
        'No applications are available for the selected export.',
        'info'
      );

      return;
    }

    state.exporting = true;
    updateExportButtons();

    try {
      // Newest applications first in exported file.
      applications.sort(
        (a, b) =>
          dateValue(appliedDate(b)) -
          dateValue(appliedDate(a))
      );

      downloadCSV(
        applications,
        safeFilename(filename)
      );

      alertMessage(
        applications.length +
        ' application record(s) prepared for Excel download.',
        'success'
      );

    } catch (error) {
      console.error(
        'UCPP application export failed:',
        error
      );

      alertMessage(
        error?.message ||
        'Unable to export applications.',
        'error'
      );

    } finally {
      state.exporting = false;
      updateExportButtons();
    }
  }

  /*
   * =======================================================
   * LOADING STATE
   * =======================================================
   */

  function setLoading(value) {
    state.loading = value;

    show('applicationsSkeleton', value);

    if (value) {
      show('applicationsTableWrap', false);
      show('applicationsEmpty', false);
      show('applicationsPagination', false);

      text(
        'applicationsResultCount',
        'Loading applications...'
      );
    }

    const btn =
      $('refreshApplicationsButton');

    if (btn) {
      btn.disabled = value;

      btn.textContent =
        value ? 'Loading...' : 'Refresh';
    }

    updateExportButtons();
  }

  /*
   * =======================================================
   * FETCH EMPLOYER APPLICATIONS
   * =======================================================
   */

  async function loadApplications() {
    if (state.loading) return;

    hideAlert();
    state.loaded = false;

    setLoading(true);

    try {
      const [appsResult, jobsResult] =
        await Promise.allSettled([
          API.post(
            'getEmployerApplications',
            {
              sessionToken: state.sessionToken
            }
          ),
          API.post(
            'getEmployerJobs',
            {
              sessionToken: state.sessionToken
            }
          )
        ]);

      if (appsResult.status !== 'fulfilled') {
        throw new Error(
          'Unable to load applications. Please try again.'
        );
      }

      const appsResponse = appsResult.value;

      if (appsResponse?.success !== true) {
        if (invalidSession(appsResponse)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          appsResponse?.message ||
          'Unable to load applications.'
        );
      }

      const rawApps = appsResponse.data;

      const appList = Array.isArray(rawApps)
        ? rawApps
        : rawApps?.applications;

      if (!Array.isArray(appList)) {
        throw new Error(
          'Invalid applications data received.'
        );
      }

      state.applications = appList.filter(
        app =>
          app &&
          typeof app === 'object'
      );

      state.jobs = [];

      if (jobsResult.status === 'fulfilled') {
        const response = jobsResult.value;

        if (response?.success === true) {
          const raw = response.data;

          const jobs = Array.isArray(raw)
            ? raw
            : raw?.jobs;

          if (Array.isArray(jobs)) {
            state.jobs = jobs.filter(
              job =>
                job &&
                typeof job === 'object'
            );
          }

        } else if (invalidSession(response)) {
          window.location.replace('login.html');
          return;
        }
      }

      state.loaded = true;

      updateStatistics();
      populateJobFilter();
      applyFilters(false);

    } catch (error) {
      alertMessage(
        error?.message ||
        'Unable to load applications. Please try again.'
      );

      if (state.applications.length === 0) {
        show('applicationsTableWrap', false);
        show('applicationsPagination', false);
        show('applicationsEmpty', false);

        text(
          'applicationsResultCount',
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
   * =======================================================
   * EVENTS
   * =======================================================
   */

  function initializeEvents() {
    $('applicationSearch')?.addEventListener(
      'input',
      () => applyFilters(true)
    );

    $('applicationJobFilter')?.addEventListener(
      'change',
      () => {
        applyFilters(true);
        updateExportButtons();
      }
    );

    $('applicationStatusFilter')?.addEventListener(
      'change',
      () => applyFilters(true)
    );

    $('applicationSort')?.addEventListener(
      'change',
      () => applyFilters(true)
    );

    $('refreshApplicationsButton')?.addEventListener(
      'click',
      loadApplications
    );

    $('applicationsPreviousButton')?.addEventListener(
      'click',
      () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          renderApplications();
        }
      }
    );

    $('applicationsNextButton')?.addEventListener(
      'click',
      () => {
        if (
          state.currentPage <
          Math.ceil(state.filtered.length / PAGE_SIZE)
        ) {
          state.currentPage++;
          renderApplications();
        }
      }
    );

    // Export All Applications
    $('exportAllApplicationsButton')?.addEventListener(
      'click',
      () => exportApplications('all')
    );

    // Export Selected Job Applications
    $('exportJobApplicationsButton')?.addEventListener(
      'click',
      () => exportApplications('job')
    );
  }

  /*
   * =======================================================
   * INITIALIZATION
   * =======================================================
   */

  async function initialize() {
    initializeEvents();

    updateExportButtons();

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

      const validation =
        await SESSION.validateSession();

      if (validation?.success !== true) {
        if (invalidSession(validation)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          validation?.message ||
          'Unable to verify employer session.'
        );
      }

      state.sessionToken =
        session.sessionToken;

      await loadApplications();

    } catch (error) {
      setLoading(false);

      alertMessage(
        error?.message ||
        'Unable to initialize Applications.'
      );

      text(
        'applicationsResultCount',
        'Unable to load applications'
      );
    }
  }

  initialize();

})();
