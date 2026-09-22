// =================================
// UCPP CONFIGURATION
// Version : 1.0.0
// =================================

const CONFIG = {

    APP_NAME: "UCPP",

    APP_VERSION: "1.0.0",

    API_URL: "https://script.google.com/macros/s/AKfycbzZok-P42uLsnpwr2ENRACeUVL7_xRZWu-meomwR64zyYuytLHunLsDaLSx2CVvd5dI/exec",


    // =================================
    // STORAGE KEYS
    // =================================

    STORAGE: {

        CANDIDATE: "ucpp_candidate",

        EMPLOYER: "ucpp_employer",

        ADMIN: "ucpp_admin",

        JOB: "ucpp_job"

    },


    // =================================
    // GOOGLE SHEET NAMES
    // =================================

    SHEETS: {

        ADMINS: "ADMINS"

    },


    // =================================
    // CONTACT DETAILS
    // =================================

    CONTACT: {

        PHONE: "+91-11-27821333",

        EMAIL: "placement@udayancare.org",

        ADDRESS: "A-43, Chittaranjan Park, New Delhi - 110019"

    },


    // =================================
    // SOCIAL LINKS
    // =================================

    SOCIAL: {

        FACEBOOK: "https://www.facebook.com/UdayanCare/",

        LINKEDIN: "https://in.linkedin.com/company/udayan-care-ngo",

        INSTAGRAM: "https://www.instagram.com/udayancare/",

        WHATSAPP: "https://wa.me/918126757595"

    },


    // =================================
    // LOGO
    // =================================

    LOGO: {

        MAIN: "images/logo.png",

        FAVICON: "assets/icons/favicon.ico"

    },


    // =================================
    // SITE INFORMATION
    // =================================

    SITE: {

        NAME: "Udayan Care Placement Portal",

        SHORT_NAME: "UCPP",

        TAGLINE: "Making Young Lives Shine Through Employment",

        DESCRIPTION: "Udayan Care Placement Portal connects Shalini Fellows with verified employers and supports career growth."

    }

};


// =================================
// FREEZE CONFIGURATION
// =================================

Object.freeze(CONFIG);
