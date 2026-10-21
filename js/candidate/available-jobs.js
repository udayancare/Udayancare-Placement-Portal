'use strict';
(function(){
const API=window.UCPP_API;
const SESSION=window.UCPP_SESSION;
if(!API){console.error('UCPP_API is not available.');return;}

const PAGE_SIZE=8;
const state={
page:1,
search:'',
city:'',
jobType:'',
workMode:'',
sort:'latest',
totalPages:0,
totalRecords:0,
loading:false,
requestId:0,
jobs:[]
};

const el={};
let searchTimer=null;

document.addEventListener('DOMContentLoaded',init);

function init(){
cacheElements();
configureUnsupportedFilters();
bindEvents();
loadJobs();
}

function cacheElements(){
[
'availableJobsCount','jobsAlert','jobSearch','clearSearch','filterToggle',
'activeFilterCount','jobsFilters','closeFilters','locationFilter',
'jobTypeFilter','workModeFilter','qualificationFilter','experienceFilter',
'clearFilters','resultsSummary','sortJobs','jobsSkeleton','jobsGrid',
'jobsEmpty','resetJobsSearch','jobsError','jobsErrorMessage','retryJobs',
'jobsPagination','previousPage','paginationNumbers','nextPage','filterBackdrop'
].forEach(id=>el[id]=document.getElementById(id));
}

function configureUnsupportedFilters(){
['qualificationFilter','experienceFilter'].forEach(id=>{
const field=el[id];
if(!field)return;
const group=field.closest('.filter-group');
if(group)group.hidden=true;
});
}

function bindEvents(){
el.jobSearch?.addEventListener('input',()=>{
const value=el.jobSearch.value.trim();
el.clearSearch.hidden=!value;
clearTimeout(searchTimer);
searchTimer=setTimeout(()=>{
state.search=value;
state.page=1;
loadJobs();
},350);
});

el.clearSearch?.addEventListener('click',()=>{
clearTimeout(searchTimer);
el.jobSearch.value='';
el.clearSearch.hidden=true;
state.search='';
state.page=1;
loadJobs();
el.jobSearch.focus();
});

el.locationFilter?.addEventListener('change',()=>{
state.city=el.locationFilter.value;
state.page=1;
updateFilterCount();
loadJobs();
});

el.jobTypeFilter?.addEventListener('change',()=>{
state.jobType=el.jobTypeFilter.value;
state.page=1;
updateFilterCount();
loadJobs();
});

el.workModeFilter?.addEventListener('change',()=>{
state.workMode=el.workModeFilter.value;
state.page=1;
updateFilterCount();
loadJobs();
});

el.sortJobs?.addEventListener('change',()=>{
state.sort=el.sortJobs.value;
renderJobs(sortJobs(state.jobs));
});

el.clearFilters?.addEventListener('click',resetFilters);
el.resetJobsSearch?.addEventListener('click',resetAll);
el.retryJobs?.addEventListener('click',loadJobs);
el.filterToggle?.addEventListener('click',openFilters);
el.closeFilters?.addEventListener('click',closeFilters);
el.filterBackdrop?.addEventListener('click',closeFilters);

el.previousPage?.addEventListener('click',()=>{
if(state.page<=1||state.loading)return;
state.page--;
loadJobs(true);
});

el.nextPage?.addEventListener('click',()=>{
if(state.page>=state.totalPages||state.loading)return;
state.page++;
loadJobs(true);
});

document.addEventListener('keydown',event=>{
if(event.key==='Escape')closeFilters();
});
}

async function loadJobs(scrollTop=false){
if(state.loading)return;

const requestId=++state.requestId;
state.loading=true;
showLoading();

try{
const result=await API.getJobs({
page:state.page,
limit:PAGE_SIZE,
search:state.search,
city:state.city,
jobType:state.jobType,
workMode:state.workMode
});

if(requestId!==state.requestId)return;

const jobs=Array.isArray(result.data)?result.data:[];
const meta=result.meta||{};

state.jobs=jobs;
state.totalRecords=Number(meta.totalRecords)||0;
state.totalPages=Number(meta.totalPages)||0;

if(state.totalPages>0&&state.page>state.totalPages){
state.page=state.totalPages;
state.loading=false;
return loadJobs(scrollTop);
}

populateFilters(jobs);
updateSummary();
updateCount();
renderJobs(sortJobs(jobs));
renderPagination();

if(scrollTop){
document.querySelector('.jobs-content')?.scrollIntoView({
behavior:'smooth',
block:'start'
});
}

}catch(error){
if(requestId!==state.requestId)return;
showError(error?.message||'Unable to load available jobs.');
}finally{
if(requestId===state.requestId)state.loading=false;
}
}

function showLoading(){
el.jobsSkeleton.hidden=false;
el.jobsGrid.hidden=true;
el.jobsEmpty.hidden=true;
el.jobsError.hidden=true;
el.jobsPagination.hidden=true;
el.resultsSummary.textContent='Loading opportunities...';
}

function showError(message){
el.jobsSkeleton.hidden=true;
el.jobsGrid.hidden=true;
el.jobsEmpty.hidden=true;
el.jobsPagination.hidden=true;
el.jobsError.hidden=false;
el.jobsErrorMessage.textContent=message;
el.resultsSummary.textContent='Unable to load opportunities';
}

function renderJobs(jobs){
el.jobsSkeleton.hidden=true;
el.jobsError.hidden=true;

if(!jobs.length){
el.jobsGrid.hidden=true;
el.jobsEmpty.hidden=false;
return;
}

el.jobsEmpty.hidden=true;
el.jobsGrid.innerHTML=jobs.map(job=>jobCard(job)).join('');
el.jobsGrid.hidden=false;
}

function jobCard(job){
const id=safe(job.Job_ID);
const title=safe(job.Job_Title||'Job Opportunity');
const company=safe(job.Company_Name||'Company');
const location=formatLocation(job);
const jobType=safe(job.Job_Type||'');
const workMode=safe(job.Work_Mode||'');
const experience=safe(job.Experience||'');
const qualification=safe(job.Qualification||'');
const salary=formatSalary(job.Salary_Min,job.Salary_Max);
const description=safe(job.Job_Description||'');
const skills=parseSkills(job.Required_Skills||job.Skills);
const posted=formatPostedDate(job.Posted_Date);
const isNew=isRecent(job.Posted_Date);

const details=[
location,
jobType,
workMode,
experience,
qualification,
salary
].filter(Boolean);

return `
<article class="job-card">
<div class="job-card-top">
<div class="job-company">${company}</div>
${isNew?'<span class="job-new">New</span>':''}
</div>
<h3>${title}</h3>
${details.length?`<div class="job-details">${details.slice(0,5).map(item=>`<span class="job-detail">${item}</span>`).join('')}</div>`:''}
${description?`<p class="job-description">${description}</p>`:''}
${skills.length?`<div class="job-skills">${skills.slice(0,4).map(skill=>`<span class="job-skill">${safe(skill)}</span>`).join('')}</div>`:''}
<div class="job-card-footer">
<span class="job-posted">${posted}</span>
<a class="job-view-button" href="job-details.html?id=${encodeURIComponent(id)}">View Details</a>
</div>
</article>`;
}

function sortJobs(jobs){
const list=[...jobs];

switch(state.sort){
case 'oldest':
return list.sort((a,b)=>dateValue(a.Posted_Date)-dateValue(b.Posted_Date));

case 'salary-high':
return list.sort((a,b)=>salaryValue(b)-salaryValue(a));

case 'salary-low':
return list.sort((a,b)=>salaryValue(a)-salaryValue(b));

default:
return list.sort((a,b)=>dateValue(b.Posted_Date)-dateValue(a.Posted_Date));
}
}

function populateFilters(jobs){
populateSelect(
el.locationFilter,
unique(jobs.map(job=>job.City).filter(Boolean)),
'All Locations',
state.city
);

populateSelect(
el.jobTypeFilter,
unique(jobs.map(job=>job.Job_Type).filter(Boolean)),
'All Job Types',
state.jobType
);

populateSelect(
el.workModeFilter,
unique(jobs.map(job=>job.Work_Mode).filter(Boolean)),
'All Work Modes',
state.workMode
);
}

function populateSelect(select,values,placeholder,current){
if(!select)return;

const existing=new Set(
Array.from(select.options)
.slice(1)
.map(option=>option.value.toLowerCase())
);

values.forEach(value=>{
const clean=String(value||'').trim();
if(!clean||existing.has(clean.toLowerCase()))return;

const option=document.createElement('option');
option.value=clean;
option.textContent=clean;
select.appendChild(option);
existing.add(clean.toLowerCase());
});

select.options[0].textContent=placeholder;
select.value=current||'';
}

function renderPagination(){
const total=state.totalPages;

if(total<=1){
el.jobsPagination.hidden=true;
return;
}

el.jobsPagination.hidden=false;
el.previousPage.disabled=state.page<=1;
el.nextPage.disabled=state.page>=total;

const pages=getVisiblePages(state.page,total);

el.paginationNumbers.innerHTML=pages.map(page=>{
if(page==='...'){
return '<span class="pagination-number" aria-hidden="true">…</span>';
}

return `<button type="button" class="pagination-number${page===state.page?' active':''}" data-page="${page}"${page===state.page?' aria-current="page"':''}>${page}</button>`;
}).join('');

el.paginationNumbers.querySelectorAll('button[data-page]').forEach(button=>{
button.addEventListener('click',()=>{
const page=Number(button.dataset.page);
if(!page||page===state.page||state.loading)return;
state.page=page;
loadJobs(true);
});
});
}

function getVisiblePages(current,total){
if(total<=5){
return Array.from({length:total},(_,i)=>i+1);
}

if(current<=3)return[1,2,3,4,'...',total];
if(current>=total-2)return[1,'...',total-3,total-2,total-1,total];

return[1,'...',current-1,current,current+1,'...',total];
}

function updateSummary(){
if(state.totalRecords===0){
el.resultsSummary.textContent='No opportunities found';
return;
}

const start=((state.page-1)*PAGE_SIZE)+1;
const end=Math.min(state.page*PAGE_SIZE,state.totalRecords);

el.resultsSummary.textContent=
`Showing ${start}-${end} of ${state.totalRecords} opportunities`;
}

function updateCount(){
el.availableJobsCount.textContent=String(state.totalRecords);
}

function updateFilterCount(){
const count=[
state.city,
state.jobType,
state.workMode
].filter(Boolean).length;

el.activeFilterCount.textContent=String(count);
el.activeFilterCount.hidden=count===0;
}

function resetFilters(){
state.city='';
state.jobType='';
state.workMode='';
state.page=1;

if(el.locationFilter)el.locationFilter.value='';
if(el.jobTypeFilter)el.jobTypeFilter.value='';
if(el.workModeFilter)el.workModeFilter.value='';

updateFilterCount();
closeFilters();
loadJobs();
}

function resetAll(){
clearTimeout(searchTimer);

state.search='';
state.city='';
state.jobType='';
state.workMode='';
state.sort='latest';
state.page=1;

if(el.jobSearch)el.jobSearch.value='';
if(el.clearSearch)el.clearSearch.hidden=true;
if(el.locationFilter)el.locationFilter.value='';
if(el.jobTypeFilter)el.jobTypeFilter.value='';
if(el.workModeFilter)el.workModeFilter.value='';
if(el.sortJobs)el.sortJobs.value='latest';

updateFilterCount();
closeFilters();
loadJobs();
}

function openFilters(){
if(!el.jobsFilters)return;
el.jobsFilters.classList.add('open');
el.filterBackdrop.hidden=false;
document.body.style.overflow='hidden';
}

function closeFilters(){
if(!el.jobsFilters)return;
el.jobsFilters.classList.remove('open');
el.filterBackdrop.hidden=true;
document.body.style.overflow='';
}

function formatLocation(job){
const parts=[
job.City,
job.District,
job.State
].map(value=>String(value||'').trim()).filter(Boolean);

return safe([...new Set(parts)].join(', '));
}

function formatSalary(min,max){
const minimum=numberValue(min);
const maximum=numberValue(max);

if(!minimum&&!maximum)return'';
if(minimum&&maximum){
return `₹${formatNumber(minimum)} - ₹${formatNumber(maximum)}`;
}
if(minimum)return `From ₹${formatNumber(minimum)}`;
return `Up to ₹${formatNumber(maximum)}`;
}

function formatNumber(value){
return Number(value).toLocaleString('en-IN');
}

function numberValue(value){
if(typeof value==='number'&&Number.isFinite(value))return value;
const parsed=Number(String(value||'').replace(/[^\d.]/g,''));
return Number.isFinite(parsed)?parsed:0;
}

function salaryValue(job){
return numberValue(job.Salary_Max)||numberValue(job.Salary_Min);
}

function parseSkills(value){
if(Array.isArray(value))return value.map(String).filter(Boolean);

return String(value||'')
.split(/[,;|]/)
.map(skill=>skill.trim())
.filter(Boolean);
}

function formatPostedDate(value){
const date=parseDate(value);
if(!date)return'';

const diff=Math.floor((Date.now()-date.getTime())/86400000);

if(diff<=0)return'Posted today';
if(diff===1)return'Posted 1 day ago';
if(diff<30)return`Posted ${diff} days ago`;

return `Posted ${date.toLocaleDateString('en-IN',{
day:'numeric',
month:'short',
year:'numeric'
})}`;
}

function isRecent(value){
const date=parseDate(value);
if(!date)return false;

const days=(Date.now()-date.getTime())/86400000;
return days>=0&&days<=7;
}

function parseDate(value){
if(!value)return null;
const date=new Date(value);
return Number.isNaN(date.getTime())?null:date;
}

function dateValue(value){
const date=parseDate(value);
return date?date.getTime():0;
}

function unique(values){
return [...new Set(
values
.map(value=>String(value||'').trim())
.filter(Boolean)
)].sort((a,b)=>a.localeCompare(b));
}

function safe(value){
return String(value??'')
.replace(/&/g,'&amp;')
.replace(/</g,'&lt;')
.replace(/>/g,'&gt;')
.replace(/"/g,'&quot;')
.replace(/'/g,'&#039;');
}
})();
