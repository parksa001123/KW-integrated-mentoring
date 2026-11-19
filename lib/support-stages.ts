import type {Mentor} from './types';
export const supportStages=[
 {id:'탐색',title:'탐색',description:'자기이해·전공·직업세계 알아보기',koi:'Find',role:'Navigator',formats:['1:다수','특강','현장탐방']},
 {id:'설계',title:'설계',description:'목표 직무·기관 선택과 계획 수립',koi:'Choice',role:'Navigator',formats:['소그룹','1:1']},
 {id:'준비·실행',title:'준비·실행',description:'학습·직무역량·프로젝트·포트폴리오',koi:'Route',role:'Role',formats:['1:1','소그룹','프로젝트','현장탐방']},
 {id:'진출',title:'진출',description:'취업 준비·실습·인턴·채용 연계',koi:'Match',role:'Bridge',formats:['1:1','현장탐방']},
 {id:'적응·환류',title:'적응·환류',description:'대학생활·취업 후 적응과 후속 지원',koi:'Landing',role:'Bridge',formats:['1:1','소그룹']}
];
export function mentorStages(m:Mentor):{stages:string[],confirmed:boolean}{
 if(m.supportStages?.length)return {stages:m.supportStages,confirmed:true};
 const h=m.historicalModels||[],f=m.formats||[];const stages=new Set<string>();
 if(h.includes('Career360')||f.includes('1:다수')||f.includes('특강'))stages.add('탐색');
 if(h.includes('Focusing'))stages.add('설계');
 if(h.includes('Job Shadow')){stages.add('탐색');stages.add('준비·실행')}
 if(m.field==='학업')stages.add('준비·실행');
 if(m.field==='대학생활·적응')stages.add('적응·환류');
 if(f.includes('1:1')||f.includes('소그룹'))stages.add('설계');
 return {stages:[...stages],confirmed:false};
}
