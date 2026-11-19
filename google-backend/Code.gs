// Deploy as a separate Apps Script project, executing as the owner.
function setupStorage() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('DATA_SHEET_ID')) {
    const book = SpreadsheetApp.create('KW integrated mentoring');
    p.setProperty('DATA_SHEET_ID', book.getId());
  }
  const book = SpreadsheetApp.openById(p.getProperty('DATA_SHEET_ID'));
  ['mentors','programs','applications','activities','sessions','challenges','audit','users','careApplications','backupHistory'].forEach(name => {
    if (!book.getSheetByName(name)) book.insertSheet(name).appendRow(['id','json']);
  });
  if (!p.getProperty('BACKUP_FOLDER_ID')) p.setProperty('BACKUP_FOLDER_ID', DriveApp.createFolder('KW integrated mentoring backups').getId());
}
function hash_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value).map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}
function sheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');
  if (!id) throw new Error('저장소 초기 설정이 필요합니다.');
  return SpreadsheetApp.openById(id).getSheetByName(name);
}
function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  return values.slice(1).filter(row => row[0]).map(row => JSON.parse(row[1]));
}
function put_(name, id, value) {
  const sheet = sheet_(name), values = sheet.getDataRange().getValues();
  const index = values.findIndex((row,i) => i>0 && row[0]===id);
  const cells = [id, JSON.stringify(value)];
  if (cells[1].length > 45000) throw new Error('입력 자료가 너무 큽니다.');
  if (index<0) sheet.appendRow(cells); else sheet.getRange(index+1,1,1,2).setValues([cells]);
}
function session_(token) {
  if (!token) return null;
  return rows_('sessions').find(row => row.id===hash_(token) && row.expires>Date.now()) || null;
}
function login_(user) {
  const token=Utilities.getUuid()+Utilities.getUuid();
  const record=Object.assign({},user,{id:hash_(token),expires:Date.now()+8*3600000});
  put_('sessions',record.id,record);
  return {ok:true,token:token,user:user};
}
function limit_(key, max, seconds) {
  const cache=CacheService.getScriptCache(), id=hash_(key), count=Number(cache.get(id)||0);
  if(count>=max) throw new Error('요청이 많습니다. 잠시 후 다시 시도하세요.');
  cache.put(id,String(count+1),seconds);
}
function backup_() {
  const p=PropertiesService.getScriptProperties(), data={exportedAt:new Date().toISOString()};
  ['mentors','programs','applications','activities','audit','careApplications','users'].forEach(name=>data[name]=rows_(name));
  const file=DriveApp.getFolderById(p.getProperty('BACKUP_FOLDER_ID')).createFile('KW-'+Date.now()+'.json',JSON.stringify(data),MimeType.PLAIN_TEXT);
  return file.getUrl();
}
// Call only through google.script.run from an Apps Script HTML page.
function rpc(body) {
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const p=PropertiesService.getScriptProperties(), action=body.action, user=session_(body.token);
    if(action==='requestCode') {
      const email=String(body.email||'').trim().toLowerCase();
      if(!/^[a-z0-9._%+-]+@ikw\.ac\.kr$/.test(email) || !/^\d{6,15}$/.test(String(body.studentId)) || String(body.name||'').trim().length<2) throw new Error('학교 이메일, 이름과 학번을 확인하세요.');
      limit_('mail:'+email,1,60); limit_('mail-total',60,3600);
      if(MailApp.getRemainingDailyQuota()<1) throw new Error('오늘 메일 발송 한도에 도달했습니다.');
      const id=Utilities.getUuid(), code=String(parseInt(hash_(Utilities.getUuid()).slice(0,8),16)%1000000).padStart(6,'0');
      put_('challenges',id,{id:id,email:email,name:String(body.name).trim(),studentId:String(body.studentId),hash:hash_(id+code),attempts:0,expires:Date.now()+600000});
      MailApp.sendEmail(email,'[KW CARE] 학교 이메일 인증번호','인증번호 '+code+'\n10분 이내에 입력하세요.');
      return {ok:true,challengeId:id};
    }
    if(action==='verifyCode') {
      const c=rows_('challenges').find(row=>row.id===body.challengeId);
      if(!c||c.expires<Date.now()||c.attempts>=5) throw new Error('인증번호를 다시 발급받으세요.');
      c.attempts++; put_('challenges',c.id,c);
      if(hash_(c.id+String(body.code))!==c.hash) throw new Error('인증번호가 일치하지 않습니다.');
      c.expires=0; put_('challenges',c.id,c);
      return login_({role:'student',email:c.email,name:c.name,studentId:c.studentId});
    }
    if(action==='adminLogin') {
      limit_('admin-login',10,900);
      const salt=p.getProperty('ADMIN_SALT'), expected=p.getProperty('ADMIN_HASH');
      if(!salt||!expected||hash_(salt+String(body.password||''))!==expected) throw new Error('관리자 인증 설정 또는 비밀번호를 확인하세요.');
      return login_({role:'admin',name:'센터 관리자'});
    }
    if(action==='logout') { if(user){user.expires=0;put_('sessions',user.id,user);} return {ok:true}; }
    if(action==='state') {
      const admin=user&&user.role==='admin';
      return {ok:true,user:user?{role:user.role,name:user.name,email:user.email,studentId:user.studentId}:null,
        mentors:rows_('mentors').filter(m=>admin||m.published).map(m=>{if(admin)return m;const copy=Object.assign({},m);['phone','note','rawConnection'].forEach(k=>delete copy[k]);return copy;}),
        programs:rows_('programs').filter(v=>admin||v.status!=='非公開'),
        applications:rows_('applications').filter(v=>admin||(user&&v.email===user.email)),
        activities:admin?rows_('activities'):[]};
    }
    if(!user) throw new Error('로그인 후 이용하세요.');
    if(action==='apply') {
      if(user.role!=='student'||body.consent!==true) throw new Error('학생 인증과 개인정보 이용 동의가 필요합니다.');
      const type=body.type==='mentor'?'mentors':body.type==='program'?'programs':null;
      if(!type) throw new Error('신청 종류를 확인하세요.');
      const target=rows_(type).find(v=>v.id===body.targetId && (type==='mentors'?v.published&&v.availability!=='어려움':!['모집마감','완료','非公開'].includes(v.status)));
      if(!target) throw new Error('현재 신청할 수 없는 대상입니다.');
      if(rows_('applications').some(v=>v.email===user.email&&v.targetId===target.id&&!['완료','취소'].includes(v.status))) throw new Error('진행 중인 신청이 있습니다.');
      if(String(body.goals||'').trim().length<10) throw new Error('신청 목적을 10자 이상 작성하세요.');
      const id=Utilities.getUuid();
      put_('applications',id,{id:id,email:user.email,studentName:user.name,studentId:user.studentId,type:body.type,targetId:target.id,targetName:target.name||target.title,goals:String(body.goals).slice(0,3000),status:'센터 접수',createdAt:new Date().toISOString()});
    } else {
      if(user.role!=='admin') throw new Error('관리자 권한이 필요합니다.');
      if(action==='backup') return {ok:true,url:backup_()};
      const tables={saveMentor:'mentors',saveProgram:'programs',saveActivity:'activities',updateApplication:'applications'};
      const table=tables[action]; if(!table) throw new Error('지원하지 않는 작업입니다.');
      const record=Object.assign({},body.record), id=String(record.id||Utilities.getUuid());
      if(table==='applications'&&!rows_(table).some(v=>v.id===id)) throw new Error('신청을 찾을 수 없습니다.');
      record.id=id;record.updatedAt=new Date().toISOString(); put_(table,id,record);
    }
    const auditId=Utilities.getUuid();put_('audit',auditId,{id:auditId,action:action,at:new Date().toISOString()});
    try{return {ok:true,backupUrl:backup_()};}catch(error){return {ok:true,backupPending:true,message:'자료 저장 완료. Drive 백업 재시도가 필요합니다.'};}
  }catch(error){return {ok:false,error:error.message};}finally{if(lock.hasLock())lock.releaseLock();}
}
function doGet() {
  return HtmlService.createHtmlOutputFromFile('FullIndex').setTitle('KW 통합 멘토링').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function migrateLatestBackup_() {
  if(Session.getActiveUser().getEmail().toLowerCase()!=='parksa001123@gmail.com')throw new Error('프로젝트 소유자 실행이 필요합니다.');
  if(rows_('mentors').length)throw new Error('새 명단이 이미 있어 자동 이관을 중단했습니다.');
  const folders=DriveApp.getFoldersByName('KW_CARE_멘토링_자동백업');
  let latest=null;
  while(folders.hasNext()) {const files=folders.next().getFiles();while(files.hasNext()){const f=files.next();if(f.getName().endsWith('.zip')&&(!latest||f.getLastUpdated()>latest.getLastUpdated()))latest=f;}}
  if(!latest)throw new Error('기존 Drive ZIP 백업을 찾지 못했습니다.');
  const parts=Utilities.unzip(latest.getBlob()),part=parts.find(x=>x.getName()==='전체_복구데이터.json');
  if(!part)throw new Error('기존 백업에 전체 복구 JSON이 없습니다.');
  const payload=JSON.parse(part.getDataAsString('UTF-8')),state=payload.state;
  if(!state||!Array.isArray(state.mentors)||!Array.isArray(state.programs))throw new Error('백업 형식을 확인하세요.');
  ['mentors','programs','applications','activities'].forEach(table=>(state[table]||[]).forEach(row=>put_(table,row.id,row)));
  (payload.careApplications||[]).forEach(row=>put_('careApplications',row.requestId||row.id,row));
  (payload.users||[]).forEach(row=>put_('users',row.email,row));
  PropertiesService.getScriptProperties().setProperty('REVISION',String(payload.revision||0));
  console.log(JSON.stringify({mentors:state.mentors.length,programs:state.programs.length,applications:(state.applications||[]).length,source:latest.getName()}));
}
function migrateBackup(){migrateLatestBackup_();}
