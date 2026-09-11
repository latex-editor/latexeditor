const STORAGE_KEY = 'polygon-editor-data-v2';
const initial = {
  name:'A. Sample Problem', time:'2 seconds', memory:'256 megabytes',
  legend:'Given an integer $n$, determine whether it satisfies the required condition.\\n\\nFor example, if $n=10$, then $n^2=100$.',
  input:'The first line contains an integer $n$ ($1 \\le n \\le 10^9$).',
  output:'Print `YES` if the condition is satisfied, and `NO` otherwise.',
  interaction:'', notes:'In the example above, $10^2=100$.',
  examples:[{input:'10',output:'YES'},{input:'7',output:'NO'}]
};
const labels = {legend:'Legend',input:'Input',output:'Output',interaction:'Interaction',notes:'Note'};
let data = loadLocal() || structuredClone(initial);

function loadLocal(){try{const x=localStorage.getItem(STORAGE_KEY);return x?JSON.parse(x):null}catch(e){return null}}
function saveLocal(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}
function escapeHTML(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function renderText(text){
  let s=String(text||'').replace(/\\\\/g,'\n');
  const parts=[]; let i=0;
  const re=/`([^`]+)`|\\\((.+?)\\\)|\$(.+?)\$/gs; let m;
  while((m=re.exec(s))){ parts.push(escapeHTML(s.slice(i,m.index))); if(m[1]!==undefined){parts.push('<code>'+escapeHTML(m[1])+'</code>')}else{const math=m[2]??m[3];try{parts.push(katex.renderToString(math,{throwOnError:false,displayMode:false}))}catch{parts.push('<span class="latex-error">'+escapeHTML(math)+'</span>')}} i=m.index+m[0].length; }
  parts.push(escapeHTML(s.slice(i)));
  return parts.join('').replace(/\n/g,'<br>');
}
function sectionHTML(title,text){return text?`<section class="cf-section"><h2>${title}</h2><div>${renderText(text)}</div></section>`:''}
function renderPreview(){
  const p=document.getElementById('preview');
  let html=`<div class="statement-title"><b>${escapeHTML(data.name)}</b></div><div class="limits"><span>time limit per test</span> ${escapeHTML(data.time)} <span>memory limit per test</span> ${escapeHTML(data.memory)}</div>`;
  for(const k of ['legend','input','output','interaction']) html+=sectionHTML(labels[k],data[k]);
  if(data.examples?.length){html+=`<section class="cf-section"><h2>Examples</h2><div class="samples">${data.examples.map(e=>`<div class="sample"><div class="sample-label">Input</div><pre>${escapeHTML(e.input)}</pre><div class="sample-label">Output</div><pre>${escapeHTML(e.output)}</pre></div>`).join('')}</div></section>`}
  html+=sectionHTML('Note',data.notes); p.innerHTML=html;
}
function renderEditor(){
  document.getElementById('name').value=data.name; document.getElementById('time').value=data.time; document.getElementById('memory').value=data.memory;
  const container=document.getElementById('sections'); container.innerHTML='';
  for(const k of ['legend','input','output','interaction','notes']){const row=document.createElement('div');row.className='form-row';row.innerHTML=`<label>${labels[k]}</label><textarea spellcheck="false" data-key="${k}" placeholder="Write ${labels[k].toLowerCase()} here..."></textarea>`;row.querySelector('textarea').value=data[k];container.appendChild(row)}
  const ex=document.getElementById('examples'); ex.innerHTML='';
  data.examples.forEach((e,i)=>{const row=document.createElement('div');row.className='example-edit';row.innerHTML=`<span>Example ${i+1}</span><textarea spellcheck="false" placeholder="Input">${escapeHTML(e.input)}</textarea><textarea spellcheck="false" placeholder="Output">${escapeHTML(e.output)}</textarea><button class="remove-example">Remove</button>`;const ts=row.querySelectorAll('textarea');ts[0].addEventListener('input',ev=>{data.examples[i].input=ev.target.value;changed()});ts[1].addEventListener('input',ev=>{data.examples[i].output=ev.target.value;changed()});row.querySelector('.remove-example').addEventListener('click',()=>{data.examples.splice(i,1);renderEditor();renderPreview();saveLocal()});ex.appendChild(row)});
}
function changed(){saveLocal();renderPreview()}
['name','time','memory'].forEach(k=>document.getElementById(k).addEventListener('input',e=>{data[k]=e.target.value;changed()}));

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById('workspace').className='workspace '+btn.dataset.mode}));
document.getElementById('sections').addEventListener('input',e=>{if(e.target.dataset.key){data[e.target.dataset.key]=e.target.value;changed()}});
document.getElementById('addExample').addEventListener('click',()=>{data.examples.push({input:'',output:''});renderEditor();renderPreview();saveLocal()});
document.getElementById('saveBtn').addEventListener('click',()=>{saveLocal();const b=document.getElementById('saveBtn');const old=b.textContent;b.textContent='Saved';setTimeout(()=>b.textContent=old,1000)});
document.getElementById('loadBtn').addEventListener('click',()=>{const x=loadLocal();if(x){data=x;renderEditor();renderPreview()}else alert('저장된 데이터가 없습니다.')});
document.getElementById('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(data.name||'problem').replace(/[^\w가-힣.-]+/g,'_')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=='object'||!Array.isArray(x.examples))throw new Error();data={...structuredClone(initial),...x};saveLocal();renderEditor();renderPreview()}catch{alert('올바른 Polygon Editor JSON 파일이 아닙니다.')}e.target.value='' });
document.getElementById('resetBtn').addEventListener('click',()=>{if(confirm('현재 내용을 초기화할까요?')){data=structuredClone(initial);saveLocal();renderEditor();renderPreview()}});
renderEditor();renderPreview();
