'use strict';

/*
 * UCPP V2 - Candidate Login
 * Real V2 authentication + session
 */
(function(){
  const form=document.getElementById('candidateLoginForm');
  if(!form)return;

  const email=document.getElementById('loginEmail');
  const password=document.getElementById('loginPassword');
  const emailError=document.getElementById('loginEmailError');
  const passwordError=document.getElementById('loginPasswordError');
  const status=document.getElementById('loginStatus');
  const passwordToggle=document.getElementById('passwordToggle');
  const submitButton=form.querySelector('button[type="submit"]');
  let submitting=false;

  function clearStatus(){
    status.hidden=true;
    status.textContent='';
    status.className='login-status';
  }

  function showStatus(message,type){
    status.hidden=false;
    status.textContent=message;
    status.className='login-status login-status--'+type;
  }

  function clearError(field,errorElement){
    field.classList.remove('is-invalid');
    errorElement.hidden=true;
    errorElement.textContent='';
  }

  function showError(field,errorElement,message){
    field.classList.add('is-invalid');
    errorElement.textContent=message;
    errorElement.hidden=false;
  }

  function validateEmail(){
    clearError(email,emailError);
    const value=email.value.trim();
    const pattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!pattern.test(value)){
      showError(email,emailError,'Enter a valid registered email address.');
      return false;
    }

    return true;
  }

  function validatePassword(){
    clearError(password,passwordError);

    if(!password.value){
      showError(password,passwordError,'Please enter your password.');
      return false;
    }

    return true;
  }

  function setLoading(loading){
    submitting=loading;

    if(!submitButton)return;

    submitButton.disabled=loading;

    if(loading){
      if(!submitButton.dataset.originalText){
        submitButton.dataset.originalText=submitButton.textContent;
      }
      submitButton.textContent='Signing in...';
    }else{
      submitButton.textContent=submitButton.dataset.originalText||'Login';
    }
  }

  function getRedirectURL(){
    const params=new URLSearchParams(window.location.search);
    const jobId=String(params.get('job')||'').trim();

    if(jobId){
      return 'job-details.html?id='+encodeURIComponent(jobId);
    }

    return 'dashboard.html';
  }

  function getLoginErrorMessage(result){
    const code=String(result?.code||'');

    switch(code){
      case 'INVALID_LOGIN':
      case 'INVALID_CREDENTIALS':
      case 'INVALID_PASSWORD':
      case 'CREDENTIAL_NOT_FOUND':
        return 'Invalid email or password. If you have not set your V2 password yet, use Forgot Password.';
      case 'ACCOUNT_INACTIVE':
      case 'CANDIDATE_INACTIVE':
      case 'CREDENTIAL_INACTIVE':
        return 'Your account is currently inactive. Please contact the Udayan Care team.';
      default:
        return result?.message||'Unable to login. Please try again.';
    }
  }

  if(passwordToggle){
    passwordToggle.addEventListener('click',function(){
      const shouldShow=password.type==='password';
      password.type=shouldShow?'text':'password';
      passwordToggle.textContent=shouldShow?'Hide':'Show';
      passwordToggle.setAttribute(
        'aria-label',
        shouldShow?'Hide password':'Show password'
      );
    });
  }

  email.addEventListener('blur',validateEmail);
  password.addEventListener('blur',validatePassword);

  email.addEventListener('input',function(){
    if(email.classList.contains('is-invalid'))validateEmail();
  });

  password.addEventListener('input',function(){
    if(password.classList.contains('is-invalid'))validatePassword();
  });

  form.addEventListener('submit',async function(event){
    event.preventDefault();

    if(submitting)return;

    clearStatus();

    const emailValid=validateEmail();
    const passwordValid=validatePassword();

    if(!emailValid||!passwordValid){
      showStatus('Please check your login details.','error');
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    if(
      !window.UCPP_API||
      typeof window.UCPP_API.candidateLogin!=='function'||
      !window.UCPP_SESSION_MANAGER
    ){
      showStatus('Login service is temporarily unavailable. Please try again.','error');
      return;
    }

    setLoading(true);

    try{
      const result=await window.UCPP_API.candidateLogin(
        email.value.trim(),
        password.value
      );

      if(!result||result.success!==true){
        showStatus(getLoginErrorMessage(result),'error');
        password.value='';
        password.focus();
        return;
      }

      const data=result.data||{};
      const user=data.user||{};
      const sessionToken=String(data.sessionToken||'').trim();

      if(!sessionToken||!user.candidateId){
        throw new Error('Invalid login response.');
      }

      window.UCPP_SESSION_MANAGER.setSession({
        role:'candidate',
        sessionToken:sessionToken,
        userId:user.candidateId,
        displayName:user.fullName||'Candidate',
        email:user.email||email.value.trim()
      });

      password.value='';
      showStatus('Login successful. Redirecting...','success');

      window.location.replace(getRedirectURL());

    }catch(error){
      showStatus(
        error.message==='Invalid login response.'
          ?'Unable to create your session. Please try again.'
          :'Unable to connect to the login service. Please try again.',
        'error'
      );
    }finally{
      setLoading(false);
    }
  });
})();
