'use strict';

/*
 * UCPP V2
 * Global Frontend Configuration
 */

window.UCPP_CONFIG = Object.freeze({

  APP_NAME: 'Udayan Care Placement Portal',

  APP_SHORT_NAME: 'UCPP',

  VERSION: '2.0.0',

  ENVIRONMENT: 'production',

  API_URL:
    'https://script.google.com/macros/s/AKfycbzP1iAr9ZGpbkTefWnmy6s8cQ81at4bCSMnhDdp23Gjlo9cLbQwrtFTH4ierh6S6GAb/exec',

  API_TIMEOUT: 30000,

  PAGINATION: Object.freeze({
    JOBS_PER_PAGE: 10,
    APPLICATIONS_PER_PAGE: 10,
    ADMIN_RECORDS_PER_PAGE: 20
  }),

  CACHE: Object.freeze({
    ENABLED: true,
    JOBS_TTL: 120000
  })

});
