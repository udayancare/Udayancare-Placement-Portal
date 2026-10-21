
'use strict';
/* UCPP V2 - Core API Client */
(function(){
if(!window.UCPP_CONFIG){
console.error('UCPP_CONFIG is not available.');
return;
}
const CONFIG=window.UCPP_CONFIG;
const activeRequests=new Map();

function buildURL(action,params={}){
const url=new URL(CONFIG.API_URL);
url.searchParams.set('action',action);
Object.entries(params).forEach(([key,value])=>{
if(value===undefined||value===null||value==='')return;
url.searchParams.set(key,String(value));
});
return url.toString();
}

async function get(action,params={}){
const requestURL=buildURL(action,params);
if(activeRequests.has(requestURL))return activeRequests.get(requestURL);
const request=performGetRequest(requestURL);
activeRequests.set(requestURL,request);
try{return await request;}
finally{activeRequests.delete(requestURL);}
}

async function performGetRequest(requestURL){
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),CONFIG.API_TIMEOUT||30000);
try{
const response=await fetch(requestURL,{
method:'GET',cache:'no-store',redirect:'follow',signal:controller.signal
});
if(!response.ok)throw new Error('Server returned HTTP '+response.status);
const result=await response.json();
if(!result||result.success!==true)throw new Error(result?.message||'API request failed.');
return result;
}catch(error){
if(error.name==='AbortError')throw new Error('Request timed out. Please try again.');
throw error;
}finally{clearTimeout(timeout);}
}

async function post(action,data={}){
const cleanAction=String(action||'').trim();
if(!cleanAction)throw new Error('API action is required.');
return performPostRequest({action:cleanAction,...data});
}

async function performPostRequest(payload){
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),CONFIG.API_TIMEOUT||30000);
try{
const response=await fetch(CONFIG.API_URL,{
method:'POST',
headers:{'Content-Type':'text/plain;charset=utf-8'},
body:JSON.stringify(payload),
cache:'no-store',redirect:'follow',signal:controller.signal
});
if(!response.ok)throw new Error('Server returned HTTP '+response.status);
const result=await response.json();
if(!result||typeof result.success!=='boolean')throw new Error('Invalid response from server.');
return result;
}catch(error){
if(error.name==='AbortError')throw new Error('Request timed out. Please try again.');
throw error;
}finally{clearTimeout(timeout);}
}

function cleanSessionToken(sessionToken){
return String(sessionToken||'').trim();
}

function invalidSessionResponse(){
return Promise.resolve({
success:false,code:'INVALID_SESSION',
message:'Session is not available.',data:null
});
}

/* HEALTH */
function health(){return get('health');}

/* PUBLIC JOBS */
function getJobs(options={}){
return get('getPublicJobs',{
page:options.page||1,
limit:options.limit||CONFIG.PAGINATION.JOBS_PER_PAGE,
search:options.search||'',
city:options.city||'',
category:options.category||'',
jobType:options.jobType||'',
workMode:options.workMode||''
});
}

function getJob(jobId){
const id=String(jobId||'').trim();
if(!id)return Promise.reject(new Error('Job ID is required.'));
return get('getPublicJob',{id:id});
}

/* CANDIDATE REGISTRATION — NEW */
function registerCandidate(data={}){
if(!data||typeof data!=='object'||Array.isArray(data)){
return Promise.resolve({
success:false,
code:'INVALID_REGISTRATION_DATA',
message:'Invalid registration details.',
data:null
});
}
return post('registerCandidate',data);
}

/* CANDIDATE LOGIN */
function candidateLogin(email,password){
const cleanEmail=String(email||'').trim().toLowerCase();
const cleanPassword=String(password||'');
if(!cleanEmail||!cleanPassword){
return Promise.resolve({
success:false,code:'INVALID_LOGIN',
message:'Email and password are required.',data:null
});
}
return post('candidateLogin',{email:cleanEmail,password:cleanPassword});
}

/* CANDIDATE SESSION */
function validateCandidateSession(sessionToken){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
return post('validateCandidateSession',{sessionToken:token});
}

function logoutCandidate(sessionToken){
const token=cleanSessionToken(sessionToken);
if(!token){
return Promise.resolve({
success:true,code:'LOGOUT_SUCCESS',
message:'Logged out successfully.',data:null
});
}
return post('logoutCandidate',{sessionToken:token});
}

/* CANDIDATE DASHBOARD */
function getCandidateDashboard(sessionToken){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
return post('getCandidateDashboard',{sessionToken:token});
}

/* CANDIDATE PROFILE */
function getCandidateProfile(sessionToken){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
return post('getCandidateProfile',{sessionToken:token});
}

function updateCandidateProfile(sessionToken,profile={}){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
if(!profile||typeof profile!=='object'||Array.isArray(profile)){
return Promise.resolve({
success:false,code:'INVALID_PROFILE_DATA',
message:'Invalid profile data.',data:null
});
}
return post('updateCandidateProfile',{sessionToken:token,profile:profile});
}

/* CANDIDATE EDUCATION */
function saveCandidateEducation(sessionToken,education={}){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
if(!education||typeof education!=='object'||Array.isArray(education)){
return Promise.resolve({
success:false,
code:'INVALID_EDUCATION',
message:'Invalid education data.',
data:null
});
}
return post('saveCandidateEducation',{
sessionToken:token,
education:education
});
}

function deleteCandidateEducation(sessionToken,educationId){
const token=cleanSessionToken(sessionToken);
const id=String(educationId||'').trim();
if(!token)return invalidSessionResponse();
if(!id){
return Promise.resolve({
success:false,
code:'INVALID_EDUCATION_ID',
message:'Education record is required.',
data:null
});
}
return post('deleteCandidateEducation',{
sessionToken:token,
educationId:id
});
}

/* CANDIDATE EXPERIENCE */
function saveCandidateExperience(sessionToken,experience={}){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
if(!experience||typeof experience!=='object'||Array.isArray(experience)){
return Promise.resolve({
success:false,code:'INVALID_EXPERIENCE',message:'Invalid experience data.',data:null
});
}
return post('saveCandidateExperience',{sessionToken:token,experience:experience});
}

function deleteCandidateExperience(sessionToken,experienceId){
const token=cleanSessionToken(sessionToken);
const id=String(experienceId||'').trim();
if(!token)return invalidSessionResponse();
if(!id){
return Promise.resolve({
success:false,code:'INVALID_EXPERIENCE_ID',message:'Experience record is required.',data:null
});
}
return post('deleteCandidateExperience',{sessionToken:token,experienceId:id});
}

/* CANDIDATE CERTIFICATIONS */
function saveCandidateCertification(sessionToken,certification={}){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
if(!certification||typeof certification!=='object'||Array.isArray(certification)){
return Promise.resolve({
success:false,code:'INVALID_CERTIFICATION',message:'Invalid certification data.',data:null
});
}
return post('saveCandidateCertification',{sessionToken:token,certification:certification});
}

function deleteCandidateCertification(sessionToken,certificationId){
const token=cleanSessionToken(sessionToken);
const id=String(certificationId||'').trim();
if(!token)return invalidSessionResponse();
if(!id){
return Promise.resolve({
success:false,code:'INVALID_CERTIFICATION_ID',message:'Certification record is required.',data:null
});
}
return post('deleteCandidateCertification',{sessionToken:token,certificationId:id});
}

/* CANDIDATE SOCIAL LINKS */
function saveCandidateSocialLinks(sessionToken,socialLinks={}){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
if(!socialLinks||typeof socialLinks!=='object'||Array.isArray(socialLinks)){
return Promise.resolve({
success:false,code:'INVALID_SOCIAL_LINKS',message:'Invalid social links.',data:null
});
}
return post('saveCandidateSocialLinks',{sessionToken:token,socialLinks:socialLinks});
}

/* CANDIDATE APPLY JOB */
function applyCandidateJob(sessionToken,jobId){
const token=cleanSessionToken(sessionToken);
const id=String(jobId||'').trim();
if(!token)return invalidSessionResponse();
if(!id){
return Promise.resolve({
success:false,code:'INVALID_JOB',message:'Please select a valid job.',data:null
});
}
return post('candidateApplyJob',{sessionToken:token,jobId:id});
}

/* CANDIDATE MY APPLICATIONS - READ ONLY */
function getCandidateMyApplications(sessionToken,options={}){
const token=cleanSessionToken(sessionToken);
if(!token)return invalidSessionResponse();
const page=Number(options.page);
const limit=Number(options.limit);
return post('candidateMyApplications',{
sessionToken:token,
page:Number.isFinite(page)&&page>=1?Math.floor(page):1,
limit:Number.isFinite(limit)&&limit>=1?Math.min(Math.floor(limit),50):10,
search:String(options.search||'').trim().slice(0,100),
status:String(options.status||'').trim().slice(0,50)
});
}

/* CANDIDATE PASSWORD RESET */
function requestCandidatePasswordReset(email){
const cleanEmail=String(email||'').trim().toLowerCase();
if(!cleanEmail){
return Promise.resolve({
success:false,code:'EMAIL_REQUIRED',
message:'Email address is required.',data:null
});
}
return post('requestCandidatePasswordReset',{email:cleanEmail});
}

function verifyCandidatePasswordResetOtp(email,otp){
const cleanEmail=String(email||'').trim().toLowerCase();
const cleanOtp=String(otp||'').trim();
if(!cleanEmail||!cleanOtp){
return Promise.resolve({
success:false,code:'INVALID_REQUEST',
message:'Email and verification code are required.',data:null
});
}
return post('verifyCandidatePasswordResetOtp',{
email:cleanEmail,otp:cleanOtp
});
}

function resetCandidatePassword(resetToken,newPassword){
const cleanToken=String(resetToken||'').trim();
const password=String(newPassword||'');
if(!cleanToken||!password){
return Promise.resolve({
success:false,code:'INVALID_REQUEST',
message:'Invalid password reset request.',data:null
});
}
return post('resetCandidatePassword',{
resetToken:cleanToken,newPassword:password
});
}

/* PUBLIC API */
window.UCPP_API=Object.freeze({
get,
post,
health,
getJobs,
getJob,
registerCandidate,
candidateLogin,
validateCandidateSession,
logoutCandidate,
getCandidateDashboard,
getCandidateProfile,
updateCandidateProfile,
saveCandidateEducation,
deleteCandidateEducation,
saveCandidateExperience,
deleteCandidateExperience,
saveCandidateCertification,
deleteCandidateCertification,
saveCandidateSocialLinks,
applyCandidateJob,
getCandidateMyApplications,
requestCandidatePasswordReset,
verifyCandidatePasswordResetOtp,
resetCandidatePassword
});
})();
