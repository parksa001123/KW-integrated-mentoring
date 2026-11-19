function api(b) {
 const lock=LockService.getScriptLock();
 try {
  if(b.route==='/api/auth'&&b.method==='POST')return rpc(b);
  lock.waitLock(10000);
  const p=PropertiesService.getScriptProperties(),u=session_(b.token),admin=u&&u.role==='admin',revision=Number(p.getProperty('REVISION')||0);
  const state={mentors:rows_('mentors'),programs:rows_('programs'),applications:rows_('applications'),activities:rows_('activities'),logs:rows_('audit')};
  const checkAdmin=()=>assert(admin,'관리자 권한이 필요합니다.');
  const user=u?{name:u.name,email:u.email||'center-admin@local.invalid',studentId:u.studentId||'',kind:u.role}:null;
  const assigned=u?rows_('users').find(x=>x.email===u.email):null,staff=assigned&&assigned.role==='staff';
  if(b.route==='/api/auth')return {ok:true,user:user,admin:!!admin,emailConfigured:true,schoolDomain:'ikw.ac.kr'};
  if(b.route==='/api/state'){
   const applications=state.applications.filter(a=>admin||(u&&a.email===u.email)||(staff&&a.assignedDepartment===assigned.department));
   return {ok:true,user:user,role:admin?'admin':staff?'staff':'student',department:staff?assigned.department:'',revision:revision,initialized:true,mentors:state.mentors.filter(m=>admin||m.published).map(m=>{const x=Object.assign({},m);if(!admin)['phone','note','rawConnection'].forEach(k=>delete x[k]);return x;}),programs:state.programs.filter(x=>admin||x.status!=='非公開'),applications:applications,activities:state.activities.filter(x=>admin||applications.some(a=>a.id===x.applicationId)),backups:admin?rows_('backupHistory').slice(-100).reverse():[],backupCounts:[],users:admin?rows_('users'):[],logs:admin?state.logs:[],driveConfigured:true,universityReport:null,departments:[...new Set(state.mentors.map(m=>m.department))].sort(),totalMentors:state.mentors.filter(m=>admin||m.published).length};
  }
  if(b.route==='/api/care'){
   if(b.method==='GET'){checkAdmin();return {ok:true,data:rows_('careApplications')};}
   if(b.action==='updateStatus'){checkAdmin();const a=rows_('careApplications').find(x=>x.requestId===b.requestId);assert(a,'접수가 없습니다.');a.applicationStatus=clean(b.applicationStatus);put_('careApplications',a.requestId,a);}
   else{assert(u&&u.role==='student','학생 인증이 필요합니다.');assert(/^CARE-[a-zA-Z0-9-]+$/.test(b.requestId||''),'접수번호를 확인하세요.');const old=rows_('careApplications').find(x=>x.requestId===b.requestId);if(old){assert(old.email===u.email,'접수번호가 중복됩니다.');return {ok:true,sheetSynced:true};}const a={requestId:b.requestId,name:u.name,sid:u.studentId,email:u.email,submittedAt:new Date().toISOString(),applicationStatus:'신청접수'};['college','department','phone','academicStatus','originalText','care','priority','mentorCandidates','followupQA'].forEach(k=>a[k]=clean(b[k],15000));assert(a.originalText&&a.priority,'고민과 지원 영역을 입력하세요.');put_('careApplications',a.requestId,a);}
   return {ok:true,sheetSynced:true,backup:fullBackup_()};
  }
  assert(b.route==='/api/action'&&u,'로그인 후 이용하세요.');
  if(b.action==='backupDownload'){checkAdmin();return {schemaVersion:2,state:state,revision:revision,careApplications:rows_('careApplications'),users:rows_('users')};}
  if(['createBackup','retryBackup','connectDriveRelay'].includes(b.action)){checkAdmin();return {ok:true,backup:fullBackup_()};}
  if(b.action==='previewImport'){checkAdmin();return {ok:true,summary:importPlan(state,b.rows,b.mode).summary};}
  assert(b.revision===revision,'자료가 변경되었습니다. 새로고침 후 다시 시도하세요.');
  let table,id,record;
  if(b.action==='apply'){
   assert(u.role==='student'&&b.form&&b.form.consent===true,'학생 인증과 개인정보 동의가 필요합니다.');const f=b.form;
   ['department','phone','goals','schedule'].forEach(k=>assert(clean(f[k]),'필수 항목을 입력하세요.'));
   assert(clean(f.goals).length>=10&&/^[0-9+() -]{9,20}$/.test(clean(f.phone)),'신청 목적과 연락처를 확인하세요.');
   const target=(f.type==='mentor'?state.mentors:f.type==='program'?state.programs:[]).find(x=>x.id===f.targetId&&(f.type==='mentor'?x.published&&x.availability!=='어려움':!['모집마감','완료','非公開'].includes(x.status)));
   assert(target,'신청할 수 있는 대상이 없습니다.');assert(!state.applications.some(a=>a.email===u.email&&a.targetId===target.id&&!['취소','완료'].includes(a.status)),'이미 진행 중인 신청이 있습니다.');
   id='A-'+Utilities.getUuid();table='applications';const at=new Date().toISOString();record={id:id,userId:'school:'+u.email,email:u.email,studentName:u.name,studentId:u.studentId,targetId:target.id,targetName:target.name||target.title,type:f.type,status:'센터 접수',assignedDepartment:'',createdAt:at,events:[{at:at,status:'센터 접수',note:'접수 완료'}]};['department','year','phone','format','goals','schedule'].forEach(k=>record[k]=clean(f[k],3000));
  }else if(b.action==='updateApplication'){
   table='applications';id=b.id;record=state.applications.find(x=>x.id===id);assert(record,'접수가 없습니다.');assert(admin||(staff&&record.assignedDepartment===assigned.department)||(record.email===u.email&&b.status==='취소'&&!['완료','취소'].includes(record.status)),'변경 권한이 없습니다.');assert(['센터 접수','학과 전달','학과 검토','일정 조율','매칭 확정','진행 중','완료','보완 요청','취소'].includes(b.status),'상태를 확인하세요.');if(admin&&b.department)record.assignedDepartment=clean(b.department);if(b.status==='학과 전달')assert(record.assignedDepartment,'학과를 선택하세요.');record.status=b.status;record.events.push({at:new Date().toISOString(),status:b.status,note:clean(b.note,1000)});
  }else if(b.action==='saveActivity'){
   const v=b.activity,a=state.applications.find(x=>x.id===v.applicationId);assert(a&&(admin||(staff&&a.assignedDepartment===assigned.department)),'활동 관리 권한이 없습니다.');assert(/^\d{4}-\d{2}-\d{2}$/.test(v.date)&&clean(v.content)&&Number(v.participants)>0&&Number(v.hours)>0,'활동 내용과 날짜·인원·시간을 확인하세요.');table='activities';id=v.id||'ACT-'+Utilities.getUuid();record=Object.assign({},v,{id:id,department:a.assignedDepartment||a.department,mentorId:a.type==='mentor'?a.targetId:clean(v.mentorId),programId:a.type==='program'?a.targetId:'',participants:Math.min(10000,Number(v.participants)),hours:Math.min(1000,Number(v.hours)),satisfaction:v.satisfaction===''||v.satisfaction==null?null:Number(v.satisfaction)});assert(record.satisfaction===null||(record.satisfaction>=1&&record.satisfaction<=5),'만족도는 1~5점입니다.');
  }else{
   checkAdmin();
   if(b.action==='saveMentor'){table='mentors';const old=state.mentors.find(x=>x.id===b.mentor.id);id=old?old.id:'M-'+Utilities.getUuid();record=mentorInput(Object.assign({},b.mentor,{id:id}),old||{});}
   else if(b.action==='saveProgram'){table='programs';record=Object.assign({},b.program);assert(clean(record.title)&&clean(record.department),'프로그램명과 학과를 입력하세요.');id=record.id||'P-'+Utilities.getUuid();record.id=id;}
   else if(b.action==='saveUser'){assert(/^[^\s@]+@ikw\.ac\.kr$/.test(b.email)&&['staff','student'].includes(b.role),'학교 이메일과 역할을 확인하세요.');table='users';id=b.email.toLowerCase();record={id:id,email:id,role:b.role,department:clean(b.department)};}
   else if(b.action==='import'){const plan=importPlan(state,b.rows,b.mode);assert(!plan.summary.errors.length,'CSV 오류를 수정하세요.');plan.mentors.forEach(m=>put_('mentors',m.id,m));}
   else if(b.action!=='initialize')throw new Error('지원하지 않는 작업입니다.');
  }
  if(table)put_(table,id,record);const auditId=Utilities.getUuid();put_('audit',auditId,{id:auditId,at:new Date().toISOString(),action:b.action,by:u.email||'센터 관리자'});p.setProperty('REVISION',String(revision+1));return {ok:true,revision:revision+1,backup:fullBackup_()};
 }catch(e){return {ok:false,error:e.message};}finally{if(lock.hasLock())lock.releaseLock();}
}
function fullBackup_(){const id=Utilities.getUuid(),created=new Date().toISOString();try{const url=backup_();put_('backupHistory',id,{id:id,created:created,status:'success',drive_url:url,message:'Drive 저장 완료'});return {status:'success'};}catch(e){put_('backupHistory',id,{id:id,created:created,status:'failed',message:e.message});return {status:'failed',message:e.message};}}
