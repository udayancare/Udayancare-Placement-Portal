
'use strict';

/*
 * UCPP V2 — Employer Dashboard
 * Read-only dashboard
 * No production data writes
 */

(function () {

  const API = window.UCPP_API;
  const SESSION = window.UCPP_SESSION_MANAGER;

  const $ = id => document.getElementById(id);

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value ?? '—';
  }

  function show(id, visible) {
    const element = $(id);
    if (element) element.hidden = !visible;
  }

  function initials(name) {
    const words = String(name || 'Company').trim().split(/\s+/);
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  }

  function dateValue(value) {
    if (!value) return 0;
    const parsed = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function formatDate(value) {
    const time = dateValue(value);
    if (!time) return 'Date unavailable';
    return new Date(time).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  function statusClass(value) {
    const status = String(value || '').trim().toLowerCase();
    return ['applied', 'viewed', 'shortlisted', 'interview', 'rejected']
      .includes(status) ? status : '';
  }

  function renderProfile(profile) {
    const company = profile.companyName || 'Employer';

    setText('employerCompanyName', company);
    setText('heroCompanyName', company);
    setText('profileCompanyName', company);
    setText('heroEmployerId', 'Employer ID: ' + (profile.employerId || '—'));
    setText('profileEmployerId', profile.employerId);
    setText('companyInitials', initials(company));
    setText('companyIndustry', profile.industry || 'Industry not specified');
    setText('companyContactPerson', profile.contactPerson);
    setText('companyCity', profile.city);

    const verification = profile.verificationStatus || 'Not specified';
    setText('heroVerificationStatus', 'Verification: ' + verification);
    setText('companyVerificationStatus', verification);
  }

  function renderJobs(jobs, total) {
    const list = Array.isArray(jobs) ? jobs : [];

    setText('totalJobsCount', total);
    setText('activeJobsCount',
      list.filter(job =>
        String(job.Job_Status || '').trim().toLowerCase() === 'active'
      ).length
    );

    const recent = [...list]
      .sort((a, b) => dateValue(b.Posted_Date) - dateValue(a.Posted_Date))
      .slice(0, 4);

    const container = $('recentJobs');

    if (container) {
      container.replaceChildren();

      recent.forEach(job => {
        const card = document.createElement('article');
        card.className = 'dashboard-job';

        const title = escapeHTML(job.Job_Title || 'Untitled Job');
        const city = escapeHTML(job.City || 'Location not specified');
        const category = escapeHTML(job.Job_Category || 'Job Opportunity');
        const status = String(job.Job_Status || 'Unknown').trim();
        const safeStatus = ['Active', 'Closed'].includes(status) ? status.toLowerCase() : 'draft';

        card.innerHTML = `
          <span class="dashboard-job-company">${escapeHTML(job.Company_Name || 'Your Company')}</span>
          <h3>${title}</h3>
          <div class="dashboard-job-meta">
            <span>${city}</span>
            <span>${category}</span>
            <span class="job-status ${safeStatus}">${escapeHTML(status)}</span>
          </div>
          <div class="dashboard-job-footer">
            <small>${escapeHTML(formatDate(job.Posted_Date))}</small>
            <a class="dashboard-job-link" href="manage-jobs.html">
              Manage Job →
            </a>
          </div>
        `;

        container.appendChild(card);
      });
    }

    show('jobsSkeleton', false);
    show('recentJobs', recent.length > 0);
    show('jobsEmpty', recent.length === 0);
  }

  function renderApplications(applications, total) {
    const list = Array.isArray(applications) ? applications : [];

    setText('applicationsReceivedCount', total);

    const counts = {
      applied: 0,
      viewed: 0,
      shortlisted: 0,
      interview: 0,
      rejected: 0
    };

    list.forEach(application => {
      const status = statusClass(application.Application_Status);
      if (status) counts[status]++;
    });

    setText('shortlistedCandidatesCount', counts.shortlisted);
    setText('statusApplied', counts.applied);
    setText('statusViewed', counts.viewed);
    setText('statusShortlisted', counts.shortlisted);
    setText('statusInterview', counts.interview);
    setText('statusRejected', counts.rejected);

    const recent = [...list]
      .sort((a, b) => dateValue(b.Applied_Date) - dateValue(a.Applied_Date))
      .slice(0, 5);

    const container = $('recentApplications');

    if (container) {
      container.replaceChildren();

      recent.forEach(application => {
        const item = document.createElement('article');
        item.className = 'application-item';

        const status = String(application.Application_Status || 'Applied').trim();
        const statusCSS = statusClass(status);

        item.innerHTML = `
          <div>
            <h3 class="application-title">
              ${escapeHTML(application.Candidate_Name || 'Candidate')}
            </h3>
            <p class="application-company">
              Applied for: ${escapeHTML(application.Job_Title || 'Job Opportunity')}
            </p>
            <div class="application-meta">
              <span>${escapeHTML(formatDate(application.Applied_Date))}</span>
              <span>${escapeHTML(application['Current City'] || '')}</span>
            </div>
          </div>
          <span class="application-status ${statusCSS}">
            ${escapeHTML(status)}
          </span>
        `;

        container.appendChild(item);
      });
    }

    show('applicationsSkeleton', false);
    show('recentApplications', recent.length > 0);
    show('applicationsEmpty', recent.length === 0);
  }

  async function loadDashboard() {
    show('dashboardError', false);
    show('applicationsSkeleton', true);
    show('jobsSkeleton', true);
    show('recentApplications', false);
    show('recentJobs', false);
    show('applicationsEmpty', false);
    show('jobsEmpty', false);

    try {
      if (!API || typeof API.post !== 'function' ||
          !SESSION || typeof SESSION.getSession !== 'function') {
        throw new Error('Dashboard services are unavailable.');
      }

      const session = SESSION.getSession();

      if (!session || session.role !== 'employer' || !session.sessionToken) {
        window.location.replace('login.html');
        return;
      }

      if (typeof SESSION.validateSession !== 'function') {
        throw new Error('Session validation service is unavailable.');
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
    'Unable to verify your session. Please try again.'
  );
}

      const payload = { sessionToken: session.sessionToken };

      const [profileResult, jobsResult, applicationsResult] =
        await Promise.all([
          API.post('getEmployerProfile', payload),
          API.post('getEmployerJobs', payload),
          API.post('getEmployerApplications', payload)
        ]);

      if (
        !profileResult?.success ||
        !jobsResult?.success ||
        !applicationsResult?.success
      ) {
        const failed = [profileResult, jobsResult, applicationsResult]
          .find(result => !result?.success);

        if (failed?.code === 'INVALID_SESSION') {
          window.location.replace('login.html');
          return;
        }

        throw new Error(failed?.message || 'Unable to load dashboard data.');
      }

      const profile = profileResult.data || {};
      const jobsData = jobsResult.data || {};
      const applicationsData = applicationsResult.data || {};

      renderProfile(profile);

      renderJobs(
        jobsData.jobs,
        Number(jobsData.total) || 0
      );

      renderApplications(
        applicationsData.applications,
        Number(applicationsData.total) || 0
      );

    } catch (error) {
      show('applicationsSkeleton', false);
      show('jobsSkeleton', false);

      setText('dashboardErrorMessage',
        error.message || 'Please try again later.'
      );

      show('dashboardError', true);
    }
  }

  $('dashboardRetry')?.addEventListener('click', loadDashboard);

  loadDashboard();

})();
