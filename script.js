// ===== FIREBASE CONFIG =====
// Replace with your own Firebase project config
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or use existing)
// 3. Enable Firestore Database (start in test mode)
// 4. Go to Project Settings > General > Your apps > Add web app
// 5. Copy the config object and paste below
const firebaseConfig = {
  apiKey: "AIzaSyBW-hTg59_vyPfzrSk8X0AtaHMGofwTKRQ",
  authDomain: "bwatery-6e79f.firebaseapp.com",
  projectId: "bwatery-6e79f",
  storageBucket: "bwatery-6e79f.firebasestorage.app",
  messagingSenderId: "1068107231462",
  appId: "1:1068107231462:web:1166cb678385aaac8ccb27"
};
let db = null;
let auth = null;
let currentUser = null;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
} catch(e) {
  console.warn('Firebase init failed, using localStorage fallback:', e);
}

const state={gender:null,age:null,weight:null,dailyGoal:3000,currentIntake:0,darkMode:false,reminderInterval:30,reminderTimer:null,weatherBoost:true,lastDate:null,_weatherBoosted:false,onboarded:false,userName:'',soundEnabled:true,wakeTime:'07:00',bedTime:'23:00',reminderMode:'sound',remindAfterGoal:false,unit:'ml',defaultCup:250,language:'en'};
const BUBBLE_TOP=85,BUBBLE_BOTTOM=270,BUBBLE_RANGE=BUBBLE_BOTTOM-BUBBLE_TOP;
const ACHIEVEMENTS=[
  {id:'first_sip',name:'First Sip',desc:'Log your first water',icon:'💧',check:()=>getTotalDaysWithIntake()>=1},
  {id:'streak_3',name:'3 Day Streak',desc:'Hit goal 3 days in a row',icon:'🔥',check:()=>calcStreak()>=3},
  {id:'streak_7',name:'Week Warrior',desc:'7 day streak',icon:'⚡',check:()=>calcStreak()>=7},
  {id:'streak_30',name:'Monthly Master',desc:'30 day streak',icon:'🏆',check:()=>calcStreak()>=30},
  {id:'goal_10',name:'Goal Getter',desc:'Meet goal 10 times',icon:'🎯',check:()=>getGoalsMetCount()>=10},
  {id:'goal_50',name:'Hydration Hero',desc:'Meet goal 50 times',icon:'🦸',check:()=>getGoalsMetCount()>=50},
  {id:'total_50l',name:'50L Club',desc:'Drink 50 liters total',icon:'🌊',check:()=>getTotalIntake()>=50000},
  {id:'total_100l',name:'100L Legend',desc:'Drink 100 liters total',icon:'🐋',check:()=>getTotalIntake()>=100000}
];

function init(){
  loadState();applyDarkMode();loadSelectedSound();
  const st=document.getElementById('soundToggle');if(st)st.classList.toggle('on',state.soundEnabled);
  if(auth){
    auth.onAuthStateChanged((user)=>{
      if(user){
        currentUser=user;
        loadUserData();
      }else{
        showScreen('screen-login');
      }
    });
  }else{
    if(state.onboarded){
      showScreen('screen-dashboard');
      renderAll();fetchStats();fetchWeather();checkAchievements();
    }else{
      showScreen('screen-onboarding');
    }
  }
  checkMidnightReset();setInterval(checkMidnightReset,60000);
  if(state.reminderInterval>0&&state.onboarded)startReminderTimer();
  loadRating();screenHistory=['screen-dashboard'];
  try{history.replaceState({screen:'screen-dashboard'},'',location.href)}catch(e){}
  renderUserGreeting();renderUserComments();
}

function signUp(){const email=document.getElementById('authEmail').value.trim();const pass=document.getElementById('authPassword').value;const errBox=document.getElementById('authError');errBox.textContent='';if(!email||!pass)return errBox.textContent='Please fill in both fields';if(pass.length<6)return errBox.textContent='Password must be at least 6 characters';auth.createUserWithEmailAndPassword(email,pass).then((cred)=>{currentUser=cred.user;loadUserData()}).catch((e)=>{errBox.textContent=e.message})}
function logIn(){const email=document.getElementById('authEmail').value.trim();const pass=document.getElementById('authPassword').value;const errBox=document.getElementById('authError');errBox.textContent='';if(!email||!pass)return errBox.textContent='Please fill in both fields';auth.signInWithEmailAndPassword(email,pass).then((cred)=>{currentUser=cred.user;loadUserData()}).catch((e)=>{errBox.textContent=e.message})}
function logOut(){auth.signOut().then(()=>{currentUser=null;showScreen('screen-login')})}
function saveUserData(){if(!currentUser||!db)return;const history={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('bwatery_day_')){try{history[k]=JSON.parse(localStorage.getItem(k))}catch(e){}}}}catch(e){}const achievements=localStorage.getItem('bwatery_achievements')||'[]';const rating=localStorage.getItem('bwatery_rating')||'0';db.collection('users').doc(currentUser.uid).set({userName:state.userName,gender:state.gender,age:state.age,weight:state.weight,dailyGoal:state.dailyGoal,onboarded:state.onboarded,currentIntake:state.currentIntake,lastDate:state.lastDate,darkMode:state.darkMode,reminderInterval:state.reminderInterval,weatherBoost:state.weatherBoost,soundEnabled:state.soundEnabled,wakeTime:state.wakeTime,bedTime:state.bedTime,reminderMode:state.reminderMode,remindAfterGoal:state.remindAfterGoal,unit:state.unit,defaultCup:state.defaultCup,language:state.language,_weatherBoosted:state._weatherBoosted,history:history,achievements:JSON.parse(achievements),rating:parseInt(rating)},{merge:true})}
function loadUserData(){if(!currentUser||!db)return;db.collection('users').doc(currentUser.uid).get().then((doc)=>{if(doc.exists){const d=doc.data();state.userName=d.userName||'';state.gender=d.gender||null;state.age=d.age||null;state.weight=d.weight||null;state.dailyGoal=d.dailyGoal||3000;state.onboarded=d.onboarded||false;state.currentIntake=d.currentIntake||0;state.lastDate=d.lastDate||null;state.darkMode=d.darkMode||false;state.reminderInterval=d.reminderInterval||30;state.weatherBoost=d.weatherBoost!==undefined?d.weatherBoost:true;state.soundEnabled=d.soundEnabled!==undefined?d.soundEnabled:true;state.wakeTime=d.wakeTime||'07:00';state.bedTime=d.bedTime||'23:00';state.reminderMode=d.reminderMode||'sound';state.remindAfterGoal=d.remindAfterGoal||false;state.unit=d.unit||'ml';state.defaultCup=d.defaultCup||250;state.language=d.language||'en';state._weatherBoosted=d._weatherBoosted||false;if(d.history){Object.keys(d.history).forEach(k=>{try{localStorage.setItem(k,JSON.stringify(d.history[k]))}catch(e){}})}if(d.achievements)try{localStorage.setItem('bwatery_achievements',JSON.stringify(d.achievements))}catch(e){}if(d.rating)try{localStorage.setItem('bwatery_rating',String(d.rating))}catch(e){}saveState();applyDarkMode();const g=document.getElementById('settingsGoal');if(g)g.value=(state.dailyGoal-(state._weatherBoosted?500:0))/1000;const r=document.getElementById('reminderInterval');if(r)r.value=state.reminderInterval;if(state.onboarded){showScreen('screen-dashboard');renderAll();fetchStats();fetchWeather();checkAchievements();renderUserGreeting();renderUserComments();if(state.reminderInterval>0)startReminderTimer()}else{showScreen('screen-onboarding')}}else{showScreen('screen-onboarding')}}).catch(()=>{if(state.onboarded){showScreen('screen-dashboard');renderAll();renderUserGreeting()}else{showScreen('screen-onboarding')}})}

function loadState(){
  try{const s=localStorage.getItem('bwatery_state');if(s)Object.assign(state,JSON.parse(s))}catch(e){}
  const today=getToday(),data=localStorage.getItem('bwatery_day_'+today);
  if(data){try{const d=JSON.parse(data);state.currentIntake=d.intake||0;if(d.goal)state.dailyGoal=d.goal}catch(e){state.currentIntake=0}}else state.currentIntake=0;
  const g=document.getElementById('settingsGoal'),r=document.getElementById('reminderInterval');
  if(g)g.value=(state.dailyGoal-(state._weatherBoosted?500:0))/1000;
  if(r)r.value=state.reminderInterval;
  const rm=document.getElementById('reminderMode');if(rm)rm.value=state.reminderMode||'sound';
  const rat=document.getElementById('remindAfterGoalToggle');if(rat)rat.classList.toggle('on',!!state.remindAfterGoal);
  const wt=document.getElementById('settingsWakeTime');if(wt)wt.value=state.wakeTime||'07:00';
  const bt=document.getElementById('settingsBedTime');if(bt)bt.value=state.bedTime||'23:00';
  const un=document.getElementById('unitSelect');if(un)un.value=state.unit||'ml';
  const lg=document.getElementById('langSelect');if(lg)lg.value=state.language||'en';
}
function saveState(){try{localStorage.setItem('bwatery_state',JSON.stringify(state))}catch(e){}}
function toDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function getToday(){return toDateStr(new Date())}
function saveToday(){try{localStorage.setItem('bwatery_day_'+getToday(),JSON.stringify({intake:state.currentIntake,goal:state.dailyGoal}))}catch(e){}}
function checkMidnightReset(){const t=getToday();if(state.lastDate&&state.lastDate!==t){if(!localStorage.getItem('bwatery_day_'+state.lastDate))saveToday();state.currentIntake=0}state.lastDate=t;saveState()}
function hideAllScreens(){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'))}
function activateNav(id){document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));const i=document.querySelector('.nav-item[data-screen="'+id+'"]');if(i)i.classList.add('active')}

const navScreens=['screen-dashboard','screen-stats','screen-history','screen-achievements','screen-settings','screen-tips','screen-about'];
const noBackScreens=['screen-dashboard','screen-splash','screen-onboarding','screen-setgoal','screen-loading'];
let screenHistory=[];
function showScreen(id,skipPush){
  hideAllScreens();document.getElementById(id).classList.add('active');activateNav(id);
  if(id==='screen-history')renderHistory();if(id==='screen-stats'){renderStats();renderCalendar()}if(id==='screen-achievements')renderAchievements();
  if(id==='screen-dashboard'){renderAll();fetchWeather()}
  if(id==='screen-settings'){renderUserGreeting();renderUserComments();loadRating();showDevOptions()}
  const nav=document.getElementById('bottomNav');
  if(nav)nav.style.display=navScreens.includes(id)?'flex':'none';
  if(!skipPush){screenHistory.push(id);try{history.pushState({screen:id},'',location.href)}catch(e){}}
}
function goBack(){try{history.back()}catch(e){if(screenHistory.length>1){screenHistory.pop();showScreen(screenHistory[screenHistory.length-1],true)}}}
window.addEventListener('popstate',function(e){
  if(e.state&&e.state.screen){showScreen(e.state.screen,true)}
  else if(screenHistory.length>1){screenHistory.pop();showScreen(screenHistory[screenHistory.length-1],true)}
});

function fetchStats(){
  try{const h=getHistoryData().slice(-7),d=h.filter(x=>x.intake>0),t=d.reduce((s,x)=>s+x.intake,0);
  const a=d.length>0?fmtL(Math.round(t/d.length)):'0 L';
  const streak=calcStreak();const flame=streak>=14?'🔥🔥🔥':streak>=7?'🔥🔥':streak>=3?'🔥':'';
  const e1=document.getElementById('weeklyAvg'),e2=document.getElementById('streakCount');
  if(e1)e1.textContent=a;if(e2)e2.textContent=flame+' '+streak+' days'}catch(e){}
}

function selectGender(btn){document.querySelectorAll('.gender-btn').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.gender=btn.dataset.gender}
function goToSetGoal(){const n=document.getElementById('onboardName').value.trim();const a=parseInt(document.getElementById('ageInput').value);const w=parseFloat(document.getElementById('weightInput').value);const wake=document.getElementById('wakeTimeInput').value||'07:00';const bed=document.getElementById('bedTimeInput').value||'23:00';if(!n)return alert('Please enter your name');if(!state.gender)return alert('Please select your gender');if(!a||a<1)return alert('Please enter a valid age');if(!w||w<10)return alert('Please enter a valid weight');state.userName=n;state.age=a;state.weight=w;state.wakeTime=wake;state.bedTime=bed;let mlPerKg=35;if(state.gender==='male')mlPerKg=38;if(a>60)mlPerKg=30;if(a<18)mlPerKg=40;if(w>90)mlPerKg+=3;let s=(w*mlPerKg)/1000;if(s<1.5)s=1.5;if(s>8)s=8;s=Math.round(s*10)/10;document.getElementById('goalInput').value=s;document.getElementById('suggestedGoal').textContent=s.toFixed(1);updateGoalPreview(s);showScreen('screen-setgoal')}
function updateGoalPreview(v){const n=parseFloat(v);if(!isNaN(n)&&n>0)document.getElementById('goalDisplayValue').textContent=n.toFixed(1)}
function finishGoal(){let g=Math.round(parseFloat(document.getElementById('goalInput').value)*1000);if(!g||g<500){let mlPerKg=35;if(state.gender==='male')mlPerKg=38;if(state.age>60)mlPerKg=30;if(state.age<18)mlPerKg=40;if(state.weight>90)mlPerKg+=3;g=Math.round(state.weight*mlPerKg)}state.dailyGoal=g;state.onboarded=true;saveState();saveToday();showLoadingScreen();saveUserData()}
function showLoadingScreen(){const load=document.getElementById('loadingScreen');if(!load){showScreen('screen-dashboard');renderAll();startReminderTimer();fetchWeather();checkAchievements();renderUserGreeting();return}load.classList.add('active');const steps=load.querySelector('.loading-steps');const msgs=['Analyzing your profile...','Calculating your ideal goal...','Setting up reminders...','Almost ready...'];let i=0;const stepTimer=setInterval(()=>{i++;if(i<msgs.length&&steps)steps.innerHTML='<span>'+msgs[i]+'</span>'},750);setTimeout(()=>{clearInterval(stepTimer);load.classList.remove('active');showScreen('screen-dashboard');renderAll();startReminderTimer();fetchWeather();checkAchievements();renderUserGreeting()},3000)}

function addWater(ml){state.currentIntake=state.currentIntake+ml;closeAddModal();saveToday();saveState();renderAll();checkAchievements();splashEffect();saveUserData()}
function clearAllData(){if(!confirm('This will delete ALL your data (history, settings, achievements). Continue?'))return;try{Object.keys(localStorage).forEach(k=>{if(k.startsWith('bwatery_')&&k!=='bwatery_suggestions'&&k!=='bwatery_welcomed')localStorage.removeItem(k)})}catch(e){}state.gender=null;state.age=null;state.weight=null;state.dailyGoal=3000;state.currentIntake=0;state.darkMode=false;state.reminderInterval=30;state.weatherBoost=true;state.lastDate=null;state._weatherBoosted=false;state.onboarded=false;state.userName='';state.soundEnabled=true;state.wakeTime='07:00';state.bedTime='23:00';state.reminderMode='sound';state.remindAfterGoal=false;state.unit='ml';state.defaultCup=250;state.language='en';saveState();applyDarkMode();showScreen('screen-onboarding')}
function clearAllFeedback(){if(!isDev())return alert('Only the developer can clear feedback.');if(!confirm('DELETE ALL feedback from everyone? This cannot be undone!'))return;if(db){db.collection('feedback').get().then(snap=>{const batch=db.batch();snap.forEach(doc=>batch.delete(doc.ref));return batch.commit()}).then(()=>{try{localStorage.removeItem('bwatery_suggestions')}catch(e){}renderUserComments();alert('All feedback cleared!')}).catch(e=>{console.error('Clear failed:',e);alert('Failed to clear feedback.')})}else{try{localStorage.removeItem('bwatery_suggestions')}catch(e){}renderUserComments();alert('All feedback cleared!')}}
function showDevOptions(){const el=document.getElementById('clearFeedbackItem');if(el&&isDev())el.style.display='flex'}
function splashEffect(){const w=document.querySelector('.hero-bubble-wrap');if(!w)return;const r=document.createElement('div');r.style.cssText='position:absolute;top:50%;left:50%;width:20px;height:20px;border:3px solid var(--primary-light);border-radius:50%;transform:translate(-50%,-50%);opacity:.8;pointer-events:none;animation:rippleOut .6s ease-out forwards;z-index:10';w.appendChild(r);setTimeout(()=>r.remove(),650)}
function customAdd(){const el=document.getElementById('customWaterInput');const v=el.value.replace(/[^0-9.]/g,'').trim();const n=Math.round(parseFloat(v));if(!n||n<=0)return alert('Enter a valid amount in ml');addWater(n);el.value=''}
function showAddModal(){document.getElementById('addWaterModal').classList.add('active')}
function closeAddModal(){document.getElementById('addWaterModal').classList.remove('active')}
function resetGoal(){if(!confirm("Reset today's intake to 0?"))return;state.currentIntake=0;saveToday();saveState();renderAll();saveUserData()}

function fmtL(ml){if(state.unit==='oz'){const oz=Math.round(ml/29.5735*10)/10;return oz+' oz'}const l=ml/1000;return(Math.round(l*100)/100).toString().replace(/\.0$/,'')+' L'}
function renderAll(){
  const intake=state.currentIntake,goal=state.dailyGoal,pct=Math.min(intake/goal,1),remaining=Math.max(goal-intake,0);
  const ml=document.getElementById('mlCurrent'),rm=document.getElementById('mlRemaining'),ra=document.getElementById('resetGoalArea');
  if(ml)ml.textContent=fmtL(intake);if(rm)rm.textContent='Remaining '+fmtL(remaining);
  if(ra)ra.style.display=(intake>=goal&&goal>0)?'flex':'none';
  const addBtn=document.querySelector('.add-main-btn');
  if(addBtn){const now=new Date();const h=now.getHours(),m=now.getMinutes();const currentTime=h*60+m;const [wH,wM]=(state.wakeTime||'07:00').split(':').map(Number);const [bH,bM]=(state.bedTime||'23:00').split(':').map(Number);const wakeMin=wH*60+wM;const bedMin=bH*60+bM;const isAwake=bedMin>wakeMin?(currentTime>=wakeMin&&currentTime<=bedMin):(currentTime>=wakeMin||currentTime<=bedMin);const exp=Math.min(.85,currentTime/(24*60)*1.2);addBtn.classList.toggle('needs-water',pct<exp&&isAwake)}
  const wr=document.getElementById('heroWater'),ww=document.getElementById('heroWave');
  if(wr){const h=pct*BUBBLE_RANGE,y=BUBBLE_BOTTOM-h;wr.setAttribute('y',y);wr.setAttribute('height',h);if(ww)ww.setAttribute('d','M5,'+y+' Q70,'+(y-11)+' 130,'+y+' Q190,'+(y+11)+' 255,'+y+' L255,280 L5,280 Z')}
  fetchStats();
}

function renderStats(){
  const today=new Date(),dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],bars=document.getElementById('chartBars');if(!bars)return;bars.innerHTML='';
  let total=0,met=0,dc=0;
  for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const ds=toDateStr(d);let intake=0;
  const data=localStorage.getItem('bwatery_day_'+ds);if(data)try{intake=JSON.parse(data).intake||0}catch(e){}
  if(ds===getToday())intake=state.currentIntake;if(intake>0){dc++;total+=intake}if(intake>=state.dailyGoal)met++;
  const bar=document.createElement('div');bar.className='chart-bar';bar.style.height=Math.min((intake/state.dailyGoal)*100,100)+'%';
  bar.innerHTML='<span class="bar-label">'+dayNames[d.getDay()]+'</span><span class="bar-value">'+fmtL(intake)+'</span>';bars.appendChild(bar)}
  const a=document.getElementById('monthlyAvg'),b=document.getElementById('monthlyGoalMet');
  if(a)a.textContent=dc>0?fmtL(Math.round(total/dc)):'0 L';if(b)b.textContent=met;
}

function renderHistory(){
  const days=parseInt(document.getElementById('historyDays').value),list=document.getElementById('historyList');if(!list)return;list.innerHTML='';
  const today=new Date();let has=false;
  for(let i=days-1;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const ds=toDateStr(d);let intake=0,goal=state.dailyGoal;
  const data=localStorage.getItem('bwatery_day_'+ds);if(data)try{const p=JSON.parse(data);intake=p.intake||0;goal=p.goal||goal}catch(e){}
  if(ds===getToday()){intake=state.currentIntake;goal=state.dailyGoal}if(intake>0)has=true;
  const met=intake>=goal,fmt=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const row=document.createElement('div');row.innerHTML='<table class="history-table" style="width:100%"><tr><td>'+fmt+'</td><td>'+fmtL(intake)+' / '+fmtL(goal)+' <span class="'+(met?'goal-met':'goal-missed')+'">'+(met?'✓':'✗')+'</span></td></tr></table>';list.appendChild(row)}
  if(!has)list.innerHTML='<div class="history-empty">No history yet. Start drinking!</div>';
}

function exportCSV(){const today=new Date();let csv='Date,MlLogged,GoalMl,GoalMet\n';for(let i=30;i>=1;i--){const d=new Date(today);d.setDate(d.getDate()-i);const ds=toDateStr(d);let intake=0,goal=3000;const data=localStorage.getItem('bwatery_day_'+ds);if(data)try{const p=JSON.parse(data);intake=p.intake||0;goal=p.goal||3000}catch(e){}csv+=ds+','+intake+','+goal+','+(intake>=goal?'Yes':'No')+'\n'}if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Filesystem){window.Capacitor.Plugins.Filesystem.writeFile({path:'bwatery_history.csv',data:csv,directory:'DOWNLOADS',encoding:'utf8'}).then(()=>{alert('CSV saved to Downloads/bwatery_history.csv')}).catch(e=>{console.warn('Filesystem write failed:',e);fallbackExportCSV(csv)})}else{fallbackExportCSV(csv)}}
function fallbackExportCSV(csv){const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='bwatery_history.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)}
function exportFeedback(){if(db){db.collection('feedback').orderBy('timestamp','desc').get().then(snap=>{const items=[];snap.forEach(doc=>items.push(doc.data()));if(!items.length)return alert('No experiences to export');let csv='Name,Experience,Rating,Replies,Date\n';items.forEach(s=>{const replies=(s.replies||[]).map(r=>r.name+':'+r.text).join(' | ');csv+='"'+s.name.replace(/"/g,'""')+'","'+s.text.replace(/"/g,'""')+'",'+(s.rating||0)+',"'+replies.replace(/"/g,'""')+'",'+s.date+'\n'});downloadCsv(csv,'bwatery_feedback.csv')}).catch(()=>{exportFeedbackLocal()})}else{exportFeedbackLocal()}}
function exportFeedbackLocal(){let suggestions=[];try{suggestions=JSON.parse(localStorage.getItem('bwatery_suggestions')||'[]')}catch(e){}if(!suggestions.length)return alert('No experiences to export');let csv='Name,Experience,Rating,Replies,Date\n';suggestions.forEach(s=>{const replies=(s.replies||[]).map(r=>r.name+':'+r.text).join(' | ');csv+='"'+s.name.replace(/"/g,'""')+'","'+s.text.replace(/"/g,'""')+'",'+(s.rating||0)+',"'+replies.replace(/"/g,'""')+'",'+s.date+'\n'});downloadCsv(csv,'bwatery_feedback.csv')}
function downloadCsv(csv,filename){if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Filesystem){window.Capacitor.Plugins.Filesystem.writeFile({path:filename,data:csv,directory:'DOWNLOADS',encoding:'utf8'}).then(()=>{alert('CSV saved to Downloads/'+filename)}).catch(e=>{console.warn('Filesystem write failed:',e);fallbackDownloadCsv(csv,filename)})}else{fallbackDownloadCsv(csv,filename)}}
function fallbackDownloadCsv(csv,filename){const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url)}

function getHistoryData(){const data=[];for(let i=30;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=toDateStr(d);let intake=0,goal=state.dailyGoal;const s=localStorage.getItem('bwatery_day_'+ds);if(s)try{const p=JSON.parse(s);intake=p.intake||0;goal=p.goal||goal}catch(e){}if(ds===getToday())intake=state.currentIntake;data.push({date:ds,intake,goal,met:intake>=goal})}return data}
function getAllTimeData(){const data=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('bwatery_day_')){const ds=k.replace('bwatery_day_','');if(/^\d{4}-\d{2}-\d{2}$/.test(ds)){try{const p=JSON.parse(localStorage.getItem(k));const intake=p.intake||0;const goal=p.goal||state.dailyGoal;data.push({date:ds,intake: intake,goal: goal,met: intake>=goal})}catch(e){}}}}}catch(e){}return data.sort(function(a,b){return a.date.localeCompare(b.date)})}
function calcStreak(){const h=getHistoryData();let s=0;for(let i=h.length-1;i>=0;i--){if(h[i].met)s++;else break}return s}
function getGoalsMetCount(){return getAllTimeData().filter(d=>d.met).length}
function getTotalDaysWithIntake(){return getAllTimeData().filter(d=>d.intake>0).length}
function getTotalIntake(){return getAllTimeData().reduce((s,d)=>s+d.intake,0)}
function checkAchievements(){let u=[];try{u=JSON.parse(localStorage.getItem('bwatery_achievements')||'[]')}catch(e){}let n=false;ACHIEVEMENTS.forEach(a=>{if(!u.includes(a.id)&&a.check()){u.push(a.id);n=true}});try{localStorage.setItem('bwatery_achievements',JSON.stringify(u))}catch(e){}if(n){renderAchievements();saveUserData()}}
function renderAchievements(){const g=document.getElementById('achievementsGrid');if(!g)return;g.innerHTML='';let u=[];try{u=JSON.parse(localStorage.getItem('bwatery_achievements')||'[]')}catch(e){}ACHIEVEMENTS.forEach(a=>{const c=document.createElement('div');c.className='achievement-card '+(u.includes(a.id)?'unlocked':'locked');c.innerHTML='<div class="achievement-icon">'+a.icon+'</div><div class="achievement-name">'+a.name+'</div><div class="achievement-desc">'+a.desc+'</div>';g.appendChild(c)})}

let weatherRetries=0;
async function fetchWeather(){const badge=document.getElementById('tempBadge');if(!badge)return;try{const c=new AbortController();const t=setTimeout(()=>c.abort(),8000);const r=await fetch('https://api.open-meteo.com/v1/forecast?latitude=7.2083&longitude=79.8358&current_weather=true&timezone=auto',{signal:c.signal});clearTimeout(t);const data=await r.json();const temp=data.current_weather.temperature;badge.innerHTML='🌤 '+Math.round(temp)+'°C';weatherRetries=0;
  if(state.weatherBoost&&temp>30){if(!state._weatherBoosted){state.dailyGoal+=500;state._weatherBoosted=true;const g=document.getElementById('settingsGoal');if(g)g.value=(state.dailyGoal-500)/1000;saveToday();saveState();renderAll();saveUserData()}document.getElementById('weatherBanner').classList.add('show')}
  else{document.getElementById('weatherBanner').classList.remove('show');if(state._weatherBoosted){state.dailyGoal-=500;state._weatherBoosted=false;const g=document.getElementById('settingsGoal');if(g)g.value=state.dailyGoal/1000;if(state.currentIntake>state.dailyGoal)state.currentIntake=state.dailyGoal;saveToday();saveState();renderAll();saveUserData()}}}catch(e){if(weatherRetries<2){weatherRetries++;setTimeout(fetchWeather,3000)}else badge.innerHTML='🌤 --°C'}}
function toggleWeatherBoost(){state.weatherBoost=!state.weatherBoost;document.getElementById('weatherToggle').classList.toggle('on',state.weatherBoost);saveState();if(state._weatherBoosted){state.dailyGoal-=500;state._weatherBoosted=false;const g=document.getElementById('settingsGoal');if(g)g.value=state.dailyGoal/1000;if(state.currentIntake>state.dailyGoal)state.currentIntake=state.dailyGoal;saveToday();saveState();renderAll()}document.getElementById('weatherBanner').classList.remove('show');if(state.weatherBoost)fetchWeather();saveUserData()}

function toggleDarkMode(){state.darkMode=!state.darkMode;applyDarkMode();saveState();saveUserData()}
function applyDarkMode(){document.documentElement.classList.toggle('dark-mode',state.darkMode);const t=document.getElementById('darkToggle');if(t)t.classList.toggle('on',state.darkMode);setStatusBarColor()}
function setStatusBarColor(){try{if(window.Android){if(state.darkMode){Android.setStatusBarDark()}else{Android.setStatusBarLight()}}}catch(e){}}

function updateGoal(val){const n=Math.round(parseFloat(val)*1000);if(n>=500){state.dailyGoal=state._weatherBoosted?n+500:n;if(state.currentIntake>state.dailyGoal)state.currentIntake=state.dailyGoal;saveToday();saveState();renderAll();saveUserData()}}
function updateReminder(val){state.reminderInterval=parseInt(val);saveState();if(state.reminderTimer)clearInterval(state.reminderTimer);try{if(window.Android)Android.cancelReminder()}catch(e){}if(state.reminderInterval>0)startReminderTimer();saveUserData()}
function requestNotifyPermission(){if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()}
function startReminderTimer(){if(state.reminderTimer)clearInterval(state.reminderTimer);if(state.reminderMode==='off')return;requestNotifyPermission();try{if(window.Android){Android.scheduleReminder(state.reminderInterval,state.reminderMode)}}catch(e){}state.reminderTimer=setInterval(()=>{const pct=state.currentIntake/state.dailyGoal;const now=new Date();const h=now.getHours(),m=now.getMinutes();const currentTime=h*60+m;const [wH,wM]=(state.wakeTime||'07:00').split(':').map(Number);const [bH,bM]=(state.bedTime||'23:00').split(':').map(Number);const wakeMin=wH*60+wM;const bedMin=bH*60+bM;const isAwake=bedMin>wakeMin?(currentTime>=wakeMin&&currentTime<=bedMin):(currentTime>=wakeMin||currentTime<=bedMin);const exp=Math.min(.85,(currentTime/(24*60))*1.2);if(isAwake&&(pct<exp||state.remindAfterGoal)){if(state.reminderMode==='sound'||state.reminderMode==='soundOnly'){playWaterDrop();try{if(window.Android)Android.playNotifSound()}catch(e){}}if(state.reminderMode==='vibrate'||state.reminderMode==='sound'){try{if(window.Android)Android.vibrate(200);else if(navigator.vibrate)navigator.vibrate(200)}catch(e){}}const p=document.getElementById('reminderPopup');if(p&&!p.classList.contains('active'))p.classList.add('active');if(state.reminderMode!=='display'&&state.reminderMode!=='off'&&'Notification' in window&&Notification.permission==='granted')new Notification('💧 Time to Drink!',{body:'You\'re behind on your goal. ('+fmtL(state.currentIntake)+' / '+fmtL(state.dailyGoal)+')'})}},state.reminderInterval*60*1000)}
function dismissReminder(){const p=document.getElementById('reminderPopup');if(p)p.classList.remove('active')}

function setRating(n){try{localStorage.setItem('bwatery_rating',n)}catch(e){}document.querySelectorAll('.rate-star').forEach((s,i)=>s.classList.toggle('filled',i<n));const pct=Math.round(n/5*100);const t=document.getElementById('rateText');if(t){const msgs=['','We\'ll do better!','Not bad!','Good!','Great!','Amazing! \uD83C\uDF89'];t.textContent=msgs[n]||'Tap to rate — '+pct+'%'}const bar=document.getElementById('ratingBar');if(bar)bar.style.width=pct+'%';const pctEl=document.getElementById('ratingPct');if(pctEl)pctEl.textContent=pct+'%';saveUserData()}
function loadRating(){try{const r=parseInt(localStorage.getItem('bwatery_rating'));if(r>=1&&r<=5){document.querySelectorAll('.rate-star').forEach((s,i)=>s.classList.toggle('filled',i<r));const pct=Math.round(r/5*100);const t=document.getElementById('rateText');if(t){const msgs=['','We\'ll do better!','Not bad!','Good!','Great!','Amazing! \uD83C\uDF89'];t.textContent=msgs[r]||'Tap to rate'}const bar=document.getElementById('ratingBar');if(bar)bar.style.width=pct+'%';const pctEl=document.getElementById('ratingPct');if(pctEl)pctEl.textContent=pct+'%'}}catch(e){}}

let selectedSound=0;
function selectSound(n){selectedSound=n;try{localStorage.setItem('bwatery_sound',n)}catch(e){}document.querySelectorAll('.sound-item').forEach((s,i)=>s.classList.toggle('active',i===n))}
function loadSelectedSound(){try{const s=parseInt(localStorage.getItem('bwatery_sound'));if(s>=0&&s<=3){selectedSound=s;document.querySelectorAll('.sound-item').forEach((el,i)=>el.classList.toggle('active',i===s))}}catch(e){}}
function testSound(n){playSoundVariant(n)}
function playSoundVariant(v){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;let ctx=playSoundVariant._ctx;if(!ctx||ctx.state==='closed')ctx=new AC();if(ctx.state==='suspended')ctx.resume();playSoundVariant._ctx=ctx;const o=ctx.createOscillator();const gn=ctx.createGain();o.connect(gn);gn.connect(ctx.destination);const t=ctx.currentTime;if(v===0){o.type='sine';o.frequency.setValueAtTime(800,t);o.frequency.exponentialRampToValueAtTime(400,t+.15);gn.gain.setValueAtTime(.3,t);gn.gain.exponentialRampToValueAtTime(.001,t+.25);o.start(t);o.stop(t+.25)}else if(v===1){o.type='sine';o.frequency.setValueAtTime(1200,t);o.frequency.exponentialRampToValueAtTime(300,t+.2);gn.gain.setValueAtTime(.25,t);gn.gain.exponentialRampToValueAtTime(.001,t+.3);o.start(t);o.stop(t+.3)}else if(v===2){o.type='triangle';o.frequency.setValueAtTime(600,t);o.frequency.exponentialRampToValueAtTime(900,t+.08);o.frequency.exponentialRampToValueAtTime(500,t+.18);gn.gain.setValueAtTime(.3,t);gn.gain.exponentialRampToValueAtTime(.001,t+.22);o.start(t);o.stop(t+.22)}else{const o2=ctx.createOscillator();const g2=ctx.createGain();o.connect(gn);o2.connect(g2);gn.connect(ctx.destination);g2.connect(ctx.destination);o.type='sine';o2.type='sine';o.frequency.setValueAtTime(700,t);o.frequency.exponentialRampToValueAtTime(1100,t+.06);o.frequency.exponentialRampToValueAtTime(500,t+.2);o2.frequency.setValueAtTime(1400,t+.03);o2.frequency.exponentialRampToValueAtTime(600,t+.22);gn.gain.setValueAtTime(.2,t);gn.gain.exponentialRampToValueAtTime(.001,t+.22);g2.gain.setValueAtTime(.15,t+.03);g2.gain.exponentialRampToValueAtTime(.001,t+.24);o.start(t);o.stop(t+.25);o2.start(t+.03);o2.stop(t+.25)}}catch(e){}}
function playWaterDrop(){playSoundVariant(selectedSound)}
function toggleSound(){state.soundEnabled=!state.soundEnabled;document.getElementById('soundToggle').classList.toggle('on',state.soundEnabled);saveState()}
function updateReminderMode(val){state.reminderMode=val;saveState();if(state.reminderTimer){clearInterval(state.reminderTimer);try{if(window.Android)Android.cancelReminder()}catch(e){}if(state.reminderInterval>0)startReminderTimer()}saveUserData()}
function toggleRemindAfterGoal(){state.remindAfterGoal=!state.remindAfterGoal;document.getElementById('remindAfterGoalToggle').classList.toggle('on',state.remindAfterGoal);saveState();saveUserData()}
function updateWakeTime(val){state.wakeTime=val;saveState();saveUserData()}
function updateBedTime(val){state.bedTime=val;saveState();saveUserData()}
function updateUnit(val){state.unit=val;saveState();renderAll();fetchStats();saveUserData()}
function updateLanguage(val){state.language=val;saveState();saveUserData()}

function submitSuggestion(){const name=document.getElementById('suggestionName').value.trim();const comment=document.getElementById('suggestionComment').value.trim();if(!name)return alert('Please enter your name (required)');if(!comment)return alert('Please write your suggestion');const isTeam=name.toLowerCase()==='team';const isDev=(currentUser&&currentUser.email==='seminirathnayaka.yt@gmail.com');if(isTeam&&!isDev)return alert('The name "Team" is reserved for the developer.');const rating=parseInt(localStorage.getItem('bwatery_rating'))||0;const entry={name:name,text:comment,rating:rating,date:getToday(),timestamp:Date.now(),userId:currentUser?currentUser.uid:null,replies:[]};if(db){db.collection('feedback').add(entry).then(()=>{document.getElementById('suggestionName').value='';document.getElementById('suggestionComment').value='';renderUserComments();alert('Thank you for your feedback, '+name+'!')}).catch(e=>{console.error('Firestore write failed:',e);saveToLocal(entry);document.getElementById('suggestionName').value='';document.getElementById('suggestionComment').value='';renderUserComments();alert('Thank you for your feedback, '+name+'! (saved offline)')})}else{saveToLocal(entry);document.getElementById('suggestionName').value='';document.getElementById('suggestionComment').value='';renderUserComments();alert('Thank you for your feedback, '+name+'!')}}
function saveToLocal(entry){let suggestions=[];try{suggestions=JSON.parse(localStorage.getItem('bwatery_suggestions')||'[]')}catch(e){}suggestions.unshift(entry);if(suggestions.length>50)suggestions=suggestions.slice(0,50);try{localStorage.setItem('bwatery_suggestions',JSON.stringify(suggestions))}catch(e){}}
function renderStarsHTML(rating){if(!rating||rating<1)return'';let h='';for(let i=1;i<=5;i++)h+='<span style="color:'+(i<=rating?'var(--warning)':'#DDD')+';font-size:12px">★</span>';return h+' <span style="font-size:11px;color:var(--text-muted)">('+Math.round(rating/5*100)+'%)</span>'}
function formatMentions(text){return text.replace(/@(\w[\w\s]*)/g,'<span style="color:var(--primary);font-weight:600">@$1</span>')}
function isDev(){return currentUser&&currentUser.email==='seminirathnayaka.yt@gmail.com'}
function getRecentNames(){if(!db)return Promise.resolve([]);return db.collection('feedback').orderBy('timestamp','desc').limit(100).get().then(snap=>{const names=new Set();snap.forEach(doc=>{const d=doc.data();if(d.name)names.add(d.name)});return[...names]}).catch(()=>[])}
function toggleReplyForm(fid){document.querySelectorAll('.reply-form').forEach(f=>{if(f.dataset.for===fid)f.style.display=f.style.display==='none'?'flex':'none';else f.style.display='none'})}
function handleMentionInput(e,fid){const val=e.target.value;const drop=document.getElementById('mentionDrop-'+fid);if(!drop)return;const atMatch=val.match(/@(\w*)$/);if(atMatch&&atMatch[1].length>0){const q=atMatch[1].toLowerCase();getRecentNames().then(names=>{const filtered=names.filter(n=>n.toLowerCase().startsWith(q)&&n!==(state.userName||''));if(filtered.length){drop.innerHTML='';filtered.slice(0,5).forEach(n=>{const opt=document.createElement('div');opt.className='mention-option';opt.textContent='@'+n;opt.onclick=()=>{e.target.value=val.replace(/@\w*$/,'@'+n+' ');drop.style.display='none'};drop.appendChild(opt)});drop.style.display='block'}else{drop.style.display='none'}})}else{drop.style.display='none'}}
function handleReplyKey(e,fid){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitReply(fid)}}
function submitReply(fid){const input=document.getElementById('replyInput-'+fid);if(!input)return;const text=input.trim?input.value.trim():'';if(!text)return;const name=isDev()?'Team':(state.userName||'Anonymous');const reply={name:name,text:text,date:getToday(),timestamp:Date.now()};if(db){db.collection('feedback').doc(fid).update({replies:firebase.firestore.FieldValue.arrayUnion(reply)}).then(()=>{input.value='';document.getElementById('replyForm-'+fid).style.display='none';renderUserComments()}).catch(e=>console.error('Reply failed:',e))}else{let s=[];try{s=JSON.parse(localStorage.getItem('bwatery_suggestions')||'[]')}catch(e){}const item=s.find(x=>String(x.timestamp)===String(fid));if(item){if(!item.replies)item.replies=[];item.replies.push(reply);localStorage.setItem('bwatery_suggestions',JSON.stringify(s));input.value='';document.getElementById('replyForm-'+fid).style.display='none';renderUserComments()}}}
let commentsExpanded=false;
function toggleExpandComments(){commentsExpanded=!commentsExpanded;renderUserComments()}
function renderCommentItem(s){const ratingHTML=s.rating?'<div style="margin-top:4px">'+renderStarsHTML(s.rating)+'</div>':'';const nameColor=s.name==='Team'?'color:var(--success);font-weight:700':'';let repliesHTML='';if(s.replies&&s.replies.length){repliesHTML='<div class="comment-replies">';s.replies.forEach(r=>{const rn=r.name==='Team'?'color:var(--success);font-weight:700':'';repliesHTML+='<div class="comment-reply"><span class="comment-name" style="'+rn+'">'+escHtml(r.name)+'</span><span class="comment-text">'+formatMentions(escHtml(r.text))+'</span><span class="comment-date">'+escHtml(r.date||'')+'</span></div>'});repliesHTML+='</div>'}const replyBtn=isDev()?'<div class="comment-actions"><button class="comment-reply-btn" onclick="toggleReplyForm(\''+escHtml(s.id||s.timestamp)+'\')">↩ Reply</button></div>':'';return'<div class="user-comment-item"><div class="comment-header"><span class="comment-name" style="'+nameColor+'">'+escHtml(s.name)+'</span><span class="comment-date">'+escHtml(s.date||'')+'</span></div><span class="comment-text">'+formatMentions(escHtml(s.text))+'</span>'+ratingHTML+replyBtn+'<div class="reply-form" id="replyForm-'+escHtml(s.id||s.timestamp)+'" data-for="'+escHtml(s.id||s.timestamp)+'" style="display:none"><input type="text" class="reply-input" id="replyInput-'+escHtml(s.id||s.timestamp)+'" placeholder="Reply... Use @ to mention" oninput="handleMentionInput(event,\''+escHtml(s.id||s.timestamp)+'\')" onkeydown="handleReplyKey(event,\''+escHtml(s.id||s.timestamp)+'\')"><div class="mention-dropdown" id="mentionDrop-'+escHtml(s.id||s.timestamp)+'" style="display:none"></div><button class="reply-submit-btn" onclick="submitReply(\''+escHtml(s.id||s.timestamp)+'\')">Send</button></div>'+repliesHTML+'</div>'}
function renderUserComments(){const inner=document.getElementById('userCommentsInner');const btn=document.getElementById('expandCommentsBtn');if(!inner)return;if(db){db.collection('feedback').orderBy('timestamp','desc').limit(50).onSnapshot(snap=>{const items=[];snap.forEach(doc=>items.push({id:doc.id,...doc.data()}));if(!items.length){inner.innerHTML='<div class="user-comments-empty">No experiences yet. Be the first to share!</div>';if(btn)btn.style.display='none';return}const shown=commentsExpanded?items:items.slice(0,2);inner.innerHTML='';shown.forEach(s=>{inner.innerHTML+=renderCommentItem(s)});if(btn){if(items.length>2){btn.textContent=commentsExpanded?'Show less':'Show all '+items.length+' experiences';btn.style.display='block'}else{btn.style.display='none'}}},()=>{renderUserCommentsLocal(inner)})}else{renderUserCommentsLocal(inner)}}
function renderUserCommentsLocal(inner){let suggestions=[];try{suggestions=JSON.parse(localStorage.getItem('bwatery_suggestions')||'[]')}catch(e){}const btn=document.getElementById('expandCommentsBtn');if(!suggestions.length){inner.innerHTML='<div class="user-comments-empty">No experiences yet. Be the first to share!</div>';if(btn)btn.style.display='none';return}const shown=commentsExpanded?suggestions:suggestions.slice(0,2);inner.innerHTML='';shown.forEach(s=>{inner.innerHTML+=renderCommentItem(s)});if(btn){if(suggestions.length>2){btn.textContent=commentsExpanded?'Show less':'Show all '+suggestions.length+' experiences';btn.style.display='block'}else{btn.style.display='none'}}}
function deleteFeedback(id){if(!confirm('Delete this experience?'))return;if(db){db.collection('feedback').doc(id).delete().catch(e=>console.error('Delete failed:',e))}else{deleteFeedbackLocal(0)}}
function deleteFeedbackLocal(idx){if(!confirm('Delete this experience?'))return;let s=[];try{s=JSON.parse(localStorage.getItem('bwatery_suggestions')||'[]')}catch(e){}s.splice(idx,1);localStorage.setItem('bwatery_suggestions',JSON.stringify(s));renderUserComments()}
function editFeedback(id,name,text){const newText=prompt('Edit experience:',text);if(newText===null||newText.trim()==='')return;if(db){db.collection('feedback').doc(id).update({text:newText.trim()}).catch(e=>console.error('Update failed:',e))}}
function editFeedbackLocal(idx){let s=[];try{s=JSON.parse(localStorage.getItem('bwatery_suggestions')||'[]')}catch(e){}const newText=prompt('Edit experience:',s[idx].text);if(newText===null||newText.trim()==='')return;s[idx].text=newText.trim();localStorage.setItem('bwatery_suggestions',JSON.stringify(s));renderUserComments()}

function renderUserGreeting(){const avatar=document.getElementById('userAvatar');const text=document.getElementById('greetingText');const sub=document.getElementById('greetingSub');if(!avatar||!text||!sub)return;const name=state.userName||'User';const initial=name.charAt(0).toUpperCase();avatar.textContent=initial;const h=new Date().getHours();const greeting=h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening';text.textContent=greeting+', '+name+'!';sub.textContent='You\'ve had '+getTotalDaysWithIntake()+' hydrated days'}

function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

function renderCalendar(){
  const cal=document.getElementById('calendarGrid');
  if(!cal)return;
  cal.innerHTML='';
  const now=new Date();
  const year=now.getFullYear();
  const month=now.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const today=now.getDate();
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const header=document.getElementById('calendarMonth');
  if(header)header.textContent=monthNames[month]+' '+year;
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  dayNames.forEach(d=>{const el=document.createElement('div');el.style.cssText='font-size:11px;font-weight:600;color:var(--text-secondary);text-align:center;padding:4px 0';el.textContent=d;cal.appendChild(el)});
  for(let i=0;i<firstDay;i++){const el=document.createElement('div');cal.appendChild(el)}
  for(let d=1;d<=daysInMonth;d++){
    const el=document.createElement('div');
    const dateStr=year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    let met=false,hasData=false;
    const stored=localStorage.getItem('bwatery_day_'+dateStr);
    if(stored){try{const p=JSON.parse(stored);if(p.intake>0){hasData=true;met=p.intake>=p.goal}}catch(e){}}
    if(dateStr===getToday()){hasData=true;met=state.currentIntake>=state.dailyGoal}
    let bg='transparent',color='var(--text)',border='none';
    if(d===today){border='2px solid var(--primary)'}
    if(hasData&&met){bg='rgba(0,184,148,.2)';color='var(--success)'}
    else if(hasData&&!met){bg='rgba(255,107,107,.15)';color='var(--danger)'}
    el.style.cssText='width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;font-weight:500;background:'+bg+';color:'+color+';border:'+border;
    el.textContent=d;
    cal.appendChild(el);
  }
}

let currentSlide=0;
const totalSlides=4;
function showSlide(n){
  const slides=document.querySelectorAll('.onboard-slide');
  const dots=document.querySelectorAll('.onboard-dot');
  const btn=document.getElementById('onboardBtn');
  slides.forEach((s,i)=>{
    s.classList.remove('active','exit-left');
    if(i===n)s.classList.add('active');
    else if(i<n)s.classList.add('exit-left');
  });
  dots.forEach((d,i)=>d.classList.toggle('active',i===n));
  if(btn)btn.textContent=n===totalSlides-1?'Get Started':'Next';
}
function nextSlide(){
  if(currentSlide<totalSlides-1){currentSlide++;showSlide(currentSlide)}
  else dismissWelcome();
}
function showWelcomeScreen(){
  if(localStorage.getItem('bwatery_welcomed'))return false;
  const screen=document.getElementById('screen-welcome');
  if(screen){screen.classList.add('active');currentSlide=0;showSlide(0);return true}
  return false;
}
function dismissWelcome(){
  try{localStorage.setItem('bwatery_welcomed','1')}catch(e){}
  hideAllScreens();
  init();
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeAddModal();dismissReminder()}});
window.addEventListener('load',function(){setTimeout(setStatusBarColor,300)});
document.addEventListener('DOMContentLoaded',function(){
  setTimeout(()=>{document.getElementById('splash').classList.add('hide');setTimeout(()=>{document.getElementById('splash').style.display='none'},600)},2000);
  if(!showWelcomeScreen())init();
});