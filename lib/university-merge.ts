type ImportRow = Record<'sourceId'|'name'|'department'|'college'|'originalDepartment'|'organization'|'position'|'phone'|'expertise'|'description'|'historicalModel', string>;
const additions: ImportRow[] = [];
import type {AppState,Mentor} from './types';
const norm=(s:string)=>s.toLowerCase().replace(/주식회사|\(주\)|㈜|[^a-z0-9가-힣]/g,'');
const digits=(s:string)=>s.replace(/\D/g,'');
export function universityMerge(state:AppState){
 const mentors=state.mentors.map(m=>({...m}));let added=0,matched=0,already=0;const review:any[]=[];
 for(const r of additions){
  const linked=mentors.find(m=>(m as any).sourceIds?.includes(r.sourceId));if(linked){already++;continue}
  const same=mentors.filter(m=>norm(m.name)===norm(r.name));
  const exact=same.filter(m=>(digits(r.phone).length>=9&&digits(m.phone||'')===digits(r.phone))||norm(m.organization)===norm(r.organization));
  if(exact.length===1){const m:any=exact[0];m.sourceIds=[...(m.sourceIds||[]),r.sourceId];m.historicalModels=[...new Set([...(m.historicalModels||[]),r.historicalModel])];matched++;continue;}
  if(same.length){review.push({sourceId:r.sourceId,name:r.name,organization:r.organization,originalDepartment:r.originalDepartment,reason:exact.length>1?'일치 후보 여러 명':'동명이인·소속 변경 확인 필요',candidateIds:same.map(m=>m.id)});continue}
  const m:Mentor={id:'XLS-'+r.sourceId,name:r.name,college:r.college,department:r.department,organization:r.organization,position:r.position,phone:r.phone,expertise:r.expertise,description:r.description||'기존 멘토 DB 등록 이력. 현재 활동 내용은 확인 후 안내합니다.',category:'산업체 전문가',availability:'확인 필요',connection:'기존 DB',alumni:'확인 필요',field:'직무·취업',fieldReviewed:false,formats:[],formatConfirmed:false,published:false,note:'MENTO_LIST.xls 등록 이력: '+r.historicalModel+' / 원 학과: '+r.originalDepartment+' / 활성은 DB 상태이며 현재 참여 의사와 다릅니다. 공개·활동 조건 재확인 필요.',source:'MENTO_LIST.xls',updatedAt:new Date().toISOString(),sourceIds:[r.sourceId],historicalModels:[r.historicalModel],originalDepartment:r.originalDepartment};mentors.push(m);added++;
 }
 return {mentors,report:{source:'MENTO_LIST.xls',sourceRows:additions.length,added,matched,already,review,generatedAt:new Date().toISOString()}};
}
export const referencePrograms=[
 ['REF-REAL360','REAL 4.0 · Career360','C','진로','1:다수','대학혁신지원사업','REAL 4.0','탐색','다양한 기업·직무 현장전문가의 경험을 통해 폭넓게 전공과 직업을 탐색합니다. 기존 운영자료에 제시된 모델이며 이번 학기 모집·일정·멘토는 별도 확정이 필요합니다.'],
 ['REF-FOCUS','REAL 4.0 · Focusing','C','직무·취업','1:1','대학혁신지원사업','REAL 4.0','설계','관심 전공과 직무를 매칭하여 업무 특성을 집중 탐색합니다. 일반학과에도 적용할 수 있으며 FIRST 참여를 전제하지 않습니다.'],
 ['REF-SHADOW','REAL 4.0 · Job Shadow','C','직무·취업','현장탐방','대학혁신지원사업','REAL 4.0','준비·실행','현장 직무 동행·관찰을 통해 업무 흐름을 이해합니다. 기관 수용·안전·보험·직무별 자격 조건 확인 후 운영합니다.'],
 ['REF-AFTER','REAL 4.0 · After-Mentoring','C','진로','1:1','대학혁신지원사업','REAL 4.0','적응·환류','지도교수·학생의 사제동행 후속 멘토링과 사례공유를 연결합니다. Career360·Focusing·Job Shadow 참여 후 연계할 수 있습니다.'],
 ['REF-RECOVERY','CARE · 일상회복 멘토링','R','대학생활·적응','1:1','센터 자체','CARE 지원','적응·환류','정서 회복 지원 운영안. AI는 성찰·정보 안내를 보조하며 전문 상담·위기 판단은 학생상담센터 등 담당 전문인력이 수행합니다.'],
 ['REF-ACADEMIC','CARE · 학습전략 성장 크루','A','학업','소그룹','센터 자체','CARE 지원','준비·실행','교수학습지원과 연계한 학습전략·전공 적응 지원 운영안. 학습컨설턴트·교수·학습 동료를 수요에 맞춰 연결합니다.'],
 ['REF-ENGAGE','CARE · 대학생활 적응·소속 멘토링','E','대학생활·적응','소그룹','센터 자체','CARE 지원','탐색','신입생·유학생 등 대학생활 적응과 관계 형성을 돕는 운영안. 관련 부서·학과와 담당 멘토 및 일정을 확인합니다.']
].map(v=>({id:v[0],title:v[1],careDomain:v[2],field:v[3],format:v[4],business:v[5],model:v[6],stage:v[7],description:v[8],department:'전체 학과',status:'운영안',capacity:0,date:'운영부서 확인 후 확정',location:'추후 안내',mentorIds:[],source:'제공된 기존 멘토링 운영자료 / 현재 모집 공고 아님'}));
