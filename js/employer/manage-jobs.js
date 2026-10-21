
'use strict';

/*
 * =========================================================
 * UCPP V2 — Employer Manage Jobs v2.0
 *
 * - Secure employer session validation
 * - Load employer jobs
 * - Statistics, search, filters, sorting, pagination
 * - Edit job using existing backend service
 * - Close / Reopen jobs
 * - Prevent duplicate requests
 * - Preserve existing UI structure
 * =========================================================
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;
  const PAGE_SIZE = 10;

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

  const state = {
    jobs: [],
    filteredJobs: [],
    currentPage: 1,
    loading: false,
    busy: false,
    sessionToken: '',
    editingJobId: ''
  };

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value ?? '');
  }

  function show(id, visible) {
    const element = $(id);
    if (element) element.hidden = !visible;
  }

  function showAlert(message, type = 'error') {
    const element = $('manageJobsAlert');
    if (!element) return;

    element.textContent = message;
    element.className = 'profile-alert ' + type;
    element.hidden = false;
    element.setAttribute(
      'role',
      type === 'success' ? 'status' : 'alert'
    );
  }

  function hideAlert() {
    const element = $('manageJobsAlert');
    if (!element) return;

    element.textContent = '';
    element.hidden = true;
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
    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function dateSortValue(value) {
    if (!value) return 0;
    const timestamp = Date.parse(String(value).trim());
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function normalizeStatus(value) {
    return String(value || '').trim().toLowerCase();
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);

    return element;
  }

  function updateStatistics() {
    const jobs = state.jobs;

    const active = jobs.filter(
      job => normalizeStatus(job.Job_Status) === 'active'
    ).length;

    const closed = jobs.filter(
      job => normalizeStatus(job.Job_Status) === 'closed'
    ).length;

    const vacancies = jobs.reduce((total, job) => {
      const count = Number(job.Vacancies);
      return total + (
        Number.isFinite(count) && count > 0 ? count : 0
      );
    }, 0);

    setText('totalJobsCount', jobs.length);
    setText('activeJobsCount', active);
    setText('closedJobsCount', closed);
    setText('totalVacanciesCount', vacancies);
  }

  function applyFilters(resetPage = true) {
    const search = String(
      $('jobSearch')?.value || ''
    ).trim().toLowerCase();

    const statusFilter = String(
      $('jobStatusFilter')?.value || 'all'
    ).toLowerCase();

    const sortBy = String(
      $('jobSort')?.value || 'newest'
    );

    let jobs = state.jobs.filter(job => {
      const searchable = [
        job.Job_ID,
        job.Job_Title,
        job.Job_Category,
        job.City,
        job.District,
        job.State
      ].map(value => String(value ?? ''))
        .join(' ')
        .toLowerCase();

      return (
        (!search || searchable.includes(search)) &&
        (
          statusFilter === 'all' ||
          normalizeStatus(job.Job_Status) === statusFilter
        )
      );
    });

    jobs.sort((a, b) => {
      if (sortBy === 'oldest') {
        return dateSortValue(a.Posted_Date) -
          dateSortValue(b.Posted_Date);
      }

      if (sortBy === 'deadline') {
        return dateSortValue(a.Application_Last_Date) -
          dateSortValue(b.Application_Last_Date);
      }

      if (sortBy === 'title') {
        return String(a.Job_Title || '').localeCompare(
          String(b.Job_Title || ''),
          'en',
          { sensitivity: 'base' }
        );
      }

      return dateSortValue(b.Posted_Date) -
        dateSortValue(a.Posted_Date);
    });

    state.filteredJobs = jobs;

    if (resetPage) state.currentPage = 1;

    const totalPages = Math.max(
      1,
      Math.ceil(jobs.length / PAGE_SIZE)
    );

    state.currentPage = Math.min(
      state.currentPage,
      totalPages
    );

    renderJobs();
  }

  function setActionButtonsDisabled(disabled) {
    document.querySelectorAll(
      '.manage-job-actions button'
    ).forEach(button => {
      button.disabled = disabled;
    });
  }

  function setBusy(busy) {
    state.busy = busy;
    setActionButtonsDisabled(busy);

    const refreshButton = $('refreshJobsButton');
    if (refreshButton) {
      refreshButton.disabled = busy || state.loading;
    }
  }

  function getCurrentSession() {
    const session = SESSION?.getSession?.();

    if (
      !session ||
      session.role !== 'employer' ||
      !session.sessionToken ||
      session.sessionToken !== state.sessionToken
    ) {
      window.location.replace('login.html');
      return false;
    }

    return true;
  }

  function toDateInput(value) {
    if (!value) return '';

    const match = /^(\d{4}-\d{2}-\d{2})/.exec(
      String(value)
    );

    if (match) return match[1];

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function getToday() {
    return toDateInput(new Date());
  }

  function validateJob(job) {
    for (const name of REQUIRED_FIELDS) {
      if (!String(job[name] || '').trim()) {
        return `${name.replaceAll('_', ' ')} is required.`;
      }
    }

    for (const name of EDITABLE_FIELDS) {
      const value = String(job[name] || '').trim();

      if (value.length > 10000) {
        return `${name.replaceAll('_', ' ')} is too long.`;
      }

      if (
        value &&
        /^[=+\-@\t\r]/.test(value) &&
        !['Salary_Min', 'Salary_Max'].includes(name)
      ) {
        return `Invalid value in ${name.replaceAll('_', ' ')}.`;
      }
    }

    if (
      !/^[1-9]\d*$/.test(String(job.Vacancies)) ||
      Number(job.Vacancies) > 100000
    ) {
      return 'Vacancies must be between 1 and 100000.';
    }

    for (const name of ['Salary_Min', 'Salary_Max']) {
      const value = String(job[name] || '').trim();

      if (
        value &&
        (
          !/^\d+(\.\d{1,2})?$/.test(value) ||
          Number(value) > 100000000
        )
      ) {
        return 'Enter a valid salary amount.';
      }
    }

    if (
      job.Salary_Min &&
      job.Salary_Max &&
      Number(job.Salary_Min) > Number(job.Salary_Max)
    ) {
      return 'Maximum salary cannot be less than minimum salary.';
    }

    const deadline = String(job.Application_Last_Date || '');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);

    if (!match) return 'Enter a valid application deadline.';

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3]) ||
      deadline < getToday()
    ) {
      return 'Application deadline cannot be in the past.';
    }

    return '';
  }

  function createEditField(name, value) {
    const wrapper = createElement('div', 'form-group');
    const label = createElement(
      'label',
      '',
      name.replaceAll('_', ' ')
    );

    label.htmlFor = `edit_${name}`;

    const multiline = [
      'Job_Description',
      'Job_Responsibilities',
      'Required_Skills',
      'Skills',
      'Address'
    ].includes(name);

    const input = document.createElement(
      multiline ? 'textarea' : 'input'
    );

    input.id = `edit_${name}`;
    input.name = name;
    input.className = 'form-control';
    input.value = String(value ?? '');

    if (!multiline) {
      input.type =
        name === 'Application_Last_Date' ? 'date' : 'text';
    }

    if (name === 'Company_Name') {
      input.readOnly = true;
    }

    if (name === 'Application_Last_Date') {
      input.value = toDateInput(value);
      input.min = getToday();
    }

    if (REQUIRED_FIELDS.includes(name)) {
      input.required = true;
    }

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    return wrapper;
  }

  function closeEditDialog() {
    const dialog = $('ucppEditJobDialog');
    if (!dialog) return;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    }

    dialog.remove();
    state.editingJobId = '';
  }

  async function editJob(jobId) {
    if (state.busy || state.loading || !getCurrentSession()) return;

    hideAlert();
    setBusy(true);

    try {
      const result = await API.post(
        'getEmployerJobDetails',
        {
          sessionToken: state.sessionToken,
          jobId
        }
      );

      if (!result || result.success !== true) {
        if (isInvalidSession(result)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          result?.message || 'Unable to load job details.'
        );
      }

      const job = result.data?.job || result.data;

      if (!job || typeof job !== 'object') {
        throw new Error('Invalid job details received.');
      }

      closeEditDialog();

      const dialog = document.createElement('dialog');
      dialog.id = 'ucppEditJobDialog';
      dialog.style.width = 'min(760px, 94vw)';
      dialog.style.maxHeight = '88vh';
      dialog.style.overflowY = 'auto';
      dialog.style.padding = '24px';
      dialog.style.border = '1px solid #ddd';
      dialog.style.borderRadius = '12px';

      const heading = createElement(
        'h2',
        '',
        'Edit Job — ' + (job.Job_Title || jobId)
      );

      const editForm = document.createElement('form');
      editForm.noValidate = true;

      EDITABLE_FIELDS.forEach(name => {
        editForm.appendChild(
          createEditField(name, job[name])
        );
      });

      const message = createElement('p');
      message.setAttribute('role', 'alert');

      const actions = createElement('div', 'manage-job-actions');

      const cancelButton = createElement(
        'button',
        'manage-job-action',
        'Cancel'
      );
      cancelButton.type = 'button';

      const saveButton = createElement(
        'button',
        'manage-job-action',
        'Save Changes'
      );
      saveButton.type = 'submit';

      cancelButton.addEventListener('click', closeEditDialog);

      actions.appendChild(cancelButton);
      actions.appendChild(saveButton);

      editForm.appendChild(message);
      editForm.appendChild(actions);

      dialog.appendChild(heading);
      dialog.appendChild(editForm);
      document.body.appendChild(dialog);

      state.editingJobId = jobId;

      dialog.addEventListener('close', () => {
        dialog.remove();
        state.editingJobId = '';
      });

      editForm.addEventListener('submit', async event => {
        event.preventDefault();

        if (state.busy) return;
        if (!getCurrentSession()) return;

        const updatedJob = {};

        EDITABLE_FIELDS.forEach(name => {
          updatedJob[name] = String(
            editForm.elements.namedItem(name)?.value || ''
          ).trim();
        });

        const error = validateJob(updatedJob);

        if (error) {
          message.textContent = error;
          return;
        }

        message.textContent = '';
        saveButton.disabled = true;
        cancelButton.disabled = true;
        saveButton.textContent = 'Saving...';
        setBusy(true);

        try {
          const response = await API.post(
            'updateEmployerJob',
            {
              sessionToken: state.sessionToken,
              jobId,
              job: updatedJob
            }
          );

          if (!response || response.success !== true) {
            if (isInvalidSession(response)) {
              window.location.replace('login.html');
              return;
            }

            throw new Error(
              response?.message || 'Unable to update job.'
            );
          }

          closeEditDialog();
          showAlert('Job updated successfully.', 'success');

          await loadJobs();

        } catch (saveError) {
          message.textContent =
            saveError?.message || 'Unable to save job.';
        } finally {
          saveButton.disabled = false;
          cancelButton.disabled = false;
          saveButton.textContent = 'Save Changes';
          setBusy(false);
        }
      });

      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        throw new Error('Job editor is not supported by this browser.');
      }

    } catch (error) {
      showAlert(error?.message || 'Unable to open job editor.');
    } finally {
      setBusy(false);
    }
  }

  async function changeJobStatus(jobId, currentStatus) {
    if (state.busy || state.loading || !getCurrentSession()) return;

    const nextStatus =
      normalizeStatus(currentStatus) === 'active'
        ? 'Closed'
        : 'Active';

    const verb = nextStatus === 'Closed' ? 'close' : 'reopen';

    const confirmed = window.confirm(
      `Are you sure you want to ${verb} this job?`
    );

    if (!confirmed) return;

    hideAlert();
    setBusy(true);

    try {
      const result = await API.post(
        'updateEmployerJobStatus',
        {
          sessionToken: state.sessionToken,
          jobId,
          status: nextStatus
        }
      );

      if (!result || result.success !== true) {
        if (isInvalidSession(result)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          result?.message || 'Unable to update job status.'
        );
      }

      showAlert(
        nextStatus === 'Closed'
          ? 'Job closed successfully.'
          : 'Job reopened successfully.',
        'success'
      );

      const existing = state.jobs.find(
        job => String(job.Job_ID) === String(jobId)
      );

      if (existing) existing.Job_Status = nextStatus;

      updateStatistics();
      applyFilters(false);

    } catch (error) {
      showAlert(
        error?.message || 'Unable to change job status.'
      );
    } finally {
      setBusy(false);
    }
  }

  function createJobRow(job) {
    const row = document.createElement('tr');

    const detailsCell = document.createElement('td');

    detailsCell.appendChild(
      createElement(
        'span',
        'manage-job-title',
        job.Job_Title || 'Untitled Job'
      )
    );

    detailsCell.appendChild(
      createElement(
        'span',
        'manage-job-id',
        job.Job_ID || '—'
      )
    );

    detailsCell.appendChild(
      createElement(
        'span',
        'manage-job-category',
        job.Job_Category || '—'
      )
    );

    row.appendChild(detailsCell);

    const location = [
      job.City,
      job.State
    ].filter(Boolean).join(', ') || '—';

    const locationCell = document.createElement('td');

    locationCell.appendChild(
      createElement('span', 'manage-job-location', location)
    );

    row.appendChild(locationCell);

    const vacanciesCell = document.createElement('td');

    vacanciesCell.appendChild(
      createElement(
        'span',
        'manage-job-vacancies',
        job.Vacancies ?? '—'
      )
    );

    row.appendChild(vacanciesCell);

    row.appendChild(
      createElement('td', '', formatDate(job.Posted_Date))
    );

    row.appendChild(
      createElement(
        'td',
        '',
        formatDate(job.Application_Last_Date)
      )
    );

    const statusCell = document.createElement('td');

    const status = String(
      job.Job_Status || 'Unknown'
    ).trim();

    const normalized = normalizeStatus(status);

    const badge = createElement(
      'span',
      'manage-job-status',
      status
    );

    if (normalized === 'active') {
      badge.classList.add('active');
    } else if (normalized === 'closed') {
      badge.classList.add('closed');
    }

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    const actions = createElement('div', 'manage-job-actions');

    const editButton = createElement(
      'button',
      'manage-job-action',
      'Edit'
    );

    editButton.type = 'button';
    editButton.disabled = state.busy;
    editButton.addEventListener(
      'click',
      () => editJob(String(job.Job_ID || ''))
    );

    const statusButton = createElement(
      'button',
      'manage-job-action danger',
      normalized === 'active' ? 'Close' : 'Reopen'
    );

    statusButton.type = 'button';
    statusButton.disabled = state.busy;
    statusButton.addEventListener(
      'click',
      () => changeJobStatus(String(job.Job_ID || ''), status)
    );

    actions.appendChild(editButton);
    actions.appendChild(statusButton);

    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    return row;
  }

  function renderJobs() {
    const tbody = $('manageJobsTableBody');
    if (!tbody) return;

    tbody.replaceChildren();

    const jobs = state.filteredJobs;

    if (jobs.length === 0) {
      show('manageJobsTableWrap', false);
      show('manageJobsPagination', false);
      show('manageJobsEmpty', true);

      if (state.jobs.length === 0) {
        setText('manageJobsEmptyTitle', 'No jobs posted yet');
        setText(
          'manageJobsEmptyDescription',
          'Your job postings will appear here once jobs are published.'
        );
        show('manageJobsEmptyAction', true);
      } else {
        setText('manageJobsEmptyTitle', 'No matching jobs found');
        setText(
          'manageJobsEmptyDescription',
          'Try changing your search term or status filter.'
        );
        show('manageJobsEmptyAction', false);
      }

      setText('jobsResultCount', '0 jobs found');
      return;
    }

    const start = (state.currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageJobs = jobs.slice(start, end);
    const fragment = document.createDocumentFragment();

    pageJobs.forEach(job => {
      fragment.appendChild(createJobRow(job));
    });

    tbody.appendChild(fragment);

    show('manageJobsEmpty', false);
    show('manageJobsTableWrap', true);

    const totalPages = Math.ceil(jobs.length / PAGE_SIZE);

    show('manageJobsPagination', totalPages > 1);

    setText(
      'jobsPageInfo',
      'Page ' + state.currentPage + ' of ' + totalPages
    );

    const previous = $('jobsPreviousButton');
    const next = $('jobsNextButton');

    if (previous) previous.disabled = state.currentPage <= 1;
    if (next) next.disabled = state.currentPage >= totalPages;

    setText(
      'jobsResultCount',
      'Showing ' +
      (start + 1) +
      '–' +
      Math.min(end, jobs.length) +
      ' of ' +
      jobs.length +
      ' jobs'
    );
  }

  function setLoading(loading) {
    state.loading = loading;

    show('manageJobsSkeleton', loading);

    if (loading) {
      show('manageJobsTableWrap', false);
      show('manageJobsEmpty', false);
      show('manageJobsPagination', false);
      setText('jobsResultCount', 'Loading jobs...');
    }

    const refreshButton = $('refreshJobsButton');

    if (refreshButton) {
      refreshButton.disabled = loading || state.busy;
      refreshButton.textContent =
        loading ? 'Loading...' : 'Refresh';
    }
  }

  async function loadJobs() {
    if (state.loading) return;

    setLoading(true);

    try {
      const result = await API.post(
        'getEmployerJobs',
        { sessionToken: state.sessionToken }
      );

      if (!result || result.success !== true) {
        if (isInvalidSession(result)) {
          window.location.replace('login.html');
          return;
        }

        throw new Error(
          result?.message || 'Unable to load employer jobs.'
        );
      }

      if (
        !result.data ||
        !Array.isArray(result.data.jobs)
      ) {
        throw new Error(
          'Invalid job list received from the server.'
        );
      }

      state.jobs = result.data.jobs.filter(
        job => job && typeof job === 'object'
      );

      updateStatistics();
      applyFilters(false);

    } catch (error) {
      showAlert(
        error?.message || 'Unable to load jobs. Please try again.'
      );

      if (state.jobs.length === 0) {
        setText('jobsResultCount', 'Unable to load jobs');
      } else {
        applyFilters(false);
      }
    } finally {
      setLoading(false);
    }
  }

  function initializeEvents() {
    $('jobSearch')?.addEventListener(
      'input',
      () => applyFilters(true)
    );

    $('jobStatusFilter')?.addEventListener(
      'change',
      () => applyFilters(true)
    );

    $('jobSort')?.addEventListener(
      'change',
      () => applyFilters(true)
    );

    $('refreshJobsButton')?.addEventListener(
      'click',
      () => {
        hideAlert();
        loadJobs();
      }
    );

    $('jobsPreviousButton')?.addEventListener(
      'click',
      () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          renderJobs();
        }
      }
    );

    $('jobsNextButton')?.addEventListener(
      'click',
      () => {
        const totalPages = Math.ceil(
          state.filteredJobs.length / PAGE_SIZE
        );

        if (state.currentPage < totalPages) {
          state.currentPage++;
          renderJobs();
        }
      }
    );
  }

  async function initialize() {
    initializeEvents();

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
      await loadJobs();

    } catch (error) {
      setLoading(false);

      showAlert(
        error?.message || 'Unable to initialize Manage Jobs.'
      );

      setText('jobsResultCount', 'Unable to load jobs');
    }
  }

  initialize();

})();
