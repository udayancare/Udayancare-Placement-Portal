'use strict';

/*
 * =========================================================
 * UCPP V2
 * Public Job Details Page
 * =========================================================
 */

(function () {


  /*
   * =======================================================
   * ELEMENTS
   * =======================================================
   */

  const elements = {

    loading:
      document.getElementById(
        'jobLoading'
      ),

    content:
      document.getElementById(
        'jobContent'
      ),

    error:
      document.getElementById(
        'jobError'
      ),

    errorMessage:
      document.getElementById(
        'jobErrorMessage'
      ),

    badges:
      document.getElementById(
        'jobBadges'
      ),

    title:
      document.getElementById(
        'jobTitle'
      ),

    company:
      document.getElementById(
        'jobCompany'
      ),

    descriptionSection:
      document.getElementById(
        'descriptionSection'
      ),

    description:
      document.getElementById(
        'jobDescription'
      ),

    responsibilitiesSection:
      document.getElementById(
        'responsibilitiesSection'
      ),

    responsibilities:
      document.getElementById(
        'jobResponsibilities'
      ),

    skillsSection:
      document.getElementById(
        'skillsSection'
      ),

    skills:
      document.getElementById(
        'jobSkills'
      ),

    qualification:
      document.getElementById(
        'jobQualification'
      ),

    experience:
      document.getElementById(
        'jobExperience'
      ),

    vacancies:
      document.getElementById(
        'jobVacancies'
      ),

    category:
      document.getElementById(
        'jobCategory'
      ),

    location:
      document.getElementById(
        'jobLocation'
      ),

    salary:
      document.getElementById(
        'jobSalary'
      ),

    type:
      document.getElementById(
        'jobType'
      ),

    workMode:
      document.getElementById(
        'jobWorkMode'
      ),

    posted:
      document.getElementById(
        'jobPostedDate'
      ),

    deadline:
      document.getElementById(
        'jobDeadline'
      ),

    mobileLocation:
      document.getElementById(
        'mobileLocation'
      ),

    mobileSalary:
      document.getElementById(
        'mobileSalary'
      ),

    sidebarCompany:
      document.getElementById(
        'sidebarCompany'
      ),

    sidebarAddress:
      document.getElementById(
        'sidebarAddress'
      ),

    applyButton:
      document.getElementById(
        'applyButton'
      )

  };



  /*
   * =======================================================
   * BASIC HELPERS
   * =======================================================
   */

  function clean(
    value,
    fallback = 'Not specified'
  ) {

    const text =
      String(
        value ?? ''
      ).trim();


    return text || fallback;

  }



  /*
   * =======================================================
   * URL JOB ID
   * =======================================================
   */

  function getJobId() {

    const params =
      new URLSearchParams(
        window.location.search
      );


    return String(
      params.get('id') || ''
    ).trim();

  }



  /*
   * =======================================================
   * STATES
   * =======================================================
   */

  function showLoading() {

    elements.loading.hidden =
      false;

    elements.content.hidden =
      true;

    elements.error.hidden =
      true;

  }


  function showContent() {

    elements.loading.hidden =
      true;

    elements.error.hidden =
      true;

    elements.content.hidden =
      false;

  }


  function showError(message) {

    elements.loading.hidden =
      true;

    elements.content.hidden =
      true;

    elements.error.hidden =
      false;


    elements.errorMessage.textContent =
      message ||
      'This job could not be loaded.';

  }



  /*
   * =======================================================
   * LOCATION
   * =======================================================
   */

  function formatLocation(job) {

    const locationParts = [

      job.City,

      job.District,

      job.State

    ]
      .map(value =>
        String(
          value ?? ''
        ).trim()
      )
      .filter(Boolean);


    /*
     * Remove duplicate location values.
     */

    const unique =
      [
        ...new Set(
          locationParts
        )
      ];


    return unique.length
      ? unique.join(', ')
      : 'Not specified';

  }



  /*
   * =======================================================
   * SALARY
   * =======================================================
   */

  function formatSalary(
    minValue,
    maxValue
  ) {

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


    const formatter =
      new Intl.NumberFormat(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      );


    if (
      hasMin &&
      hasMax
    ) {

      if (min === max) {

        return (
          '₹' +
          formatter.format(min)
        );

      }


      return (
        '₹' +
        formatter.format(min) +
        ' – ₹' +
        formatter.format(max)
      );

    }


    if (hasMin) {

      return (
        '₹' +
        formatter.format(min)
      );

    }


    if (hasMax) {

      return (
        '₹' +
        formatter.format(max)
      );

    }


    return 'Not specified';

  }



  /*
   * =======================================================
   * DATE
   * =======================================================
   */

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

        timeZone:
          'Asia/Kolkata'

      }
    ).format(date);

  }



  /*
   * =======================================================
   * BADGE
   * =======================================================
   */

  function addBadge(
    text,
    modifier = ''
  ) {

    const value =
      String(
        text ?? ''
      ).trim();


    if (!value) {

      return;

    }


    const badge =
      document.createElement(
        'span'
      );


    badge.className =
      'job-badge' +
      (
        modifier
          ? ' ' + modifier
          : ''
      );


    badge.textContent =
      value;


    elements.badges
      .appendChild(
        badge
      );

  }



  /*
   * =======================================================
   * RESPONSIBILITIES
   * =======================================================
   */

  function renderResponsibilities(
    value
  ) {

    const text =
      String(
        value ?? ''
      ).trim();


    elements.responsibilities
      .replaceChildren();


    if (!text) {

      elements.responsibilitiesSection.hidden =
        true;

      return;

    }


    elements.responsibilitiesSection.hidden =
      false;


    /*
     * Database currently commonly uses
     * semicolon-separated responsibilities.
     *
     * Also supports line breaks.
     */

    const items =
      text
        .split(
          /;|\r?\n/
        )
        .map(item =>
          item
            .replace(
              /^[•\-–—]\s*/,
              ''
            )
            .trim()
        )
        .filter(Boolean);


    if (
      items.length <= 1
    ) {

      const paragraph =
        document.createElement(
          'p'
        );


      paragraph.textContent =
        text;


      elements.responsibilities
        .appendChild(
          paragraph
        );


      return;

    }


    const list =
      document.createElement(
        'ul'
      );


    items.forEach(item => {

      const li =
        document.createElement(
          'li'
        );


      li.textContent =
        item;


      list.appendChild(li);

    });


    elements.responsibilities
      .appendChild(list);

  }



  /*
   * =======================================================
   * SKILLS
   * =======================================================
   */

  function renderSkills(job) {

    elements.skills
      .replaceChildren();


    const combined = [

      job.Required_Skills,

      job.Skills

    ]
      .map(value =>
        String(
          value ?? ''
        ).trim()
      )
      .filter(Boolean)
      .join(',');


    if (!combined) {

      elements.skillsSection.hidden =
        true;

      return;

    }


    const skills =
      combined
        .split(
          /,|;|\r?\n/
        )
        .map(skill =>
          skill.trim()
        )
        .filter(Boolean);


    /*
     * Remove duplicate skills.
     */

    const uniqueSkills = [];


    const seen =
      new Set();


    skills.forEach(skill => {

      const key =
        skill.toLowerCase();


      if (
        seen.has(key)
      ) {

        return;

      }


      seen.add(key);

      uniqueSkills.push(skill);

    });


    if (
      uniqueSkills.length === 0
    ) {

      elements.skillsSection.hidden =
        true;

      return;

    }


    elements.skillsSection.hidden =
      false;


    uniqueSkills.forEach(skill => {

      const chip =
        document.createElement(
          'span'
        );


      chip.className =
        'skill-chip';


      chip.textContent =
        skill;


      elements.skills
        .appendChild(chip);

    });

  }



  /*
   * =======================================================
   * DESCRIPTION
   * =======================================================
   */

  function renderDescription(
    value
  ) {

    const description =
      String(
        value ?? ''
      ).trim();


    if (!description) {

      elements.descriptionSection.hidden =
        true;

      return;

    }


    elements.descriptionSection.hidden =
      false;


    elements.description.textContent =
      description;

  }



  /*
   * =======================================================
   * RENDER JOB
   * =======================================================
   */

  function renderJob(job) {

    /*
     * Badges
     */

    elements.badges
      .replaceChildren();


    addBadge(
      job.Job_Type
    );


    addBadge(
      job.Work_Mode,
      'job-badge--mode'
    );



    /*
     * Main information
     */

    const title =
      clean(
        job.Job_Title,
        'Job Opportunity'
      );


    const company =
      clean(
        job.Company_Name,
        'Employer'
      );


    const location =
      formatLocation(job);


    const salary =
      formatSalary(
        job.Salary_Min,
        job.Salary_Max
      );


    elements.title.textContent =
      title;


    elements.company.textContent =
      company;



    /*
     * Description
     */

    renderDescription(
      job.Job_Description
    );



    /*
     * Responsibilities
     */

    renderResponsibilities(
      job.Job_Responsibilities
    );



    /*
     * Skills
     */

    renderSkills(job);



    /*
     * Eligibility
     */

    elements.qualification.textContent =
      clean(
        job.Qualification
      );


    elements.experience.textContent =
      clean(
        job.Experience
      );


    elements.vacancies.textContent =
      clean(
        job.Vacancies
      );


    elements.category.textContent =
      clean(
        job.Job_Category
      );



    /*
     * Overview
     */

    elements.location.textContent =
      location;


    elements.salary.textContent =
      salary;


    elements.type.textContent =
      clean(
        job.Job_Type
      );


    elements.workMode.textContent =
      clean(
        job.Work_Mode
      );


    elements.posted.textContent =
      formatDate(
        job.Posted_Date
      );


    elements.deadline.textContent =
      formatDate(
        job.Application_Last_Date
      );



    /*
     * Mobile summary
     */

    elements.mobileLocation.textContent =
      location;


    elements.mobileSalary.textContent =
      salary;



    /*
     * Employer
     */

    elements.sidebarCompany.textContent =
      company;


    elements.sidebarAddress.textContent =
      clean(
        job.Address
      );



    /*
     * Candidate apply URL
     *
     * We preserve the Job ID so later
     * candidate login can redirect back
     * to the correct opportunity.
     */

    const jobId =
      String(
        job.Job_ID || ''
      ).trim();


    elements.applyButton.href =
      'candidate/login.html?job=' +
      encodeURIComponent(jobId);



    /*
     * Browser title
     */

    document.title =
      title +
      ' | Udayan Care Placement Portal';


    showContent();

  }



  /*
   * =======================================================
   * LOAD JOB
   * =======================================================
   */

  async function loadJob() {

    showLoading();


    const jobId =
      getJobId();


    /*
     * Missing URL ID
     */

    if (!jobId) {

      showError(
        'No Job ID was provided. Please return to the jobs page and select an opportunity.'
      );

      return;

    }



    /*
     * API unavailable
     */

    if (
      !window.UCPP_API ||
      typeof window.UCPP_API.getJob !==
        'function'
    ) {

      showError(
        'Job service is currently unavailable.'
      );

      return;

    }



    try {

      const response =
        await window.UCPP_API.getJob(
          jobId
        );


      if (
        !response.data
      ) {

        throw new Error(
          'Job details are unavailable.'
        );

      }


      renderJob(
        response.data
      );

    }

    catch (error) {

      console.error(
        'Job details error:',
        error
      );


      showError(
        error?.message ||
        'Unable to load this job.'
      );

    }

  }



  /*
   * =======================================================
   * START
   * =======================================================
   */

  loadJob();


})();
