
'use strict';

/*
 * =========================================================
 * UCPP V2
 * Global Footer
 * Version 1.1.0 - Social Media Integration
 * =========================================================
 */

(function () {

  const footerTarget =
    document.getElementById('siteFooter');

  if (!footerTarget) {
    return;
  }

  /*
   * PATH
   */

  const path =
    window.location.pathname.replace(/\\/g, '/');

  const isNestedPage =
    path.includes('/candidate/') ||
    path.includes('/employer/') ||
    path.includes('/admin/');

  const root = isNestedPage ? '../' : '';

  const currentYear = new Date().getFullYear();

  /*
   * OFFICIAL SOCIAL LINKS
   */

  const SOCIAL = Object.freeze({
    facebook: 'https://www.facebook.com/udayancareindia',
    linkedin: 'https://www.linkedin.com/company/udayan-care',
    instagram: 'https://www.instagram.com/udayancare',
    youtube: 'https://www.youtube.com/@UdayanCare',
    whatsapp: 'https://wa.me/911127821333'
  });

  /*
   * SOCIAL ICONS
   * Inline SVG - no external icon library required.
   */

  const ICONS = {
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    linkedin: '<rect x="2" y="9" width="4" height="13"/><circle cx="4" cy="4" r="2"/><path d="M10 9h4v2a5 5 0 0 1 8 4v7h-4v-7a2 2 0 0 0-4 0v7h-4z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    whatsapp: '<path d="M21 11.5a9 9 0 0 1-13.2 8L3 21l1.5-4.8A9 9 0 1 1 21 11.5z"/><path d="M8 8c1 4 4 7 8 8l2-2-3-2-1 1c-1.5-.7-2.3-1.5-3-3l1-1-2-3z"/>'
  };

  function socialLink(platform, label) {
    return `
      <a
        class="site-footer__social-link social-${platform}"
        href="${SOCIAL[platform]}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="${label}"
        title="${label}"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          ${ICONS[platform]}
        </svg>
      </a>
    `;
  }

  /*
   * RENDER
   */

  footerTarget.innerHTML = `

    <footer class="site-footer">

      <div class="container site-footer__main">

        <!-- BRAND -->

        <div class="site-footer__brand">

          <a
            href="${root}index.html"
            class="site-footer__brand-header"
          >

            <span class="site-footer__logo">
              UC
            </span>

            <span>

              <strong>
                Udayan Care
              </strong>

              <small>
                Placement Portal
              </small>

            </span>

          </a>

          <p class="site-footer__description">

            Connecting candidates with employment
            opportunities and supporting their journey
            towards meaningful careers.

          </p>

          <div class="site-footer__badge">

            Making Young Lives Shine Through Employment

          </div>

          <!-- SOCIAL MEDIA -->

          <div class="site-footer__social">

            <h3 class="site-footer__social-title">
              Connect With Us
            </h3>

            <div
              class="site-footer__social-links"
              aria-label="Udayan Care social media"
            >

              ${socialLink('facebook', 'Facebook')}

              ${socialLink('linkedin', 'LinkedIn')}

              ${socialLink('instagram', 'Instagram')}

              ${socialLink('youtube', 'YouTube')}

              ${socialLink('whatsapp', 'WhatsApp')}

            </div>

          </div>

        </div>

        <!-- QUICK LINKS -->

        <div class="site-footer__column">

          <h3>
            Quick Links
          </h3>

          <ul class="site-footer__links">

            <li>
              <a href="${root}index.html">
                Home
              </a>
            </li>

            <li>
              <a href="${root}jobs.html">
                Find Jobs
              </a>
            </li>

            <li>
              <a href="${root}about.html">
                About Us
              </a>
            </li>

            <li>
              <a href="${root}contact.html">
                Contact
              </a>
            </li>

          </ul>

        </div>

        <!-- CANDIDATES -->

        <div class="site-footer__column">

          <h3>
            For Candidates
          </h3>

          <ul class="site-footer__links">

            <li>
              <a href="${root}candidate/login.html">
                Candidate Login
              </a>
            </li>

            <li>
              <a href="${root}candidate/register.html">
                Candidate Registration
              </a>
            </li>

            <li>
              <a href="${root}jobs.html">
                Explore Jobs
              </a>
            </li>

            <li>
              <a href="${root}candidate/applications.html">
                My Applications
              </a>
            </li>

          </ul>

        </div>

        <!-- EMPLOYERS -->

        <div class="site-footer__column">

          <h3>
            For Employers
          </h3>

          <ul class="site-footer__links">

            <li>
              <a href="${root}employer/login.html">
                Employer Login
              </a>
            </li>

            <li>
              <a href="${root}employer/register.html">
                Employer Registration
              </a>
            </li>

            <li>
              <a href="${root}employer/post-job.html">
                Post a Job
              </a>
            </li>

            <li>
              <a href="${root}employer/applications.html">
                Applications
              </a>
            </li>

          </ul>

        </div>

      </div>

      <!-- BOTTOM -->

      <div class="site-footer__bottom">

        <div class="container site-footer__bottom-inner">

          <p>
            © ${currentYear} Udayan Care.
            All rights reserved.
          </p>

          <p class="site-footer__initiative">
            An Initiative of Udayan Care
          </p>

        </div>

      </div>

    </footer>
  `;

})();
