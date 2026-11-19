function doPost(e) {
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    const key = PropertiesService.getScriptProperties().getProperty('RELAY_SECRET');
    if (!key || key.length < 32 || (b.secret || b.token) !== key) throw new Error('Unauthorized');
    if (b.payload && b.id) return json_(backup_(b));
    if (!/^[a-z0-9._%+-]+@ikw\.ac\.kr$/.test(b.email) || !/^\d{6}$/.test(b.code)) throw new Error('Invalid email');
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const cache = CacheService.getScriptCache(), slot = 'mail:' + b.email;
      if (cache.get(slot)) throw new Error('Try later');
      if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily quota exceeded');
      MailApp.sendEmail({to:b.email, subject:'[KW CARE] 학교 이메일 인증번호', body:'학교 이메일 인증번호는 '+b.code+' 입니다. 10분 이내에 입력해주세요. 본인이 요청하지 않았다면 무시해주세요.'});
      cache.put(slot,'1',60);
    } finally { lock.releaseLock(); }
    return json_({ok:true});
  } catch(err) { return json_({ok:false,error:String(err)}); }
}
function json_(b) { return ContentService.createTextOutput(JSON.stringify(b)).setMimeType(ContentService.MimeType.JSON); }
function drive_(path,method,data,type) {
  const options={method:method||'get',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true};
  if(data!==undefined){options.payload=type==='application/zip'?data:(typeof data==='string'?data:JSON.stringify(data));options.contentType=type||'application/json';}
  const r=UrlFetchApp.fetch('https://www.googleapis.com/'+path,options),status=r.getResponseCode();
  if(status<200||status>=300)throw new Error('Drive '+status);
  return JSON.parse(r.getContentText()||'{}');
}
function csv_(rows) {
  if(!rows.length)return '\uFEFF데이터 없음\r\n';
  const labels={id:'ID',name:'성명',department:'학과',college:'단과대학',organization:'소속기관',category:'분류',position:'직위',phone:'연락처',expertise:'전문분야',description:'설명',availability:'참여가능여부',connection:'연계현황',alumni:'동문여부',field:'지원분야',formats:'운영방식',title:'프로그램명',business:'소관사업',model:'운영모델',stage:'성장단계',status:'상태',capacity:'모집인원',date:'운영일자',location:'장소',studentName:'학생명',studentId:'학번',email:'이메일',year:'학년',targetName:'신청대상',type:'신청구분',format:'운영방식',goals:'신청목적',schedule:'희망일정',assignedDepartment:'배정학과',participants:'참여인원',hours:'운영시간',content:'활동내용',outcome:'성과와후속조치',satisfaction:'만족도',createdAt:'등록시각',sid:'학번',originalText:'자유서술',care:'CARE영역',priority:'우선지원',applicationStatus:'처리상태',submittedAt:'신청시각'};
  const keys=Array.from(new Set(rows.reduce((a,r)=>a.concat(Object.keys(r)),[])));
  function cell(v){let s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  return '\uFEFF'+[keys.map(k=>cell(labels[k]||k)).join(',')].concat(rows.map(r=>keys.map(k=>cell(r[k])).join(','))).join('\r\n');
}
function backup_(b) {
  if(!/^[a-zA-Z0-9-]{10,80}$/.test(b.id)||!b.payload||!b.payload.state)throw new Error('Invalid backup');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    const props=PropertiesService.getScriptProperties();let folder=props.getProperty('KW_BACKUP_FOLDER_ID');
    if(!folder){folder=drive_('drive/v3/files','post',{name:'KW_CARE_멘토링_자동백업',mimeType:'application/vnd.google-apps.folder'}).id;props.setProperty('KW_BACKUP_FOLDER_ID',folder);}
    const name='KW_CARE_r'+(b.payload.revision||0)+'_'+b.id+'.zip';
    const q="'"+folder+"' in parents and name = '"+name+"' and trashed = false";
    const found=drive_('drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id,name,appProperties)').files||[];
    if(found.length&&found[0].appProperties&&found[0].appProperties.kwBackupComplete==='true'&&found[0].appProperties.kwBackupFormat==='zip-v2')return {ok:true,id:b.id,url:'https://drive.google.com/file/d/'+found[0].id+'/view',folderUrl:'https://drive.google.com/drive/folders/'+folder};
    const p=b.payload,s=p.state,summary=p.summary||{mentors:(s.mentors||[]).length,programs:(s.programs||[]).length,applications:(s.applications||[]).length,activities:(s.activities||[]).length};
    const summaryLabels={exportedAt:'백업시각',mentors:'등록멘토',availableMentors:'참여가능멘토',departments:'참여학과',programs:'프로그램수',applications:'멘토링신청수',careApplications:'CARE신청수',activities:'활동기록수',participantSessions:'누적참여인원',activityHours:'누적운영시간',meanSatisfaction:'평균만족도'};
    const parts=[Utilities.newBlob(JSON.stringify(p,null,2),'application/json','전체_복구데이터.json')];
    [['멘토풀',s.mentors||[]],['프로그램',s.programs||[]],['멘토링신청',s.applications||[]],['활동운영실적',s.activities||[]],['CARE신청',p.careApplications||[]],['담당자권한',p.users||[]],['운영현황',Object.keys(summary).map(k=>({'항목':summaryLabels[k]||k,'값':summary[k]}))]].forEach(x=>parts.push(Utilities.newBlob(csv_(x[1]),'text/csv',x[0]+'.csv')));
    parts.push(Utilities.newBlob('KW CARE 운영자료 백업\n저장 시점의 전체 JSON과 항목별 CSV입니다. 운영현황은 누적 집계이며 참여인원은 중복 참여를 포함합니다. 만족도는 기록별 단순평균입니다. CSV는 열람용이며 원본 값은 JSON에 보존됩니다. 로그인 비밀번호·인증번호·연결키는 포함하지 않습니다.','text/plain','읽어주세요.txt'));
    const zip=Utilities.zip(parts,name),meta=found.length?found[0]:drive_('drive/v3/files','post',{name:name,parents:[folder],mimeType:'application/zip'});
    drive_('upload/drive/v3/files/'+meta.id+'?uploadType=media','patch',zip.getBytes(),'application/zip');
    drive_('drive/v3/files/'+meta.id,'patch',{appProperties:{kwBackupComplete:'true',kwBackupFormat:'zip-v2'}});
    return {ok:true,id:b.id,url:'https://drive.google.com/file/d/'+meta.id+'/view',folderUrl:'https://drive.google.com/drive/folders/'+folder};
  } finally {lock.releaseLock();}
}

function authorizeBackup() { ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL); }
function repairBackupFiles() {
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const folder=PropertiesService.getScriptProperties().getProperty('KW_BACKUP_FOLDER_ID');
  if(!folder)throw new Error('Backup folder not found');
  const q="'"+folder+"' in parents and trashed = false";
  const files=drive_('drive/v3/files?q='+encodeURIComponent(q)+'&pageSize=1000&fields=files(id,name)').files||[];
  let repaired=0,checked=0;
  files.forEach(f=>{
    if(!f.name.endsWith('.zip'))return;
    const res=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/'+f.id+'?alt=media',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()}});
    let bytes=res.getContent();
    if(bytes[0]!==80||bytes[1]!==75){bytes=JSON.parse(res.getContentText());if(!Array.isArray(bytes)||bytes[0]!==80||bytes[1]!==75)throw new Error('Invalid ZIP bytes');Utilities.unzip(Utilities.newBlob(bytes,'application/zip',f.name));drive_('upload/drive/v3/files/'+f.id+'?uploadType=media','patch',bytes,'application/zip');repaired++;}
    else Utilities.unzip(Utilities.newBlob(bytes,'application/zip',f.name));
    drive_('drive/v3/files/'+f.id,'patch',{appProperties:{kwBackupComplete:'true',kwBackupFormat:'zip-v2'}});checked++;
  });
  console.log(JSON.stringify({checked:checked,repaired:repaired,folderUrl:'https://drive.google.com/drive/folders/'+folder}));
}
