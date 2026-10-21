document.addEventListener("DOMContentLoaded",()=>{
"use strict";

const API=window.UCPP_API;
const SESSION=window.UCPP_SESSION_MANAGER;
const els={};
let jobId="";
let loading=false;
let applying=false;
let applicationSubmitted=false;

function cacheElements(){
[
"jobDetailsSkeleton","jobDetailsContent","jobNotFound","jobNotFoundMessage",
"jobLoadError","jobLoadErrorMessage","retryJobButton","jobCompany","jobTitle",
"jobStatus","jobMeta","jobPostedDate","jobDeadline","jobDescription",
"responsibilitiesSection","jobResponsibilities","skillsSection","jobSkills",
"jobType","jobWorkMode","jobExperience","jobQualification","jobVacancies",
"jobCategory","jobSalary","jobLocation","jobLastDate","applyJobButton",
"applyHelp","sidebarCompany","jobAddress"
].forEach(id=>els[id]=document.getElementById(id));
}

function safe(value){
return String(value??"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");
}

function value(obj,...keys){
for(const key of keys){
if(obj&&obj[key]!==undefined&&obj[key]!==null&&String(obj[key]).trim()!==""){
return String(obj[key]).trim();
}
}
return "";
}

function parseDate(input){
if(!input)return null;
const date=new Date(input);
return Number.isNaN(date.getTime())?null:date;
}

function formatDate(input){
const date=parseDate(input);
if(!date)return "";
return date.toLocaleDateString("en-IN",{
day:"2-digit",
month:"short",
year:"numeric"
});
}

function formatSalary(min,max){
const minValue=String(min??"").trim();
const maxValue=String(max??"").trim();
if(!minValue&&!maxValue)return "Not specified";

const format=v=>{
if(!v)return "";
const numeric=Number(String(v).replace(/[₹,\s]/g,""));
if(Number.isFinite(numeric)){
return "₹"+numeric.toLocaleString("en-IN");
}
return v.startsWith("₹")?v:"₹"+v;
};

if(minValue&&maxValue)return `${format(minValue)} - ${format(maxValue)}`;
if(minValue)return `From ${format(minValue)}`;
return `Up to ${format(maxValue)}`;
}

function buildLocation(job){
const parts=[
value(job,"City"),
value(job,"District"),
value(job,"State")
].filter(Boolean);

return [...new Set(parts)].join(", ")||"Not specified";
}

function buildAddress(job){
const address=value(job,"Address");
const location=buildLocation(job);

if(address&&location!=="Not specified"){
return `${address}, ${location}`;
}

return address||location||"Location details not available.";
}

function splitSkills(input){
if(!input)return[];

return String(input)
.split(/[,;|]/)
.map(item=>item.trim())
.filter(Boolean)
.filter((item,index,array)=>array.indexOf(item)===index);
}

function showSkeleton(){
els.jobDetailsSkeleton.hidden=false;
els.jobDetailsContent.hidden=true;
els.jobNotFound.hidden=true;
els.jobLoadError.hidden=true;
}

function showContent(){
els.jobDetailsSkeleton.hidden=true;
els.jobDetailsContent.hidden=false;
els.jobNotFound.hidden=true;
els.jobLoadError.hidden=true;
}

function showNotFound(message){
els.jobDetailsSkeleton.hidden=true;
els.jobDetailsContent.hidden=true;
els.jobLoadError.hidden=true;
els.jobNotFound.hidden=false;

if(message){
els.jobNotFoundMessage.textContent=message;
}
}

function showError(message){
els.jobDetailsSkeleton.hidden=true;
els.jobDetailsContent.hidden=true;
els.jobNotFound.hidden=true;
els.jobLoadError.hidden=false;

els.jobLoadErrorMessage.textContent=
message||
"Something went wrong while loading this opportunity.";
}

function renderMeta(job){
const items=[];
const location=buildLocation(job);
const jobType=value(job,"Job_Type");
const workMode=value(job,"Work_Mode");
const experience=value(job,"Experience");

if(location!=="Not specified")items.push(location);
if(jobType)items.push(jobType);
if(workMode)items.push(workMode);
if(experience)items.push(experience);

els.jobMeta.innerHTML=
items.map(item=>
`<span class="job-meta-item">${safe(item)}</span>`
).join("");
}

function renderSkills(job){
const skills=[
...splitSkills(value(job,"Skills")),
...splitSkills(value(job,"Required_Skills"))
].filter((item,index,array)=>array.indexOf(item)===index);

if(!skills.length){
els.skillsSection.hidden=true;
els.jobSkills.innerHTML="";
return;
}

els.skillsSection.hidden=false;

els.jobSkills.innerHTML=
skills.map(skill=>
`<span class="skill-tag">${safe(skill)}</span>`
).join("");
}

function renderResponsibilities(job){
const responsibilities=value(job,"Job_Responsibilities");

if(!responsibilities){
els.responsibilitiesSection.hidden=true;
els.jobResponsibilities.textContent="";
return;
}

els.responsibilitiesSection.hidden=false;
els.jobResponsibilities.textContent=responsibilities;
}

function setApplyAvailable(){
if(applicationSubmitted)return;

els.applyJobButton.disabled=false;
els.applyJobButton.textContent="Apply Now";
els.applyHelp.textContent=
"Apply directly through Udayan Care Placement Portal.";
}

function setApplying(){
els.applyJobButton.disabled=true;
els.applyJobButton.textContent="Applying...";
els.applyHelp.textContent=
"Please wait while we submit your application.";
}

function setApplied(applicationId){
applicationSubmitted=true;

els.applyJobButton.disabled=true;
els.applyJobButton.textContent="✓ Applied";

els.applyHelp.textContent=
applicationId
?`Application submitted successfully. Application ID: ${applicationId}`
:"Application submitted successfully.";
}

function setAlreadyApplied(applicationId){
applicationSubmitted=true;

els.applyJobButton.disabled=true;
els.applyJobButton.textContent="✓ Already Applied";

els.applyHelp.textContent=
applicationId
?`You have already applied for this job. Application ID: ${applicationId}`
:"You have already applied for this job.";
}

function setApplicationsClosed(message){
els.applyJobButton.disabled=true;
els.applyJobButton.textContent="Applications Closed";
els.applyHelp.textContent=
message||
"Applications are closed for this opportunity.";
}

function renderDeadline(job){
const raw=value(job,"Application_Last_Date");
const formatted=formatDate(raw);

els.jobLastDate.textContent=
formatted||"Not specified";

els.jobDeadline.textContent=
formatted
?`Apply by ${formatted}`
:"";

if(!raw){
setApplyAvailable();
return;
}

const deadline=parseDate(raw);

if(!deadline){
setApplyAvailable();
return;
}

deadline.setHours(23,59,59,999);

if(deadline.getTime()<Date.now()){
setApplicationsClosed(
"The application deadline for this opportunity has passed."
);
return;
}

setApplyAvailable();
}

function renderJob(job){
const company=value(job,"Company_Name")||"Company";
const title=value(job,"Job_Title")||"Job Opportunity";
const description=
value(job,"Job_Description")||
"Job description is not available.";
const posted=value(job,"Posted_Date");
const status=value(job,"Job_Status")||"Active";

document.title=
`${title} | Udayan Care Placement Portal`;

els.jobCompany.textContent=company;
els.sidebarCompany.textContent=company;
els.jobTitle.textContent=title;
els.jobStatus.textContent=status;
els.jobDescription.textContent=description;

els.jobType.textContent=
value(job,"Job_Type")||"Not specified";

els.jobWorkMode.textContent=
value(job,"Work_Mode")||"Not specified";

els.jobExperience.textContent=
value(job,"Experience")||"Not specified";

els.jobQualification.textContent=
value(job,"Qualification")||"Not specified";

els.jobVacancies.textContent=
value(job,"Vacancies")||"Not specified";

els.jobCategory.textContent=
value(job,"Job_Category")||"Not specified";

els.jobSalary.textContent=
formatSalary(
value(job,"Salary_Min"),
value(job,"Salary_Max")
);

els.jobLocation.textContent=
buildLocation(job);

els.jobAddress.textContent=
buildAddress(job);

els.jobPostedDate.textContent=
posted
?`Posted ${formatDate(posted)}`
:"";

renderMeta(job);
renderResponsibilities(job);
renderSkills(job);
renderDeadline(job);
showContent();
}

function getCandidateSession(){
if(!SESSION||typeof SESSION.getSession!=="function"){
return null;
}

const session=SESSION.getSession();

if(
!session||
session.isAuthenticated!==true||
session.role!=="candidate"||
!String(session.sessionToken||"").trim()
){
return null;
}

return session;
}

function redirectToLogin(){
const returnURL=
window.location.pathname+
window.location.search;

window.location.href=
"login.html?return="+
encodeURIComponent(returnURL);
}

async function loadJob(){
if(loading)return;

if(!jobId){
showNotFound(
"The job link is invalid. Please return to Available Jobs and select an opportunity."
);
return;
}

if(!API||typeof API.getJob!=="function"){
showError(
"Job service is unavailable. Please refresh the page and try again."
);
return;
}

loading=true;
showSkeleton();

try{
const response=
await API.getJob(jobId);

if(!response||response.success!==true){
showNotFound(
response?.message||
"This job may have been closed, expired or is no longer available."
);
return;
}

const job=response.data;

if(!job||typeof job!=="object"){
showNotFound(
"This job is no longer available."
);
return;
}

renderJob(job);

}catch(error){
console.error(
"Job details load failed:",
error
);

showError(
String(error?.message||"")
.toLowerCase()
.includes("timed out")
?"The request took too long. Please try again."
:"Unable to load this job right now. Please try again."
);

}finally{
loading=false;
}
}

async function handleApply(){
if(
applying||
applicationSubmitted||
els.applyJobButton.disabled
){
return;
}

if(!API||typeof API.applyCandidateJob!=="function"){
els.applyHelp.textContent=
"Application service is unavailable. Please refresh the page and try again.";
return;
}

const session=getCandidateSession();

if(!session){
els.applyHelp.textContent=
"Please login to apply for this opportunity.";

setTimeout(
redirectToLogin,
700
);

return;
}

applying=true;
setApplying();

try{
const response=
await API.applyCandidateJob(
session.sessionToken,
jobId
);

if(response&&response.success===true){
const applicationId=
String(
response.data?.applicationId||
response.data?.Application_ID||
""
).trim();

setApplied(applicationId);
return;
}

const code=
String(response?.code||"")
.trim()
.toUpperCase();

if(code==="ALREADY_APPLIED"){
const applicationId=
String(
response?.data?.applicationId||
response?.data?.Application_ID||
""
).trim();

setAlreadyApplied(applicationId);
return;
}

if(
code==="INVALID_SESSION"||
code==="SESSION_EXPIRED"
){
els.applyJobButton.disabled=false;
els.applyJobButton.textContent="Login to Apply";
els.applyHelp.textContent=
"Your session has expired. Please login again.";

setTimeout(
redirectToLogin,
900
);

return;
}

if(
code==="JOB_CLOSED"||
code==="JOB_NOT_AVAILABLE"||
code==="JOB_NOT_FOUND"||
code==="APPLICATION_DEADLINE_PASSED"||
code==="DEADLINE_PASSED"
){
setApplicationsClosed(
response?.message||
"This opportunity is no longer accepting applications."
);
return;
}

els.applyJobButton.disabled=false;
els.applyJobButton.textContent="Apply Now";

els.applyHelp.textContent=
response?.message||
"Unable to submit your application. Please try again.";

}catch(error){
console.error(
"Candidate application failed:",
error
);

els.applyJobButton.disabled=false;
els.applyJobButton.textContent="Apply Now";

if(
String(error?.message||"")
.toLowerCase()
.includes("timed out")
){
els.applyHelp.textContent=
"The request took longer than expected. Please check My Applications before trying again.";
}else{
els.applyHelp.textContent=
"Unable to submit your application right now. Please try again.";
}

}finally{
applying=false;
}
}

function init(){
cacheElements();

const params=
new URLSearchParams(
window.location.search
);

jobId=
(params.get("id")||"")
.trim();

els.retryJobButton
?.addEventListener(
"click",
loadJob
);

els.applyJobButton
?.addEventListener(
"click",
handleApply
);

loadJob();
}

init();
});
