
(function(){
  let deferredPrompt=null;
  const installBtn=document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;installBtn.style.display='inline-block';});
  installBtn&&installBtn.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installBtn.style.display='none';});

  const $=id=>document.getElementById(id);
  const datePicker=$('datePicker'),todayBtn=$('todayBtn'),prevDay=$('prevDay'),nextDay=$('nextDay');
  const monthlyViewBtn=$('monthlyViewBtn'),weeklyReviewBtn=$('weeklyReviewBtn'),collectionsBtn=$('collectionsBtn');
  const exportJSONBtn=$('exportJSONBtn'),exportMDBtn=$('exportMDBtn'),exportMonthMDBtn=$('exportMonthMDBtn'),printBtn=$('printBtn'),importBtn=$('importBtn'),importFile=$('importFile');
  const priorityOnly=$('priorityOnly'),categoryFilter=$('categoryFilter'),sortMode=$('sortMode');
  const dailyView=$('dailyView'),monthlyView=$('monthlyView'),weeklyView=$('weeklyView'),collectionsView=$('collectionsView'),monthHeader=$('monthHeader'),monthGrid=$('monthGrid');
  const closeMonthly=$('closeMonthly'),closeWeekly=$('closeWeekly'),closeCollections=$('closeCollections');
  const weekHeader=$('weekHeader'),weekOutstanding=$('weekOutstanding'),weekCompleted=$('weekCompleted'),weekMigrated=$('weekMigrated'),exportWeekMdBtn=$('exportWeekMdBtn'),metricCounts=$('metricCounts');
  const taskList=$('taskList'),eventList=$('eventList'),noteList=$('noteList');
  const taskInput=$('taskInput'),eventInput=$('eventInput'),eventStart=$('eventStart'),eventEnd=$('eventEnd'),noteInput=$('noteInput');
  const taskCategory=$('taskCategory'),eventCategory=$('eventCategory'),noteCategory=$('noteCategory');
  const itemTemplate=document.getElementById('itemTemplate');

  function keyFor(d){return `bujo:${d}`;}
  function loadDay(d){const raw=localStorage.getItem(keyFor(d));if(!raw)return{tasks:[],events:[],notes:[]};try{return JSON.parse(raw);}catch{return{tasks:[],events:[],notes:[]};}}
  function saveDay(d,data){localStorage.setItem(keyFor(d),JSON.stringify(data));}
  function todayISO(dt=new Date()){const off=dt.getTimezoneOffset()*60000;return new Date(dt-off).toISOString().split('T')[0];}
  function iso(dt){const off=dt.getTimezoneOffset()*60000;return new Date(dt-off).toISOString().split('T')[0];}

  function renderDay(ds){const data=loadDay(ds); renderList(taskList,data.tasks,'task','☐'); renderList(eventList,data.events,'event','•'); renderList(noteList,data.notes,'note','–');}

  function filterAndSort(items){
    let a=[...items]; const cat=categoryFilter.value; if(cat){a=a.filter(i=>(i.category||'')===cat);}
    if(priorityOnly&&priorityOnly.checked){a=a.filter(i=>!!i.priority);}
    switch(sortMode.value){
      case 'priority': a.sort((x,y)=>(y.priority?1:0)-(x.priority?1:0)); break;
      case 'alpha': a.sort((x,y)=>(x.text||'').localeCompare(y.text||'')); break;
      case 'status': const order={active:0,completed:1,removed:2}; a.sort((x,y)=>order[x.status||'active']-order[y.status||'active']); break;
    } return a;
  }

  function renderList(dom, items, type, sym){
    dom.innerHTML=''; const filtered=filterAndSort(items);
    filtered.forEach(it=>{
      const idx=items.indexOf(it);
      const li=itemTemplate.content.firstElementChild.cloneNode(true);
      li.querySelector('.symbol').textContent=sym;
      const input=li.querySelector('.text');
      input.value = (type==='event' ? ([it.start,it.end].filter(Boolean).join('–')+(it.start||it.end?' ':'')+(it.text||'')) : (it.text||''));
      const pill=li.querySelector('.category-pill'); pill.textContent=it.category||'';
      if(it.status==='completed') li.classList.add('completed');
      if(it.status==='removed') li.classList.add('removed');
      if(it.priority) li.classList.add('priority');
      input.addEventListener('change',()=>{
        if(type==='event'){
          const m=input.value.match(/^(\d{1,2}:\d{2})(?:\s*[-–]\s*(\d{1,2}:\d{2}))?\s+(.*)$/);
          if(m) updateItem(type,idx,{start:m[1],end:m[2]||'',text:m[3]});
          else updateItem(type,idx,{text:input.value});
        } else updateItem(type,idx,{text:input.value});
      });
      li.querySelector('.priority').addEventListener('click',()=>updateItem(type,idx,{priority:!it.priority}));
      li.querySelector('.complete').addEventListener('click',()=>updateItem(type,idx,{status:it.status==='completed'?'active':'completed'}));
      li.querySelector('.remove').addEventListener('click',()=>updateItem(type,idx,{status:it.status==='removed'?'active':'removed'}));
      li.querySelector('.migrate').addEventListener('click',()=>migrateItem(type,idx));
      dom.appendChild(li);
    });
  }

  function getCurrentDate(){return datePicker.value||todayISO();}
  function addItem(type,text,category){const ds=getCurrentDate();const data=loadDay(ds);const it={text,category,status:'active',priority:false,createdAt:Date.now()}; if(type==='event'){it.start=eventStart.value||''; it.end=eventEnd.value||'';} data[type+'s'].push(it); saveDay(ds,data); renderDay(ds);}
  function updateItem(type,idx,patch){const ds=getCurrentDate(); const data=loadDay(ds); data[type+'s'][idx]={...data[type+'s'][idx],...patch}; saveDay(ds,data); renderDay(ds);}
  function migrateItem(type,idx){const ds=getCurrentDate(); const next=iso(new Date(new Date(ds+'T12:00:00').getTime()+86400000)); const data=loadDay(ds); const [it]=data[type+'s'].splice(idx,1); saveDay(ds,data); const nextData=loadDay(next); nextData[type+'s'].push({...it,migratedFrom:ds,status:'active'}); saveDay(next,nextData); renderDay(ds); alert('Migrated to '+next);}

  function openMonthly(){
    switchView('monthly');
    const base=new Date(getCurrentDate()+'T12:00:00'); const y=base.getFullYear(), m=base.getMonth();
    const first=new Date(y,m,1), firstDay=first.getDay(), days=new Date(y,m+1,0).getDate();
    monthHeader.textContent=first.toLocaleString(undefined,{month:'long',year:'numeric'}); monthGrid.innerHTML='';
    for(let i=0;i<firstDay;i++){const cell=document.createElement('div');cell.className='month-cell';monthGrid.appendChild(cell);}
    for(let d=1;d<=days;d++){const cell=document.createElement('div');cell.className='month-cell'; const ds=iso(new Date(y,m,d));
      const head=document.createElement('div'); head.className='date'; head.textContent=ds; cell.appendChild(head);
      const evs=(loadDay(ds).events||[]).filter(e=>e.status!=='removed').slice(0,3);
      evs.forEach(e=>{const div=document.createElement('div');div.className='month-event';const t=[e.start,e.end].filter(Boolean).join('–');div.textContent=(t?t+' ':'')+(e.text||''); cell.appendChild(div);});
      cell.addEventListener('click',()=>{datePicker.value=ds; switchView('daily'); renderDay(ds);});
      monthGrid.appendChild(cell);
    }
  }

  function switchView(which){dailyView.classList.toggle('hidden',which!=='daily'); monthlyView.classList.toggle('hidden',which!=='monthly'); weeklyView.classList.toggle('hidden',which!=='weekly'); collectionsView.classList.toggle('hidden',which!=='collections');}
  function weekBounds(ds){const d=new Date(ds+'T12:00:00'); const w=d.getDay(); const s=new Date(d); s.setDate(d.getDate()-w); const e=new Date(d); e.setDate(d.getDate()+(6-w)); return {start:iso(s),end:iso(e)};}
  function openWeekly(){switchView('weekly'); const {start,end}=weekBounds(getCurrentDate()); weekHeader.textContent=`Week of ${start} to ${end}`; const agg={outstanding:[],completed:[],migrated:[],counts:{tasks:0,events:0,notes:0,completed:0,removed:0}};
    let cur=new Date(start+'T12:00:00'); const endDt=new Date(end+'T12:00:00');
    while(cur<=endDt){const ds=iso(cur); const data=loadDay(ds); ['tasks','events','notes'].forEach(kind=>{
      (data[kind]||[]).forEach(it=>{agg.counts[kind]+=1; if(it.status==='completed')agg.counts.completed+=1; if(it.status==='removed')agg.counts.removed+=1;
        const pref=kind==='tasks'?'☐':(kind==='events'?'•':'–'); const time=kind==='events'?([it.start,it.end].filter(Boolean).join('–')+' '):'';
        const label=`${ds} ${pref} ${time}${it.text}${it.category?` [${it.category}]`:''}${it.priority?' ✱':''}`;
        if(it.migratedFrom) agg.migrated.push(label); else if(it.status==='completed') agg.completed.push(label); else if(it.status!=='removed') agg.outstanding.push(label);
      });
    }); cur.setDate(cur.getDate()+1); }
    weekOutstanding.innerHTML=agg.outstanding.map(x=>`<li>${x}</li>`).join('');
    weekCompleted.innerHTML=agg.completed.map(x=>`<li>${x}</li>`).join('');
    weekMigrated.innerHTML=agg.migrated.map(x=>`<li>${x}</li>`).join('');
    metricCounts.textContent=`Totals — Tasks: ${agg.counts.tasks}, Events: ${agg.counts.events}, Notes: ${agg.counts.notes}. Completed: ${agg.counts.completed}, Removed: ${agg.counts.removed}`;
    exportWeekMdBtn.onclick=()=>downloadText(mdForWeek(start,end),`bujo_week_${start}_to_${end}.md`);
  }

  function mdForDay(ds){const d=loadDay(ds); const map=(arr,sym,kind)=> (arr||[]).map(i=>{const t=kind==='events'?(([i.start,i.end].filter(Boolean).join('–')+' ').trim()+(i.text||'')):(i.text||''); return `- ${sym} ${t}${i.category?` [${i.category}]`:''}${i.priority?' ✱':''}${i.status==='completed'?' ☑':''}${i.status==='removed'?' ✖':''}`;}).join('\\n');
    return `# Daily Log — ${ds}\n## Tasks\n${map(d.tasks,'☐','tasks')}\n## Events\n${map(d.events,'•','events')}\n## Notes\n${map(d.notes,'–','notes')}\n`; }
  function mdForWeek(s,e){let out=`# Weekly Review — ${s} to ${e}\n`; let cur=new Date(s+'T12:00:00'); const end=new Date(e+'T12:00:00'); while(cur<=end){const ds=iso(cur); out+=`\\n## ${ds}\\n`+mdForDay(ds)+'\\n'; cur.setDate(cur.getDate()+1);} return out;}
  function mdForMonth(ds){const d=new Date(ds+'T12:00:00'); const y=d.getFullYear(), m=d.getMonth(); const first=new Date(y,m,1); const days=new Date(y,m+1,0).getDate(); let out=`# Monthly Log — ${first.toLocaleString(undefined,{month:'long',year:'numeric'})}\n`; for(let i=1;i<=days;i++){const s=iso(new Date(y,m,i)); out+=`\\n## ${s}\\n`+mdForDay(s)+'\\n';} return out;}
  function downloadText(text,name){const b=new Blob([text],{type:'text/plain'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u);}
  function exportJSON(){const stamp=new Date().toISOString().split('T')[0]; const data={}; for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i); if(k&&k.startsWith('bujo:')){try{data[k]=JSON.parse(localStorage.getItem(k));}catch{}}} downloadText(JSON.stringify(data,null,2),`bujo_backup_${stamp}.json`);}

  // Collections
  function collectionsKey(){return 'bujo:collections';}
  function loadCollections(){const raw=localStorage.getItem(collectionsKey()); if(!raw) return []; try{return JSON.parse(raw);}catch{return [];}}
  function saveCollections(list){localStorage.setItem(collectionsKey(),JSON.stringify(list));}
  function openCollections(){switchView('collections'); renderCollections();}
  const collectionsContainer=document.getElementById('collectionsContainer'); const collectionName=document.getElementById('collectionName'); const addCollection=document.getElementById('addCollection');
  function renderCollections(){const cols=loadCollections(); collectionsContainer.innerHTML=''; cols.forEach((c,idx)=>{const wrap=document.createElement('div'); wrap.className='collection'; const h3=document.createElement('h3'); h3.textContent=c.name; wrap.appendChild(h3); const ar=document.createElement('div'); ar.className='add-row'; const inp=document.createElement('input'); inp.placeholder=`Add to ${c.name}…`; const btn=document.createElement('button'); btn.textContent='Add'; btn.onclick=()=>{if(!inp.value.trim())return; c.items.push({text:inp.value,addedAt:Date.now()}); saveCollections(cols); renderCollections(); inp.value='';}; ar.append(inp,btn); wrap.appendChild(ar); const list=document.createElement('ul'); list.className='items'; (c.items||[]).forEach(it=>{const li=document.createElement('li'); li.textContent='– '+it.text; list.appendChild(li);}); wrap.appendChild(list); collectionsContainer.appendChild(wrap);});}
  addCollection&&addCollection.addEventListener('click',()=>{if(!collectionName.value.trim())return; const cols=loadCollections(); cols.push({name:collectionName.value,items:[]}); saveCollections(cols); collectionName.value=''; renderCollections();});

  // Wiring
  document.getElementById('closeMonthly').addEventListener('click',()=>switchView('daily'));
  document.getElementById('closeWeekly').addEventListener('click',()=>switchView('daily'));
  document.getElementById('closeCollections').addEventListener('click',()=>switchView('daily'));
  monthlyViewBtn.addEventListener('click',openMonthly);
  weeklyReviewBtn.addEventListener('click',openWeekly);
  collectionsBtn.addEventListener('click',openCollections);

  document.querySelectorAll('.add').forEach(b=>b.addEventListener('click',()=>{
    const type=b.dataset.type; let val='',cat='';
    if(type==='task'){val=taskInput.value; cat=taskCategory.value;}
    if(type==='event'){val=eventInput.value; cat=eventCategory.value;}
    if(type==='note'){val=noteInput.value; cat=noteCategory.value;}
    if(!val.trim()) return;
    addItem(type,val.trim(),cat);
    if(type==='task') taskInput.value='';
    if(type==='event'){eventInput.value=''; eventStart.value=''; eventEnd.value='';}
    if(type==='note') noteInput.value='';
  }));

  datePicker.addEventListener('change',()=>renderDay(getCurrentDate()));
  todayBtn.addEventListener('click',()=>{datePicker.value=todayISO(); renderDay(getCurrentDate());});
  prevDay.addEventListener('click',()=>{const d=new Date(getCurrentDate()+'T12:00:00'); d.setDate(d.getDate()-1); datePicker.value=iso(d); renderDay(getCurrentDate());});
  nextDay.addEventListener('click',()=>{const d=new Date(getCurrentDate()+'T12:00:00'); d.setDate(d.getDate()+1); datePicker.value=iso(d); renderDay(getCurrentDate());});
  categoryFilter.addEventListener('change',()=>renderDay(getCurrentDate()));
  sortMode.addEventListener('change',()=>renderDay(getCurrentDate()));
  priorityOnly&&priorityOnly.addEventListener('change',()=>renderDay(getCurrentDate()));

  exportJSONBtn.addEventListener('click',exportJSON);
  exportMDBtn.addEventListener('click',()=>{const ds=getCurrentDate(); downloadText(mdForDay(ds),`bujo_${ds}.md`);});
  exportMonthMDBtn.addEventListener('click',()=>{const ds=getCurrentDate(); downloadText(mdForMonth(ds),`bujo_month_${ds.slice(0,7)}.md`);});
  importBtn.addEventListener('click',()=>importFile.click());
  importFile.addEventListener('change',e=>{if(e.target.files&&e.target.files[0]) importAll(e.target.files[0]);});
  function importAll(file){const r=new FileReader(); r.onload=()=>{try{const obj=JSON.parse(r.result); Object.entries(obj).forEach(([k,v])=>{if(k.startsWith('bujo:')) localStorage.setItem(k,JSON.stringify(v));}); alert('Restore complete.'); renderDay(getCurrentDate());}catch(err){alert('Restore failed: '+err.message);}}; r.readAsText(file);}
  printBtn.addEventListener('click',()=>window.print());

  datePicker.value=todayISO(); renderDay(getCurrentDate());
  if(!localStorage.getItem('bujo:collections')) localStorage.setItem('bujo:collections', JSON.stringify([{name:'Books to Read',items:[]},{name:'Habit Tracker',items:[]}]));

  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }
})();