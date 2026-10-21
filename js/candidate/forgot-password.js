'use strict';

/*
 * =========================================================
 * UCPP V2
 * Candidate Forgot Password
 * =========================================================
 *
 * Flow:
 *
 * Email
 *   ↓
 * Request OTP
 *   ↓
 * Verify OTP
 *   ↓
 * Temporary reset token (memory only)
 *   ↓
 * New Password
 *   ↓
 * Success
 *
 * IMPORTANT:
 * - OTP is never logged.
 * - Reset token is never logged.
 * - Reset token is never stored in browser storage.
 * =========================================================
 */

(function () {

  'use strict';


  /*
   * =======================================================
   * DEPENDENCY CHECK
   * =======================================================
   */

  if (!window.UCPP_API) {

    console.error(
      'UCPP_API is not available.'
    );

    return;

  }


  /*
   * =======================================================
   * STATE
   * =======================================================
   */

  const state = {

    email: '',

    resetToken: '',

    currentStep: 'email',

    resendAvailableAt: 0,

    resendTimer: null,

    busy: false

  };


  /*
   * =======================================================
   * ELEMENTS
   * =======================================================
   */

  const elements = {

    /*
     * Steps
     */

    emailStep:
      document.getElementById(
        'emailStep'
      ),

    otpStep:
      document.getElementById(
        'otpStep'
      ),

    passwordStep:
      document.getElementById(
        'passwordStep'
      ),

    successStep:
      document.getElementById(
        'successStep'
      ),


    /*
     * Progress
     */

    progressEmail:
      document.getElementById(
        'progressEmail'
      ),

    progressOtp:
      document.getElementById(
        'progressOtp'
      ),

    progressPassword:
      document.getElementById(
        'progressPassword'
      ),


    /*
     * Message
     */

    message:
      document.getElementById(
        'forgotMessage'
      ),


    /*
     * Email
     */

    emailForm:
      document.getElementById(
        'emailForm'
      ),

    emailInput:
      document.getElementById(
        'resetEmail'
      ),

    emailError:
      document.getElementById(
        'emailError'
      ),

    sendOtpButton:
      document.getElementById(
        'sendOtpButton'
      ),


    /*
     * OTP
     */

    otpForm:
      document.getElementById(
        'otpForm'
      ),

    otpInput:
      document.getElementById(
        'resetOtp'
      ),

    otpError:
      document.getElementById(
        'otpError'
      ),

    otpEmailDisplay:
      document.getElementById(
        'otpEmailDisplay'
      ),

    verifyOtpButton:
      document.getElementById(
        'verifyOtpButton'
      ),

    changeEmailButton:
      document.getElementById(
        'changeEmailButton'
      ),

    resendOtpButton:
      document.getElementById(
        'resendOtpButton'
      ),

    otpExpiryText:
      document.getElementById(
        'otpExpiryText'
      ),


    /*
     * Password
     */

    passwordForm:
      document.getElementById(
        'passwordForm'
      ),

    newPassword:
      document.getElementById(
        'newPassword'
      ),

    confirmPassword:
      document.getElementById(
        'confirmPassword'
      ),

    newPasswordError:
      document.getElementById(
        'newPasswordError'
      ),

    confirmPasswordError:
      document.getElementById(
        'confirmPasswordError'
      ),

    resetPasswordButton:
      document.getElementById(
        'resetPasswordButton'
      ),

    toggleNewPassword:
      document.getElementById(
        'toggleNewPassword'
      ),

    toggleConfirmPassword:
      document.getElementById(
        'toggleConfirmPassword'
      ),


    /*
     * Password Rules
     */

    ruleLength:
      document.getElementById(
        'ruleLength'
      ),

    ruleLetter:
      document.getElementById(
        'ruleLetter'
      ),

    ruleNumber:
      document.getElementById(
        'ruleNumber'
      )

  };


  /*
   * =======================================================
   * BASIC HELPERS
   * =======================================================
   */

  function normalizeEmail(
    value
  ) {

    return String(
      value || ''
    )
      .trim()
      .toLowerCase();

  }


  function isValidEmail(
    value
  ) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(
        normalizeEmail(
          value
        )
      );

  }


  function isValidOtp(
    value
  ) {

    return /^\d{6}$/.test(
      String(
        value || ''
      ).trim()
    );

  }


  function getPasswordRules(
    password
  ) {

    const value =
      String(
        password || ''
      );


    return {

      length:
        value.length >= 8,

      letter:
        /[A-Za-z]/.test(
          value
        ),

      number:
        /[0-9]/.test(
          value
        )

    };

  }


  function isValidPassword(
    password
  ) {

    const rules =
      getPasswordRules(
        password
      );


    return (
      rules.length &&
      rules.letter &&
      rules.number
    );

  }


  /*
   * =======================================================
   * FIELD ERRORS
   * =======================================================
   */

  function setFieldError(
    input,
    errorElement,
    message
  ) {

    if (input) {

      input.classList.toggle(
        'is-error',
        Boolean(message)
      );

    }


    if (errorElement) {

      errorElement.textContent =
        message || '';

    }

  }


  function clearErrors() {

    setFieldError(
      elements.emailInput,
      elements.emailError,
      ''
    );


    setFieldError(
      elements.otpInput,
      elements.otpError,
      ''
    );


    setFieldError(
      elements.newPassword,
      elements.newPasswordError,
      ''
    );


    setFieldError(
      elements.confirmPassword,
      elements.confirmPasswordError,
      ''
    );

  }


  /*
   * =======================================================
   * GLOBAL MESSAGE
   * =======================================================
   */

  function hideMessage() {

    if (!elements.message) {

      return;

    }


    elements.message.hidden =
      true;


    elements.message.textContent =
      '';


    elements.message.classList.remove(
      'is-success',
      'is-error',
      'is-info'
    );

  }


  function showMessage(
    message,
    type = 'info'
  ) {

    if (!elements.message) {

      return;

    }


    elements.message.textContent =
      String(
        message || ''
      );


    elements.message.classList.remove(
      'is-success',
      'is-error',
      'is-info'
    );


    elements.message.classList.add(
      'is-' + type
    );


    elements.message.hidden =
      false;

  }


  /*
   * =======================================================
   * BUTTON LOADING
   * =======================================================
   */

  function setButtonLoading(
    button,
    loading
  ) {

    if (!button) {

      return;

    }


    button.disabled =
      Boolean(loading);


    const text =
      button.querySelector(
        '.button-text'
      );


    const loader =
      button.querySelector(
        '.button-loader'
      );


    if (text) {

      text.style.opacity =
        loading
          ? '0.78'
          : '1';

    }


    if (loader) {

      loader.hidden =
        !loading;

    }

  }


  /*
   * =======================================================
   * PROGRESS
   * =======================================================
   */

  function resetProgressClasses() {

    [
      elements.progressEmail,
      elements.progressOtp,
      elements.progressPassword
    ]
      .forEach(
        function (element) {

          if (!element) {

            return;

          }


          element.classList.remove(
            'is-active',
            'is-complete'
          );

        }
      );


    document
      .querySelectorAll(
        '.forgot-progress-line'
      )
      .forEach(
        function (line) {

          line.classList.remove(
            'is-complete'
          );

        }
      );

  }


  function updateProgress(
    step
  ) {

    resetProgressClasses();


    const lines =
      document.querySelectorAll(
        '.forgot-progress-line'
      );


    if (
      step === 'email'
    ) {

      elements.progressEmail
        ?.classList.add(
          'is-active'
        );

      return;

    }


    if (
      step === 'otp'
    ) {

      elements.progressEmail
        ?.classList.add(
          'is-complete'
        );


      elements.progressOtp
        ?.classList.add(
          'is-active'
        );


      if (lines[0]) {

        lines[0]
          .classList.add(
            'is-complete'
          );

      }


      return;

    }


    if (
      step === 'password'
    ) {

      elements.progressEmail
        ?.classList.add(
          'is-complete'
        );


      elements.progressOtp
        ?.classList.add(
          'is-complete'
        );


      elements.progressPassword
        ?.classList.add(
          'is-active'
        );


      lines.forEach(
        function (line) {

          line.classList.add(
            'is-complete'
          );

        }
      );


      return;

    }


    if (
      step === 'success'
    ) {

      elements.progressEmail
        ?.classList.add(
          'is-complete'
        );


      elements.progressOtp
        ?.classList.add(
          'is-complete'
        );


      elements.progressPassword
        ?.classList.add(
          'is-complete'
        );


      lines.forEach(
        function (line) {

          line.classList.add(
            'is-complete'
          );

        }
      );

    }

  }


  /*
   * =======================================================
   * CHANGE STEP
   * =======================================================
   */

  function showStep(
    step
  ) {

    state.currentStep =
      step;


    elements.emailStep.hidden =
      step !== 'email';


    elements.otpStep.hidden =
      step !== 'otp';


    elements.passwordStep.hidden =
      step !== 'password';


    elements.successStep.hidden =
      step !== 'success';


    updateProgress(
      step
    );


    hideMessage();


    window.scrollTo({

      top: 0,

      behavior: 'smooth'

    });


    if (
      step === 'email'
    ) {

      setTimeout(
        function () {

          elements.emailInput
            ?.focus();

        },
        100
      );

    }


    if (
      step === 'otp'
    ) {

      setTimeout(
        function () {

          elements.otpInput
            ?.focus();

        },
        100
      );

    }


    if (
      step === 'password'
    ) {

      setTimeout(
        function () {

          elements.newPassword
            ?.focus();

        },
        100
      );

    }

  }


  /*
   * =======================================================
   * RESEND TIMER
   * =======================================================
   */

  function stopResendTimer() {

    if (
      state.resendTimer
    ) {

      clearInterval(
        state.resendTimer
      );


      state.resendTimer =
        null;

    }

  }


  function startResendTimer() {

    stopResendTimer();


    state.resendAvailableAt =
      Date.now() +
      60000;


    if (
      elements.resendOtpButton
    ) {

      elements.resendOtpButton.disabled =
        true;

    }


    function update() {

      const remaining =
        Math.max(
          0,
          Math.ceil(
            (
              state.resendAvailableAt -
              Date.now()
            ) / 1000
          )
        );


      if (
        remaining <= 0
      ) {

        stopResendTimer();


        if (
          elements.resendOtpButton
        ) {

          elements.resendOtpButton.disabled =
            false;


          elements.resendOtpButton
            .textContent =
            'Resend code';

        }


        return;

      }


      if (
        elements.resendOtpButton
      ) {

        elements.resendOtpButton
          .textContent =
          'Resend in ' +
          remaining +
          's';

      }

    }


    update();


    state.resendTimer =
      setInterval(
        update,
        1000
      );

  }


  /*
   * =======================================================
   * PASSWORD RULE DISPLAY
   * =======================================================
   */

  function updatePasswordRules() {

    const rules =
      getPasswordRules(
        elements.newPassword?.value
      );


    elements.ruleLength
      ?.classList.toggle(
        'is-valid',
        rules.length
      );


    elements.ruleLetter
      ?.classList.toggle(
        'is-valid',
        rules.letter
      );


    elements.ruleNumber
      ?.classList.toggle(
        'is-valid',
        rules.number
      );

  }


  /*
   * =======================================================
   * PASSWORD VISIBILITY
   * =======================================================
   */

  function togglePasswordVisibility(
    input,
    button
  ) {

    if (
      !input ||
      !button
    ) {

      return;

    }


    const showing =
      input.type === 'text';


    input.type =
      showing
        ? 'password'
        : 'text';


    button.textContent =
      showing
        ? 'Show'
        : 'Hide';


    button.setAttribute(
      'aria-label',
      showing
        ? 'Show password'
        : 'Hide password'
    );

  }


  /*
   * =======================================================
   * STEP 1
   * REQUEST OTP
   * =======================================================
   */

  async function handleEmailSubmit(
    event
  ) {

    event.preventDefault();


    if (state.busy) {

      return;

    }


    clearErrors();

    hideMessage();


    const email =
      normalizeEmail(
        elements.emailInput.value
      );


    if (!email) {

      setFieldError(
        elements.emailInput,
        elements.emailError,
        'Please enter your registered email address.'
      );


      elements.emailInput.focus();

      return;

    }


    if (
      !isValidEmail(
        email
      )
    ) {

      setFieldError(
        elements.emailInput,
        elements.emailError,
        'Please enter a valid email address.'
      );


      elements.emailInput.focus();

      return;

    }


    state.busy =
      true;


    setButtonLoading(
      elements.sendOtpButton,
      true
    );


    try {

      const result =
        await window.UCPP_API
          .requestCandidatePasswordReset(
            email
          );


      if (
        result.success !== true
      ) {

        showMessage(
          result.message ||
          'Unable to send verification code. Please try again.',
          'error'
        );

        return;

      }


      state.email =
        email;


      state.resetToken =
        '';


      if (
        elements.otpEmailDisplay
      ) {

        elements.otpEmailDisplay
          .textContent =
          email;

      }


      elements.otpInput.value =
        '';


      showStep(
        'otp'
      );


      showMessage(
        result.message ||
        'If an account exists for this email, a verification code has been sent.',
        'info'
      );


      startResendTimer();

    }

    catch (error) {

      showMessage(
        error.message ||
        'Unable to connect to the server. Please try again.',
        'error'
      );

    }

    finally {

      state.busy =
        false;


      setButtonLoading(
        elements.sendOtpButton,
        false
      );

    }

  }


  /*
   * =======================================================
   * STEP 2
   * VERIFY OTP
   * =======================================================
   */

  async function handleOtpSubmit(
    event
  ) {

    event.preventDefault();


    if (state.busy) {

      return;

    }


    clearErrors();

    hideMessage();


    const otp =
      String(
        elements.otpInput.value || ''
      )
        .replace(
          /\D/g,
          ''
        )
        .slice(
          0,
          6
        );


    elements.otpInput.value =
      otp;


    if (
      !isValidOtp(
        otp
      )
    ) {

      setFieldError(
        elements.otpInput,
        elements.otpError,
        'Enter the 6-digit verification code.'
      );


      elements.otpInput.focus();

      return;

    }


    if (!state.email) {

      showStep(
        'email'
      );


      showMessage(
        'Please enter your email address again.',
        'error'
      );

      return;

    }


    state.busy =
      true;


    setButtonLoading(
      elements.verifyOtpButton,
      true
    );


    try {

      const result =
        await window.UCPP_API
          .verifyCandidatePasswordResetOtp(
            state.email,
            otp
          );


      /*
       * Clear OTP from the UI as soon
       * as server processing completes.
       */

      elements.otpInput.value =
        '';


      if (
        result.success !== true
      ) {

        setFieldError(
          elements.otpInput,
          elements.otpError,
          result.message ||
          'Invalid or expired verification code.'
        );


        elements.otpInput.focus();

        return;

      }


      const resetToken =
        String(
          result.data?.resetToken ||
          ''
        ).trim();


      if (!resetToken) {

        throw new Error(
          'Unable to start password reset session.'
        );

      }


      /*
       * MEMORY ONLY.
       *
       * Do not store in:
       * localStorage
       * sessionStorage
       * URL
       * console
       */

      state.resetToken =
        resetToken;


      stopResendTimer();


      elements.newPassword.value =
        '';


      elements.confirmPassword.value =
        '';


      updatePasswordRules();


      showStep(
        'password'
      );


      showMessage(
        'Email verified successfully. Create your new password.',
        'success'
      );

    }

    catch (error) {

      showMessage(
        error.message ||
        'Unable to verify the code. Please try again.',
        'error'
      );

    }

    finally {

      state.busy =
        false;


      setButtonLoading(
        elements.verifyOtpButton,
        false
      );

    }

  }


  /*
   * =======================================================
   * CHANGE EMAIL
   * =======================================================
   */

  function handleChangeEmail() {

    if (state.busy) {

      return;

    }


    stopResendTimer();


    state.email =
      '';


    state.resetToken =
      '';


    elements.otpInput.value =
      '';


    clearErrors();


    showStep(
      'email'
    );

  }


  /*
   * =======================================================
   * RESEND OTP
   * =======================================================
   */

  async function handleResendOtp() {

    if (
      state.busy ||
      !state.email ||
      Date.now() <
        state.resendAvailableAt
    ) {

      return;

    }


    hideMessage();

    clearErrors();


    state.busy =
      true;


    elements.resendOtpButton.disabled =
      true;


    elements.resendOtpButton
      .textContent =
      'Sending...';


    try {

      const result =
        await window.UCPP_API
          .requestCandidatePasswordReset(
            state.email
          );


      if (
        result.success !== true
      ) {

        showMessage(
          result.message ||
          'Unable to resend verification code.',
          'error'
        );


        elements.resendOtpButton.disabled =
          false;


        elements.resendOtpButton
          .textContent =
          'Resend code';


        return;

      }


      elements.otpInput.value =
        '';


      showMessage(
        'A new verification code has been requested.',
        'info'
      );


      startResendTimer();

    }

    catch (error) {

      showMessage(
        error.message ||
        'Unable to resend verification code.',
        'error'
      );


      elements.resendOtpButton.disabled =
        false;


      elements.resendOtpButton
        .textContent =
        'Resend code';

    }

    finally {

      state.busy =
        false;

    }

  }


  /*
   * =======================================================
   * STEP 3
   * RESET PASSWORD
   * =======================================================
   */

  async function handlePasswordSubmit(
    event
  ) {

    event.preventDefault();


    if (state.busy) {

      return;

    }


    clearErrors();

    hideMessage();


    const password =
      String(
        elements.newPassword.value ||
        ''
      );


    const confirmPassword =
      String(
        elements.confirmPassword.value ||
        ''
      );


    if (
      !isValidPassword(
        password
      )
    ) {

      setFieldError(
        elements.newPassword,
        elements.newPasswordError,
        'Password must be at least 8 characters and contain a letter and number.'
      );


      elements.newPassword.focus();

      return;

    }


    if (!confirmPassword) {

      setFieldError(
        elements.confirmPassword,
        elements.confirmPasswordError,
        'Please confirm your new password.'
      );


      elements.confirmPassword.focus();

      return;

    }


    if (
      password !==
      confirmPassword
    ) {

      setFieldError(
        elements.confirmPassword,
        elements.confirmPasswordError,
        'Passwords do not match.'
      );


      elements.confirmPassword.focus();

      return;

    }


    if (!state.resetToken) {

      showMessage(
        'Your password reset session has expired. Please request a new verification code.',
        'error'
      );

      return;

    }


    state.busy =
      true;


    setButtonLoading(
      elements.resetPasswordButton,
      true
    );


    try {

      const result =
        await window.UCPP_API
          .resetCandidatePassword(
            state.resetToken,
            password
          );


      if (
        result.success !== true
      ) {

        /*
         * Reset token expired/invalid.
         * User needs a fresh OTP.
         */

        if (
          result.code ===
            'INVALID_RESET_TOKEN'
        ) {

          /*
           * Destroy local reset token.
           */

          state.resetToken =
            '';


          showStep(
            'otp'
          );


          showMessage(
            'Your verification session has expired. Please request a new code.',
            'error'
          );


          if (
            elements.resendOtpButton
          ) {

            elements.resendOtpButton.disabled =
              false;


            elements.resendOtpButton
              .textContent =
              'Resend code';

          }


          return;

        }


        showMessage(
          result.message ||
          'Unable to reset password. Please try again.',
          'error'
        );

        return;

      }


      /*
       * Password has been successfully
       * written server-side.
       *
       * Remove sensitive values from memory/UI.
       */

      state.resetToken =
        '';


      elements.newPassword.value =
        '';


      elements.confirmPassword.value =
        '';


      state.email =
        '';


      showStep(
        'success'
      );

    }

    catch (error) {

      showMessage(
        error.message ||
        'Unable to reset password. Please try again.',
        'error'
      );

    }

    finally {

      state.busy =
        false;


      setButtonLoading(
        elements.resetPasswordButton,
        false
      );

    }

  }


  /*
   * =======================================================
   * OTP INPUT SANITIZATION
   * =======================================================
   */

  function handleOtpInput() {

    elements.otpInput.value =
      String(
        elements.otpInput.value ||
        ''
      )
        .replace(
          /\D/g,
          ''
        )
        .slice(
          0,
          6
        );


    setFieldError(
      elements.otpInput,
      elements.otpError,
      ''
    );

  }


  /*
   * =======================================================
   * EVENTS
   * =======================================================
   */

  function bindEvents() {

    elements.emailForm
      ?.addEventListener(
        'submit',
        handleEmailSubmit
      );


    elements.otpForm
      ?.addEventListener(
        'submit',
        handleOtpSubmit
      );


    elements.passwordForm
      ?.addEventListener(
        'submit',
        handlePasswordSubmit
      );


    elements.otpInput
      ?.addEventListener(
        'input',
        handleOtpInput
      );


    elements.emailInput
      ?.addEventListener(
        'input',
        function () {

          setFieldError(
            elements.emailInput,
            elements.emailError,
            ''
          );

        }
      );


    elements.newPassword
      ?.addEventListener(
        'input',
        function () {

          setFieldError(
            elements.newPassword,
            elements.newPasswordError,
            ''
          );


          updatePasswordRules();

        }
      );


    elements.confirmPassword
      ?.addEventListener(
        'input',
        function () {

          setFieldError(
            elements.confirmPassword,
            elements.confirmPasswordError,
            ''
          );

        }
      );


    elements.changeEmailButton
      ?.addEventListener(
        'click',
        handleChangeEmail
      );


    elements.resendOtpButton
      ?.addEventListener(
        'click',
        handleResendOtp
      );


    elements.toggleNewPassword
      ?.addEventListener(
        'click',
        function () {

          togglePasswordVisibility(
            elements.newPassword,
            elements.toggleNewPassword
          );

        }
      );


    elements.toggleConfirmPassword
      ?.addEventListener(
        'click',
        function () {

          togglePasswordVisibility(
            elements.confirmPassword,
            elements.toggleConfirmPassword
          );

        }
      );


    /*
     * Clear sensitive in-memory
     * state when leaving page.
     */

    window.addEventListener(
      'pagehide',
      function () {

        state.resetToken =
          '';

        stopResendTimer();

      }
    );

  }


  /*
   * =======================================================
   * INITIALIZE
   * =======================================================
   */

  function init() {

    if (
      !elements.emailStep ||
      !elements.otpStep ||
      !elements.passwordStep ||
      !elements.successStep
    ) {

      console.error(
        'Forgot Password page elements are missing.'
      );

      return;

    }


    clearErrors();

    hideMessage();

    updatePasswordRules();

    bindEvents();

    showStep(
      'email'
    );

  }


  /*
   * =======================================================
   * START
   * =======================================================
   */

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  }

  else {

    init();

  }

})();
