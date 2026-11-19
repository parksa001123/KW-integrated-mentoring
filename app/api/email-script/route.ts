import {getSiteUser,manager} from '../../../lib/site-auth';
export const dynamic='force-dynamic';
export async function GET(){if((await manager(await getSiteUser()))?.role!=='admin')return new Response('관리자 로그인이 필요합니다.',{status:403});const script=`// 1. Apps Script 프로젝트 설정 > 스크립트 속성에 RELAY_SECRET(32자 이상) 설정
// 2. 웹 앱으로 배포: 실행 사용자=나, 액세스=모든 사용자
// 3. 사이트 센터 관리 > 이메일 인증 설정에 배포 URL과 동일한 연결키 입력
function doPost(e){
  try{
    const p=JSON.parse(e.postData.contents||'{}');
    const key=PropertiesService.getScriptProperties().getProperty('RELAY_SECRET');
    if(!key||key.length<32||p.secret!==key)throw new Error('Unauthorized');
    if(!/^[a-z0-9._%+-]+@ikw\\.ac\\.kr$/.test(p.email)||!/^\\d{6}$/.test(p.code))throw new Error('Invalid request');
    const lock=LockService.getScriptLock();lock.waitLock(10000);
    try{const cache=CacheService.getScriptCache();const slot='mail:'+p.email;if(cache.get(slot))throw new Error('Try later');
    if(MailApp.getRemainingDailyQuota()<1)throw new Error('Daily quota exceeded');
    MailApp.sendEmail({to:p.email,subject:'[KW CARE] 학교 이메일 인증번호',body:'학교 이메일 인증번호는 '+p.code+' 입니다. 10분 이내에 입력해주세요. 본인이 요청하지 않았다면 무시해주세요. 학번·이름은 학생 입력정보이며 학적 명부 대조는 별도입니다.'});cache.put(slot,'1',60);}finally{lock.releaseLock();}
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){return ContentService.createTextOutput(JSON.stringify({ok:false})).setMimeType(ContentService.MimeType.JSON);}
}`;return new Response(script,{headers:{'Content-Type':'text/plain;charset=utf-8','Content-Disposition':'attachment; filename="KW-email-verification.gs"','Cache-Control':'no-store'}});}
