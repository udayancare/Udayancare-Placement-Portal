'use strict';

/*
 * UCPP V2
 * Public Jobs Page
 */

(function () {

  const state = {
    page: 1,
    limit:
      window.UCPP_CONFIG?.PAGINATION?.JOBS_PER_PAGE || 10,

    search: '',
    city: '',
    category: '',
    jobType: '',
    workMode: '',

    totalPages: 0,
    totalRecords: 0
  };


  const elements = {

    searchForm:
      document.getElementById('jobsSearchForm'),

    searchInput:
      document.getElementById('jobSearch'),

    city:
      document.getElementById('cityFilter'),

    category:
      document.getElementById('categoryFilter'),

    jobType:
      document.getElementById('jobTypeFilter'),

    workMode:
      document.getElementById('workModeFilter'),

    clear:
      document.getElementById('clearFilters'),

    emptyClear:
      document.getElementById('emptyClearFilters'),

    grid:
      document.getElementById('jobsGrid'),

    skeleton:
      document.getElementById('jobsSkeleton'),

    empty:
      document.getElementById('jobsEmpty'),

    error:
      document.getElementById('jobsError'),

    errorMessage:
      document.getElementById('jobsErrorMessage'),

    retry:
      document.getElementById('retryJobs'),

    count:
      document.getElementById('jobsResultCount'),

    pagination:
      document.getElementById('jobsPagination'),

    previous:
      document.getElementById('previousPage'),

    next:
      document.getElementById('nextPage'),

    pageNumbers:
      document.getElementById('pageNumbers')

  };


  if (
    !elements.grid ||
    !elements.skeleton ||
    !elements.count
  ) {
    return;
  }


  /* =========================
     HELPERS
  ========================= */

  function clean(
    value,
    fallback = 'Not specified'
  ) {

    const result =
      String(value ?? '').trim();

    return result || fallback;

  }


  function hideResults() {

    elements.grid.hidden = true;
    elements.skeleton.hidden = true;
    elements.empty.hidden = true;
    elements.error.hidden = true;
    elements.pagination.hidden = true;

  }


  function showLoading() {

    hideResults();

    elements.skeleton.hidden = false;

    elements.count.textContent =
      'Loading opportunities...';

  }


  function showError(error) {

    hideResults();

    elements.error.hidden = false;

    elements.count.textContent =
      'Unable to load jobs.';

    elements.errorMessage.textContent =
      error?.message ||
      'Please try again.';

  }


  function formatLocation(job) {

    const values = [
      job.City,
      job.State
    ]
      .map(value =>
        String(value ?? '').trim()
      )
      .filter(Boolean);


    return values.length
      ? values.join(', ')
      : 'Not specified';

  }


  function formatSalary(minValue, maxValue) {

    const min =
      Number(minValue);

    const max =
      Number(maxValue);


    const hasMin =
      Number.isFinite(min) &&
      min > 0;

    const hasMax =
      Number.isFinite(max) &&
      max > 0;


    const format =
      value =>
        new Intl.NumberFormat(
          'en-IN',
          {
            maximumFractionDigits: 0
          }
        ).format(value);


    if (
      hasMin &&
      hasMax &&
      min !== max
    ) {

      return (
        '₹' +
        format(min) +
        ' – ₹' +
        format(max)
      );

    }


    if (hasMin) {
      return '₹' + format(min);
    }


    if (hasMax) {
      return '₹' + format(max);
    }


    return 'Not specified';

  }


  function formatDate(value) {

    if (!value) {
      return 'Not specified';
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return 'Not specified';
    }


    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      }
    ).format(date);

  }


  /* =========================
     CARD
  ========================= */

  function createDetail(
    labelText,
    valueText
  ) {

    const box =
      document.createElement('div');

    box.className =
      'job-card__detail';


    const label =
      document.createElement('span');

    label.className =
      'job-card__detail-label';

    label.textContent =
      labelText;


    const value =
      document.createElement('span');

    value.className =
      'job-card__detail-value';

    value.textContent =
      valueText;


    box.append(
      label,
      value
    );


    return box;

  }


  function createJobCard(job) {

    const card =
      document.createElement('article');

    card.className =
      'job-card';


    const top =
      document.createElement('div');

    top.className =
      'job-card__top';


    const badges =
      document.createElement('div');

    badges.className =
      'job-card__badges';


    const typeBadge =
      document.createElement('span');

    typeBadge.className =
      'job-card__badge';

    typeBadge.textContent =
      clean(
        job.Job_Type,
        'Opportunity'
      );


    badges.appendChild(
      typeBadge
    );


    if (
      String(job.Work_Mode ?? '').trim()
    ) {

      const modeBadge =
        document.createElement('span');

      modeBadge.className =
        'job-card__badge job-card__badge--mode';

      modeBadge.textContent =
        job.Work_Mode;

      badges.appendChild(
        modeBadge
      );

    }


    top.appendChild(badges);


    const title =
      document.createElement('h3');

    title.textContent =
      clean(
        job.Job_Title,
        'Job Opportunity'
      );


    const company =
      document.createElement('div');

    company.className =
      'job-card__company';

    company.textContent =
      clean(
        job.Company_Name,
        'Employer'
      );


    const details =
      document.createElement('div');

    details.className =
      'job-card__details';


    details.append(
      createDetail(
        'Location',
        formatLocation(job)
      ),

      createDetail(
        'Salary',
        formatSalary(
          job.Salary_Min,
          job.Salary_Max
        )
      ),

      createDetail(
        'Experience',
        clean(job.Experience)
      ),

      createDetail(
        'Qualification',
        clean(job.Qualification)
      )
    );


    const footer =
      document.createElement('div');

    footer.className =
      'job-card__footer';


    const deadline =
      document.createElement('div');

    deadline.className =
      'job-card__deadline';

    deadline.textContent =
      'Apply by: ' +
      formatDate(
        job.Application_Last_Date
      );


    const link =
      document.createElement('a');

    link.className =
      'btn btn-primary';

    link.textContent =
      'View Details';


    const jobId =
      String(
        job.Job_ID ?? ''
      ).trim();


    link.href =
      jobId
        ? 'job-details.html?id=' +
          encodeURIComponent(jobId)
        : 'jobs.html';


    footer.append(
      deadline,
      link
    );


    card.append(
      top,
      title,
      company,
      details,
      footer
    );


    return card;

  }


  /* =========================
     FILTER OPTIONS
  ========================= */

  function addOptions(
    select,
    jobs,
    field
  ) {

    if (!select) {
      return;
    }


    const existing =
      new Set(
        Array.from(
          select.options
        )
          .map(option =>
            option.value
          )
          .filter(Boolean)
      );


    const values =
      jobs
        .map(job =>
          String(
            job[field] ?? ''
          ).trim()
        )
        .filter(Boolean);


    [
      ...new Set(values)
    ]
      .sort(
        (a, b) =>
          a.localeCompare(b)
      )
      .forEach(value => {

        if (
          existing.has(value)
        ) {
          return;
        }


        const option =
          document.createElement(
            'option'
          );

        option.value =
          value;

        option.textContent =
          value;


        select.appendChild(
          option
        );

      });

  }


  function updateFilterOptions(jobs) {

    addOptions(
      elements.city,
      jobs,
      'City'
    );

    addOptions(
      elements.category,
      jobs,
      'Job_Category'
    );

    addOptions(
      elements.jobType,
      jobs,
      'Job_Type'
    );

    addOptions(
      elements.workMode,
      jobs,
      'Work_Mode'
    );

  }


  /* =========================
     PAGINATION
  ========================= */

  function renderPagination() {

    elements.pageNumbers
      .replaceChildren();


    if (
      state.totalPages <= 1
    ) {

      elements.pagination.hidden =
        true;

      return;

    }


    elements.pagination.hidden =
      false;


    elements.previous.disabled =
      state.page <= 1;


    elements.next.disabled =
      state.page >=
      state.totalPages;


    for (
      let page = 1;
      page <= state.totalPages;
      page++
    ) {

      const button =
        document.createElement(
          'button'
        );


      button.type =
        'button';


      button.className =
        'jobs-page-number';


      if (
        page === state.page
      ) {

        button.classList.add(
          'is-active'
        );


        button.setAttribute(
          'aria-current',
          'page'
        );

      }


      button.textContent =
        String(page);


      button.addEventListener(
        'click',
        function () {

          if (
            page === state.page
          ) {
            return;
          }


          state.page =
            page;


          loadJobs(true);

        }
      );


      elements.pageNumbers
        .appendChild(button);

    }

  }


  /* =========================
     RENDER
  ========================= */

  function renderJobs(
    jobs,
    meta
  ) {

    hideResults();

    elements.grid
      .replaceChildren();


    state.totalRecords =
      Number(
        meta?.totalRecords
      ) || 0;


    state.totalPages =
      Number(
        meta?.totalPages
      ) || 0;


    if (
      !Array.isArray(jobs) ||
      jobs.length === 0
    ) {

      elements.empty.hidden =
        false;


      elements.count.textContent =
        'No matching jobs found.';


      return;

    }


    updateFilterOptions(jobs);


    const fragment =
      document.createDocumentFragment();


    jobs.forEach(job => {

      fragment.appendChild(
        createJobCard(job)
      );

    });


    elements.grid
      .appendChild(fragment);


    elements.grid.hidden =
      false;


    elements.count.textContent =
      state.totalRecords +
      (
        state.totalRecords === 1
          ? ' opportunity found'
          : ' opportunities found'
      );


    renderPagination();

  }


  /* =========================
     LOAD JOBS
  ========================= */

  async function loadJobs(
    scrollToResults = false
  ) {

    showLoading();


    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.getJobs !==
        'function'
    ) {

      showError(
        new Error(
          'API client unavailable.'
        )
      );

      return;

    }


    try {

      const response =
        await window.UCPP_API.getJobs({

          page:
            state.page,

          limit:
            state.limit,

          search:
            state.search,

          city:
            state.city,

          category:
            state.category,

          jobType:
            state.jobType,

          workMode:
            state.workMode

        });


      renderJobs(
        response.data || [],
        response.meta || {}
      );


      if (scrollToResults) {

        document
          .querySelector(
            '.jobs-results-header'
          )
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

      }

    }

    catch (error) {

      console.error(
        'Jobs page error:',
        error
      );


      showError(error);

    }

  }


  /* =========================
     APPLY FILTERS
  ========================= */

  function readFilters() {

    state.search =
      elements.searchInput
        ?.value
        .trim() || '';


    state.city =
      elements.city
        ?.value || '';


    state.category =
      elements.category
        ?.value || '';


    state.jobType =
      elements.jobType
        ?.value || '';


    state.workMode =
      elements.workMode
        ?.value || '';

  }


  function applyFilters() {

    readFilters();

    state.page = 1;

    loadJobs();

  }


  function clearFilters() {

    if (elements.searchInput) {
      elements.searchInput.value =
        '';
    }

    if (elements.city) {
      elements.city.value =
        '';
    }

    if (elements.category) {
      elements.category.value =
        '';
    }

    if (elements.jobType) {
      elements.jobType.value =
        '';
    }

    if (elements.workMode) {
      elements.workMode.value =
        '';
    }


    state.search = '';
    state.city = '';
    state.category = '';
    state.jobType = '';
    state.workMode = '';
    state.page = 1;


    loadJobs();

  }


  /* =========================
     EVENTS
  ========================= */

  elements.searchForm
    ?.addEventListener(
      'submit',
      function (event) {

        event.preventDefault();

        applyFilters();

      }
    );


  [
    elements.city,
    elements.category,
    elements.jobType,
    elements.workMode
  ]
    .forEach(select => {

      select?.addEventListener(
        'change',
        applyFilters
      );

    });


  elements.clear
    ?.addEventListener(
      'click',
      clearFilters
    );


  elements.emptyClear
    ?.addEventListener(
      'click',
      clearFilters
    );


  elements.retry
    ?.addEventListener(
      'click',
      function () {

        loadJobs();

      }
    );


  elements.previous
    ?.addEventListener(
      'click',
      function () {

        if (
          state.page <= 1
        ) {
          return;
        }


        state.page--;


        loadJobs(true);

      }
    );


  elements.next
    ?.addEventListener(
      'click',
      function () {

        if (
          state.page >=
          state.totalPages
        ) {
          return;
        }


        state.page++;


        loadJobs(true);

      }
    );


  /* =========================
     INITIAL LOAD
  ========================= */

  loadJobs();


})();
