'use strict';

/*
 * =========================================================
 * UCPP V2
 * Global Role-Aware Header
 * =========================================================
 */

(function () {

  const headerTarget =
    document.getElementById('siteHeader');

  if (!headerTarget) {
    return;
  }


  /*
   * PATH
   */

  const path =
    window.location.pathname
      .replace(/\\/g, '/');


  const isNestedPage =
    path.includes('/candidate/') ||
    path.includes('/employer/') ||
    path.includes('/admin/');


  const root =
    isNestedPage ? '../' : '';


  const fileName =
    path.split('/').pop() ||
    'index.html';


  const isCandidateArea =
    path.includes('/candidate/');


  const isEmployerArea =
    path.includes('/employer/');


  const isAdminArea =
    path.includes('/admin/');


  /*
   * SESSION
   *
   * Later secure auth module will provide this.
   * No fake authentication is created here.
   */

  const session =
    window.UCPP_SESSION || null;


  const isAuthenticated =
    session &&
    session.isAuthenticated === true;


  const role =
    isAuthenticated
      ? String(session.role || '')
          .trim()
          .toLowerCase()
      : 'public';


  /*
   * ACTIVE LINK
   */

  function active(files) {

    return files.includes(fileName)
      ? ' is-active'
      : '';

  }


  /*
   * PUBLIC NAV
   */

  function publicNavigation() {

    return `
      <div class="ucpp-nav__links">

        <a
          class="ucpp-nav__link${active(['index.html', ''])}"
          href="${root}index.html"
        >
          <span class="ucpp-nav__icon">⌂</span>
          <span>Home</span>
        </a>

        <a
          class="ucpp-nav__link${active([
            'jobs.html',
            'job-details.html'
          ])}"
          href="${root}jobs.html"
        >
          <span class="ucpp-nav__icon">▣</span>
          <span>Jobs</span>
        </a>

        <a
          class="ucpp-nav__link${active(['about.html'])}"
          href="${root}about.html"
        >
          <span class="ucpp-nav__icon">◎</span>
          <span>About</span>
        </a>

        <a
          class="ucpp-nav__link${active(['contact.html'])}"
          href="${root}contact.html"
        >
          <span class="ucpp-nav__icon">✉</span>
          <span>Contact</span>
        </a>

      </div>


      <div class="ucpp-header__actions">

        <a
          class="ucpp-login-button ucpp-login-button--candidate"
          href="${root}candidate/login.html"
        >
          Candidate Login
        </a>

        <a
          class="ucpp-login-button ucpp-login-button--employer"
          href="${root}employer/login.html"
        >
          Employer Login
        </a>

      </div>
    `;

  }


  /*
   * CANDIDATE NAV
   */

  function candidateNavigation() {

    return `
      <div class="ucpp-nav__links">

        <a
          class="ucpp-nav__link${active(['dashboard.html'])}"
          href="${root}candidate/dashboard.html"
        >
          Dashboard
        </a>

        <a
          class="ucpp-nav__link${active([
            'available-jobs.html',
            'job-details.html'
          ])}"
          href="${root}candidate/available-jobs.html"
        >
          Find Jobs
        </a>

        <a
          class="ucpp-nav__link${active(['applications.html'])}"
          href="${root}candidate/applications.html"
        >
          My Applications
        </a>

        <a
          class="ucpp-nav__link${active(['profile.html'])}"
          href="${root}candidate/profile.html"
        >
          My Profile
        </a>

      </div>

      ${logoutButton()}
    `;

  }


  /*
   * EMPLOYER NAV
   */

  function employerNavigation() {

    return `
      <div class="ucpp-nav__links">

        <a
          class="ucpp-nav__link${active(['dashboard.html'])}"
          href="${root}employer/dashboard.html"
        >
          Dashboard
        </a>

        <a
          class="ucpp-nav__link${active(['post-job.html'])}"
          href="${root}employer/post-job.html"
        >
          Post Job
        </a>

        <a
          class="ucpp-nav__link${active(['manage-jobs.html'])}"
          href="${root}employer/manage-jobs.html"
        >
          Manage Jobs
        </a>

        <a
          class="ucpp-nav__link${active(['applications.html'])}"
          href="${root}employer/applications.html"
        >
          Applications
        </a>


        <a
          class="ucpp-nav__link${active(['company-profile.html'])}"
          href="${root}employer/company-profile.html"
        >
          Company Profile
        </a>

      </div>

      ${logoutButton()}
    `;

  }


  /*
   * ADMIN NAV
   */

  function adminNavigation() {

    return `
      <div class="ucpp-nav__links">

        <a
          class="ucpp-nav__link${active(['dashboard.html'])}"
          href="${root}admin/dashboard.html"
        >
          Dashboard
        </a>

        <a
          class="ucpp-nav__link${active(['candidates.html'])}"
          href="${root}admin/candidates.html"
        >
          Candidates
        </a>

        <a
          class="ucpp-nav__link${active(['employers.html'])}"
          href="${root}admin/employers.html"
        >
          Employers
        </a>

        <a
          class="ucpp-nav__link${active(['jobs.html'])}"
          href="${root}admin/jobs.html"
        >
          Jobs
        </a>

        <a
          class="ucpp-nav__link${active(['applications.html'])}"
          href="${root}admin/applications.html"
        >
          Applications
        </a>

        <a
          class="ucpp-nav__link${active(['reports.html'])}"
          href="${root}admin/reports.html"
        >
          Reports
        </a>

        <a
          class="ucpp-nav__link${active(['settings.html'])}"
          href="${root}admin/settings.html"
        >
          Settings
        </a>

      </div>

      ${logoutButton()}
    `;

  }


  /*
   * LOGOUT
   */

  function logoutButton() {

    return `
      <div class="ucpp-header__actions">

        <button
          type="button"
          id="ucppLogoutButton"
          class="ucpp-logout-button"
        >
          Logout
        </button>

      </div>
    `;

  }


  /*
   * DETERMINE NAV
   */

  function getNavigation() {

    if (!isAuthenticated) {
      return publicNavigation();
    }


    if (role === 'candidate') {
      return candidateNavigation();
    }


    if (role === 'employer') {
      return employerNavigation();
    }


    if (role === 'admin') {
      return adminNavigation();
    }


    return publicNavigation();

  }


  /*
   * BRAND TEXT
   */

  const brandTitle =
    role === 'admin' && isAuthenticated
      ? 'UCPP Admin'
      : 'Udayan Care';


  const brandSubtitle =
    role === 'admin' && isAuthenticated
      ? 'Administration'
      : 'Placement Portal';


  const brandLink =
    role === 'admin' && isAuthenticated
      ? root + 'admin/dashboard.html'
      : root + 'index.html';


  /*
   * RENDER
   */

  headerTarget.innerHTML = `

    <header class="ucpp-header">

      <div class="container ucpp-header__container">


        <a
          href="${brandLink}"
          class="ucpp-brand"
          aria-label="Udayan Care Placement Portal"
        >



<span
  class="ucpp-brand__logo"
  style="
    display: flex;
    align-items: center;
    justify-content: center;
    width: 210px;
    height: 64px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    overflow: visible;
    flex-shrink: 0;
  "
>
  <img
    src="${root}assets/images/udayan-care-logo.png"
    alt="Udayan Care Logo"
    width="210"
    height="64"
    style="
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    "
  >
</span>


          <span class="ucpp-brand__content">

            <strong class="ucpp-brand__title">
              ${brandTitle}
            </strong>

            <span class="ucpp-brand__subtitle">
              ${brandSubtitle}
            </span>

          </span>

        </a>


        <nav
          id="ucppNavigation"
          class="ucpp-nav"
          aria-label="Main navigation"
        >

          ${getNavigation()}

        </nav>


        <button
          type="button"
          id="ucppMenuButton"
          class="ucpp-menu-button"
          aria-label="Open menu"
          aria-expanded="false"
          aria-controls="ucppNavigation"
        >

          <span></span>
          <span></span>
          <span></span>

        </button>


      </div>

    </header>

  `;


  /*
   * MOBILE MENU
   */

  const menuButton =
    document.getElementById(
      'ucppMenuButton'
    );


  const navigation =
    document.getElementById(
      'ucppNavigation'
    );


  function closeMenu() {

    navigation?.classList.remove(
      'is-open'
    );


    menuButton?.classList.remove(
      'is-open'
    );


    menuButton?.setAttribute(
      'aria-expanded',
      'false'
    );

  }


  menuButton?.addEventListener(
    'click',
    function () {

      const open =
        navigation.classList.toggle(
          'is-open'
        );


      menuButton.classList.toggle(
        'is-open',
        open
      );


      menuButton.setAttribute(
        'aria-expanded',
        String(open)
      );

    }
  );


  navigation
    ?.querySelectorAll('a')
    .forEach(function (link) {

      link.addEventListener(
        'click',
        closeMenu
      );

    });


  document.addEventListener(
    'keydown',
    function (event) {

      if (event.key === 'Escape') {
        closeMenu();
      }

    }
  );


  window.addEventListener(
    'resize',
    function () {

      if (window.innerWidth > 1024) {
        closeMenu();
      }

    }
  );


  /*
   * LOGOUT
   */

  const logoutButtonElement =
    document.getElementById(
      'ucppLogoutButton'
    );


  logoutButtonElement
    ?.addEventListener(
      'click',
      function () {


if (
  window.UCPP_SESSION &&
  typeof window.UCPP_SESSION.logout === 'function'
) {

  const confirmed = window.confirm(
    'Are you sure you want to log out of your account?'
  );

  if (!confirmed) {
    return;
  }


const logoutButton = logoutButtonElement;

// Prevent multiple logout clicks
if (logoutButton.dataset.loggingOut === 'true') {
  return;
}

logoutButton.dataset.loggingOut = 'true';
logoutButton.disabled = true;

logoutButton.innerHTML = `
  <span
    style="
      display: inline-block;
      width: 15px;
      height: 15px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: ucppLogoutSpin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    "
  ></span>
  Logging out...
`;

// Add spinner animation once
if (!document.getElementById('ucppLogoutSpinnerStyle')) {
  const style = document.createElement('style');
  style.id = 'ucppLogoutSpinnerStyle';
  style.textContent = `
    @keyframes ucppLogoutSpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Allow browser to paint the loader before logout
requestAnimationFrame(() => {
  requestAnimationFrame(async () => {
    try {
      await window.UCPP_SESSION.logout();
    } catch (error) {
      console.error('Logout failed:', error);

      logoutButton.disabled = false;
      logoutButton.dataset.loggingOut = 'false';
      logoutButton.textContent = 'Logout';

      window.alert('Unable to log out. Please try again.');
    }
  });
});

return;

}



        console.warn(
          'Secure logout service is not connected yet.'
        );

      }
    );


})();
