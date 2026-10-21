
'use strict';
/* UCPP V2 - Candidate My Applications */
(function(){
const $=id=>document.getElementById(id);
const state={page:1,limit:10,search:'',status:'',requestId:0,loading:false};
let searchTimer=null;
function escapeHTML(value){
return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function formatDate(value){
if(!value)return 'Date unavailable';
const date=new Date(value);
return Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function cleanStatus(value){
const status=String(value||'Applied').trim();
return ['applied','viewed','shortlisted','interview','rejected'].includes(status.toLowerCase())?status.toLowerCase():'other';
}
function show(id,visible){
const el=$(id);
if(el)el.hidden=!visible;
}
function setText(id,value){
const el=$(id);
if(el)el.textContent=String(value??'');
}
function showLoading(){
show('applicationsSkeleton',true);
show('applicationsList',false);
show('applicationsEmpty',false);
show('applicationsError',false);
show('applicationsPagination',false);
setText('applicationsResultText','Loading your applications...');
}
function showError(message){
show('applicationsSkeleton',false);
show('applicationsList',false);
show('applicationsEmpty',false);
show('applicationsPagination',false);
show('applicationsError',true);
setText('applicationsErrorMessage',message||'Please try again.');
setText('applicationsResultText','Unable to load applications');
}
function showEmpty(filtered){
show('applicationsSkeleton',false);
show('applicationsList',false);
show('applicationsError',false);
show('applicationsPagination',false);
show('applicationsEmpty',true);
setText('applicationsEmptyTitle',filtered?'No matching applications':'No applications yet');
setText('applicationsEmptyMessage',filtered?'No applications match your current search or status filter. Try changing your filters.':"You haven't applied for any jobs yet. Explore available opportunities to get started.");
show('applicationsEmptyAction',!filtered);
}
function renderApplications(applications){
const container=$('applicationsList');
if(!container)return;
container.innerHTML=applications.map(application=>{
const title=escapeHTML(application.jobTitle||'Job Opportunity');
const company=escapeHTML(application.companyName||'Company');
const status=String(application.applicationStatus||'Applied').trim();
const jobId=String(application.jobId||'').trim();
const applicationId=String(application.applicationId||'').trim();
return `<article class="application-card">
<div class="application-card-main">
<h3>${title}</h3>
<p class="application-card-company">${company}</p>
<div class="application-card-meta">
<span>Applied ${escapeHTML(formatDate(application.appliedDate))}</span>
${jobId?`<a href="job-details.html?id=${encodeURIComponent(jobId)}">View Job →</a>`:''}
</div>
</div>
<div class="application-card-side">
<span class="application-status ${cleanStatus(status)}">${escapeHTML(status)}</span>
${applicationId?`<span class="application-card-id">${escapeHTML(applicationId)}</span>`:''}
</div>
</article>`;
}).join('');
show('applicationsSkeleton',false);
show('applicationsEmpty',false);
show('applicationsError',false);
show('applicationsList',true);
}
function renderPagination(pagination){
const page=Number(pagination.page)||1;
const pages=Number(pagination.totalPages)||0;
setText('applicationsPageInfo',`Page ${page} of ${Math.max(pages,1)}`);
const previous=$('applicationsPrevious');
const next=$('applicationsNext');
if(previous)previous.disabled=!pagination.hasPrevious;
if(next)next.disabled=!pagination.hasNext;
show('applicationsPagination',pages>1);
}
function isInvalidSession(result){
return ['INVALID_SESSION','SESSION_EXPIRED','UNAUTHORIZED'].includes(String(result?.code||'').toUpperCase());
}
function redirectToLogin(){
window.location.replace('login.html');
}
function handleInvalidSession(){
try{
const result=window.UCPP_SESSION_MANAGER?.logout();
if(result&&typeof result.catch==='function')result.catch(()=>{});
}finally{
redirectToLogin();
}
}
async function loadApplications(){
const requestId=++state.requestId;
state.loading=true;
showLoading();
if(!window.UCPP_API||!window.UCPP_SESSION_MANAGER){
showError('Application services could not be loaded.');
state.loading=false;
return;
}
const session=window.UCPP_SESSION_MANAGER.getSession();
if(!session||session.role!=='candidate'||!session.sessionToken){
redirectToLogin();
return;
}
try{
const result=await window.UCPP_API.getCandidateMyApplications(session.sessionToken,{
page:state.page,limit:state.limit,search:state.search,status:state.status
});
if(requestId!==state.requestId)return;
if(!result||result.success!==true){
if(isInvalidSession(result)){
handleInvalidSession();
return;
}
showError(result?.message||'Unable to load applications.');
return;
}
const data=result.data||{};
const applications=Array.isArray(data.applications)?data.applications:[];
const pagination=data.pagination||{};
const total=Number(pagination.total)||0;
setText('totalApplications',total);
if(!applications.length&&total>0&&state.page>1){
state.page=1;
loadApplications();
return;
}
const start=total?(state.page-1)*state.limit+1:0;
const end=Math.min(state.page*state.limit,total);
setText('applicationsResultText',total?`Showing ${start}–${end} of ${total} applications`:'No applications found');
if(!applications.length){
showEmpty(Boolean(state.search||state.status));
return;
}
renderApplications(applications);
renderPagination(pagination);
}catch(error){
if(requestId!==state.requestId)return;
console.error('My Applications load failed:',error);
showError(error.message||'Unable to load applications. Please try again.');
}finally{
if(requestId===state.requestId)state.loading=false;
}
}
function applyFilters(){
state.search=String($('applicationSearch')?.value||'').trim();
state.status=String($('applicationStatus')?.value||'').trim();
state.page=1;
loadApplications();
}
function bindEvents(){
$('applicationSearch')?.addEventListener('input',()=>{
clearTimeout(searchTimer);
searchTimer=setTimeout(applyFilters,350);
});
$('applicationStatus')?.addEventListener('change',()=>{
clearTimeout(searchTimer);
applyFilters();
});
$('clearApplicationFilters')?.addEventListener('click',()=>{
clearTimeout(searchTimer);
if($('applicationSearch'))$('applicationSearch').value='';
if($('applicationStatus'))$('applicationStatus').value='';
applyFilters();
});
$('applicationsPrevious')?.addEventListener('click',()=>{
if(state.loading||state.page<=1)return;
state.page--;
loadApplications();
});
$('applicationsNext')?.addEventListener('click',()=>{
if(state.loading||$('applicationsNext').disabled)return;
state.page++;
loadApplications();
});
$('applicationsRetry')?.addEventListener('click',loadApplications);
}
function init(){
const params=new URLSearchParams(window.location.search);
const status=String(params.get('status')||'').trim().toLowerCase();
const validStatuses=['applied','viewed','shortlisted','interview','rejected'];
if(validStatuses.includes(status)){
state.status=status;
if($('applicationStatus'))$('applicationStatus').value=status.charAt(0).toUpperCase()+status.slice(1);
}
bindEvents();
loadApplications();
}
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',init,{once:true});
}else{
init();
}
})();
