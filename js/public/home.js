'use strict';

/*
 * UCPP V2
 * Home Page
 */

(function () {

  const jobsGrid =
    document.getElementById('homeJobsGrid');

  const skeleton =
    document.getElementById('homeJobsSkeleton');

  const errorBox =
    document.getElementById('homeJobsError');

  const emptyBox =
    document.getElementById('homeJobsEmpty');

  const jobsCount =
    document.getElementById('homeJobsCount');

  const retryButton =
    document.getElementById('homeJobsRetry');


  if (
    !jobsGrid ||
    !skeleton ||
    !errorBox ||
    !emptyBox ||
    !jobsCount
  ) {
    return;
  }


  function hideStates() {

    jobsGrid.hidden = true;
    skeleton.hidden = true;
    errorBox.hidden = true;
    emptyBox.hidden = true;

  }


  function showLoading() {

    hideStates();

    skeleton.hidden = false;

    jobsCount.textContent =
      'Loading latest opportunities...';

  }


  function showError() {

    hideStates();

    errorBox.hidden = false;

    jobsCount.textContent =
      'Unable to load opportunities.';

  }


  function showEmpty() {

    hideStates();

    emptyBox.hidden = false;

    jobsCount.textContent =
      'No active opportunities available.';

  }


  /*
   * Safe text helper
   */
  function text(value, fallback = 'Not specified') {

    const cleaned =
      String(value ?? '').trim();

    return cleaned || fallback;

  }


  /*
   * Location
   */
  function formatLocation(job) {

    const parts = [
      job.City,
      job.State
    ]
      .map(value =>
        String(value ?? '').trim()
      )
      .filter(Boolean);


    return parts.length
      ? parts.join(', ')
      : 'Location not specified';

  }


  /*
   * Salary
   */
  function formatSalary(
    minSalary,
    maxSalary
  ) {

    const min =
      Number(minSalary);

    const max =
      Number(maxSalary);


    const hasMin =
      Number.isFinite(min) &&
      min > 0;

    const hasMax =
      Number.isFinite(max) &&
      max > 0;


    const money =
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
        money(min) +
        ' – ₹' +
        money(max)
      );

    }


    if (hasMin) {

      return (
        '₹' +
        money(min)
      );

    }


    if (hasMax) {

      return (
        '₹' +
        money(max)
      );

    }


    return 'Salary not specified';

  }


  /*
   * Create job card safely using DOM.
   * API values are inserted using textContent,
   * not innerHTML.
   */
  function createJobCard(job) {

    const article =
      document.createElement('article');

    article.className =
      'home-job-card';


    const top =
      document.createElement('div');

    top.className =
      'home-job-card__top';


    const type =
      document.createElement('span');

    type.className =
      'home-job-card__type';

    type.textContent =
      text(
        job.Job_Type,
        'Opportunity'
      );


    top.appendChild(type);


    const title =
      document.createElement('h3');

    title.textContent =
      text(
        job.Job_Title,
        'Job Opportunity'
      );


    const company =
      document.createElement('div');

    company.className =
      'home-job-card__company';

    company.textContent =
      text(
        job.Company_Name,
        'Employer'
      );


    const meta =
      document.createElement('div');

    meta.className =
      'home-job-card__meta';


    const location =
      document.createElement('span');

    location.textContent =
      formatLocation(job);


    const salary =
      document.createElement('span');

    salary.textContent =
      formatSalary(
        job.Salary_Min,
        job.Salary_Max
      );


    meta.append(
      location,
      salary
    );


    const footer =
      document.createElement('div');

    footer.className =
      'home-job-card__footer';


    const link =
      document.createElement('a');

    link.className =
      'btn btn-outline';

    link.textContent =
      'View Job';


    const jobId =
      String(
        job.Job_ID ?? ''
      ).trim();


    if (jobId) {

      link.href =
        'job-details.html?id=' +
        encodeURIComponent(jobId);

    }

    else {

      link.href =
        'jobs.html';

    }


    footer.appendChild(link);


    article.append(
      top,
      title,
      company,
      meta,
      footer
    );


    return article;

  }


  function renderJobs(
    jobs,
    totalRecords
  ) {

    hideStates();

    jobsGrid.replaceChildren();


    if (
      !Array.isArray(jobs) ||
      jobs.length === 0
    ) {

      showEmpty();

      return;

    }


    const fragment =
      document.createDocumentFragment();


    jobs.forEach(job => {

      fragment.appendChild(
        createJobCard(job)
      );

    });


    jobsGrid.appendChild(
      fragment
    );


    jobsGrid.hidden = false;


    const total =
      Number(totalRecords);


    if (
      Number.isFinite(total) &&
      total >= 0
    ) {

      jobsCount.textContent =
        total +
        (
          total === 1
            ? ' active opportunity'
            : ' active opportunities'
        );

    }

    else {

      jobsCount.textContent =
        'Latest active opportunities';

    }

  }


  /*
   * Load only 3 jobs for home page.
   * Full jobs page will handle
   * pagination separately.
   */
  async function loadJobs() {

    showLoading();


    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.getJobs !==
        'function'
    ) {

      console.error(
        'UCPP API client is unavailable.'
      );

      showError();

      return;

    }


    try {

      const response =
        await window.UCPP_API.getJobs({
          page: 1,
          limit: 3
        });


      renderJobs(
        response.data || [],
        response.meta?.totalRecords
      );

    }

    catch (error) {

      console.error(
        'Home jobs error:',
        error
      );

      showError();

    }

  }


  if (retryButton) {

    retryButton.addEventListener(
      'click',
      loadJobs
    );

  }


  loadJobs();


})();
