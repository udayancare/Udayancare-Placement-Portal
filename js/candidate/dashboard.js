'use strict';

/*
 * UCPP V2 - Candidate Dashboard
 * Fast protected dashboard
 * ONE backend request per page load
 */
(function(){
  'use strict';

  const $=id=>document.getElementById(id);

  function text(id,value,fallback='—'){
    const el=$(id);
    if(!el)return;
    el.textContent=
      value!==undefined&&
      value!==null&&
      String(value).trim()!==''
        ?String(value)
        :fallback;
  }

  function escapeHTML(value){
    return String(value??'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function formatDate(value){
    if(!value)return 'Date unavailable';

    const date=new Date(value);

    if(Number.isNaN(date.getTime())){
      return String(value);
    }

    return date.toLocaleDateString('en-IN',{
      day:'2-digit',
      month:'short',
      year:'numeric'
    });
  }

  function initials(name){
    const parts=String(name||'Candidate')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if(!parts.length)return 'C';

    return parts
      .slice(0,2)
      .map(part=>part.charAt(0).toUpperCase())
      .join('');
  }

  function cleanStatus(status){
    return String(status||'Applied')
      .trim()
      .toLowerCase()
      .replace(/\s+/g,'-');
  }

  function showLoading(){
    hideError();

    const applicationsSkeleton=$('applicationsSkeleton');
    const jobsSkeleton=$('jobsSkeleton');
    const recentApplications=$('recentApplications');
    const latestJobs=$('latestJobs');
    const applicationsEmpty=$('applicationsEmpty');
    const jobsEmpty=$('jobsEmpty');

    if(applicationsSkeleton){
      applicationsSkeleton.hidden=false;
    }

    if(jobsSkeleton){
      jobsSkeleton.hidden=false;
    }

    if(recentApplications){
      recentApplications.hidden=true;
    }

    if(latestJobs){
      latestJobs.hidden=true;
    }

    if(applicationsEmpty){
      applicationsEmpty.hidden=true;
    }

    if(jobsEmpty){
      jobsEmpty.hidden=true;
    }
  }

  function hideSkeletons(){
    const applicationsSkeleton=$('applicationsSkeleton');
    const jobsSkeleton=$('jobsSkeleton');

    if(applicationsSkeleton){
      applicationsSkeleton.hidden=true;
    }

    if(jobsSkeleton){
      jobsSkeleton.hidden=true;
    }
  }

  function showError(message){
    hideSkeletons();

    const error=$('dashboardError');
    const errorMessage=$('dashboardErrorMessage');

    if(errorMessage){
      errorMessage.textContent=
        message||
        'Please check your connection and try again.';
    }

    if(error){
      error.hidden=false;
    }
  }

  function hideError(){
    const error=$('dashboardError');

    if(error){
      error.hidden=true;
    }
  }

  function renderProfile(candidate,profileCompletion){
    const name=
      candidate.fullName||
      'Candidate';

    text(
      'candidateName',
      name,
      'Candidate'
    );

    text(
      'candidateProfileName',
      name,
      'Candidate'
    );

    text(
      'candidateInitials',
      initials(name),
      'C'
    );

    text(
      'candidateId',
      candidate.candidateId
    );

    text(
      'candidateCity',
      candidate.city
    );

    text(
      'candidateQualification',
      candidate.qualification,
      'Qualification not added'
    );

    text(
      'candidateEmployment',
      candidate.employmentStatus
    );

    text(
      'candidatePreferredLocation',
      candidate.preferredLocation
    );

    /*
     * V2 does not use candidate profile photos.
     * Initials avatar only.
     */
    const photo=$('candidatePhoto');
    const initialsEl=$('candidateInitials');

    if(photo){
      photo.hidden=true;
      photo.removeAttribute('src');
    }

    if(initialsEl){
      initialsEl.hidden=false;
    }

    const percentage=Math.max(
      0,
      Math.min(
        100,
        Number(
          profileCompletion?.percentage
        )||0
      )
    );

    const roundedPercentage=
      Math.round(percentage);

    text(
      'profilePercentage',
      roundedPercentage+'%',
      '0%'
    );

    text(
      'profileCircleText',
      roundedPercentage+'%',
      '0%'
    );

    const progressBar=
      $('profileProgressBar');

    if(progressBar){
      progressBar.style.width=
        roundedPercentage+'%';
    }

    const circle=
      $('profileCircle');

    if(circle){
      circle.style.setProperty(
        '--progress',
        (roundedPercentage*3.6)+'deg'
      );
    }

    const message=
      $('profileProgressMessage');

    if(message){
      if(roundedPercentage>=100){
        message.textContent=
          'Your profile is complete.';
      }else if(roundedPercentage>=75){
        message.textContent=
          'Almost there. Complete the remaining details.';
      }else if(roundedPercentage>=50){
        message.textContent=
          'Good progress. Add more details to strengthen your profile.';
      }else{
        message.textContent=
          'Complete your profile to improve visibility.';
      }
    }
  }

  function renderStats(stats){
    text(
      'availableJobsCount',
      Number(stats.availableJobs)||0,
      '0'
    );

    text(
      'applicationsCount',
      Number(stats.totalApplications)||0,
      '0'
    );

    text(
      'shortlistedCount',
      Number(stats.shortlisted)||0,
      '0'
    );

    text(
      'interviewsCount',
      Number(stats.interviews)||0,
      '0'
    );
  }

  function renderApplicationSummary(summary){
    text(
      'statusApplied',
      Number(summary.applied)||0,
      '0'
    );

    text(
      'statusViewed',
      Number(summary.viewed)||0,
      '0'
    );

    text(
      'statusShortlisted',
      Number(summary.shortlisted)||0,
      '0'
    );

    text(
      'statusInterview',
      Number(summary.interview)||0,
      '0'
    );

    text(
      'statusRejected',
      Number(summary.rejected)||0,
      '0'
    );
  }

  function renderApplications(applications){
    const container=
      $('recentApplications');

    const empty=
      $('applicationsEmpty');

    const skeleton=
      $('applicationsSkeleton');

    if(skeleton){
      skeleton.hidden=true;
    }

    if(!container)return;

    container.innerHTML='';

    if(
      !Array.isArray(applications)||
      applications.length===0
    ){
      container.hidden=true;

      if(empty){
        empty.hidden=false;
      }

      return;
    }

    if(empty){
      empty.hidden=true;
    }

    container.innerHTML=
      applications.map(application=>{
        const status=
          cleanStatus(
            application.status
          );

        const jobId=
          encodeURIComponent(
            String(
              application.jobId||''
            ).trim()
          );

        const title=
          escapeHTML(
            application.jobTitle||
            'Job Opportunity'
          );

        const company=
          escapeHTML(
            application.companyName||
            'Company'
          );

        return `
          <article class="application-item">
            <div>
              <h3 class="application-title">${title}</h3>
              <p class="application-company">${company}</p>

              <div class="application-meta">
                <span>
                  Applied ${escapeHTML(formatDate(application.appliedDate))}
                </span>

                ${
                  application.jobId
                    ?`<a href="job-details.html?id=${jobId}">View Job</a>`
                    :''
                }
              </div>
            </div>

            <span class="application-status ${escapeHTML(status)}">
              ${escapeHTML(application.status||'Applied')}
            </span>
          </article>
        `;
      }).join('');

    container.hidden=false;
  }

  function salaryText(job){
    const min=job.salaryMin;
    const max=job.salaryMax;

    const hasMin=
      min!==undefined&&
      min!==null&&
      String(min).trim()!=='';

    const hasMax=
      max!==undefined&&
      max!==null&&
      String(max).trim()!=='';

    if(!hasMin&&!hasMax){
      return '';
    }

    if(hasMin&&hasMax){
      return(
        '₹'+String(min)+
        ' - ₹'+String(max)
      );
    }

    if(hasMin){
      return 'From ₹'+String(min);
    }

    return 'Up to ₹'+String(max);
  }

  function locationText(job){
    return[
      job.city,
      job.state
    ]
      .map(value=>
        String(value||'').trim()
      )
      .filter(Boolean)
      .join(', ');
  }

  function renderJobs(jobs){
    const container=
      $('latestJobs');

    const empty=
      $('jobsEmpty');

    const skeleton=
      $('jobsSkeleton');

    if(skeleton){
      skeleton.hidden=true;
    }

    if(!container)return;

    container.innerHTML='';

    if(
      !Array.isArray(jobs)||
      jobs.length===0
    ){
      container.hidden=true;

      if(empty){
        empty.hidden=false;
      }

      return;
    }

    if(empty){
      empty.hidden=true;
    }

    container.innerHTML=
      jobs.map(job=>{
        const jobId=
          encodeURIComponent(
            String(
              job.jobId||''
            ).trim()
          );

        const location=
          locationText(job);

        const salary=
          salaryText(job);

        const meta=[
          job.jobType,
          job.workMode,
          location,
          salary
        ]
          .map(value=>
            String(value||'').trim()
          )
          .filter(Boolean);

        return `
          <article class="dashboard-job">

            <div class="dashboard-job-company">
              ${escapeHTML(job.companyName||'Company')}
            </div>

            <h3>
              ${escapeHTML(job.jobTitle||'Job Opportunity')}
            </h3>

            <div class="dashboard-job-meta">
              ${
                meta.map(item=>
                  `<span>${escapeHTML(item)}</span>`
                ).join('')
              }
            </div>

            <div class="dashboard-job-footer">

              <small>
                ${
                  job.postedDate
                    ?'Posted '+escapeHTML(formatDate(job.postedDate))
                    :'Latest opportunity'
                }
              </small>

              ${
                job.jobId
                  ?`<a class="dashboard-job-link" href="job-details.html?id=${jobId}">View Job →</a>`
                  :''
              }

            </div>

          </article>
        `;
      }).join('');

    container.hidden=false;
  }

  function renderDashboard(data){
    if(
      !data||
      typeof data!=='object'
    ){
      throw new Error(
        'Dashboard data is unavailable.'
      );
    }

    renderProfile(
      data.candidate||{},
      data.profileCompletion||{}
    );

    renderStats(
      data.stats||{}
    );

    renderApplicationSummary(
      data.applicationSummary||{}
    );

    renderApplications(
      data.recentApplications||[]
    );

    renderJobs(
      data.latestJobs||[]
    );
  }

  function redirectToLogin(){
    window.location.replace(
      'login.html'
    );
  }

  function isInvalidSession(result){
    const code=
      String(
        result?.code||''
      ).toUpperCase();

    return(
      code==='INVALID_SESSION'||
      code==='SESSION_EXPIRED'||
      code==='UNAUTHORIZED'
    );
  }

  function handleInvalidSession(){
    /*
     * Dashboard API itself validates the
     * server-side session.
     *
     * No separate validation request needed.
     */
    try{
      const result=
        window.UCPP_SESSION_MANAGER
          ?.logout();

      if(
        result&&
        typeof result.catch==='function'
      ){
        result.catch(
          ()=>redirectToLogin()
        );
      }else{
        redirectToLogin();
      }
    }catch(error){
      redirectToLogin();
    }
  }

  async function loadDashboard(){
    hideError();

    if(
      !window.UCPP_SESSION_MANAGER||
      !window.UCPP_API
    ){
      showError(
        'Dashboard services could not be loaded.'
      );
      return;
    }

    /*
     * Local check only.
     * This does NOT make a backend request.
     */
    const session=
      window.UCPP_SESSION_MANAGER
        .getSession();

    if(
      !session||
      session.role!=='candidate'||
      !session.sessionToken
    ){
      redirectToLogin();
      return;
    }

    try{
      /*
       * ONLY backend request required
       * to load dashboard.
       *
       * Backend getCandidateDashboard
       * validates the session itself.
       */
      const result=
        await window.UCPP_API
          .getCandidateDashboard(
            session.sessionToken
          );

      if(
        !result||
        result.success!==true
      ){
        if(
          isInvalidSession(result)
        ){
          handleInvalidSession();
          return;
        }

        showError(
          result?.message||
          'Unable to load dashboard.'
        );

        return;
      }

      renderDashboard(
        result.data
      );

      hideSkeletons();

    }catch(error){
      console.error(
        'Dashboard load failed:',
        error
      );

      showError(
        error.message||
        'Unable to load dashboard. Please try again.'
      );
    }
  }

  function bindEvents(){
    const retry=
      $('dashboardRetry');

    if(retry){
      retry.addEventListener(
        'click',
        ()=>{
          showLoading();
          loadDashboard();
        }
      );
    }
  }

  function init(){
    bindEvents();
    showLoading();
    loadDashboard();
  }

  if(
    document.readyState===
    'loading'
  ){
    document.addEventListener(
      'DOMContentLoaded',
      init,
      {once:true}
    );
  }else{
    init();
  }

})();
