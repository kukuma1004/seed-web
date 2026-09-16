import assert from 'node:assert/strict';
import {isBadName,shownName,HIDDEN_NAME} from '../src/name-filter.js';
import {saveName,lastName,rankingTable,NAME_KEY} from '../src/score.js';

// 나쁜 말, 그리고 띄어쓰기·숫자·기호·영문 숫자 바꿔쓰기로 피해 가는 경우
for(const name of ['시발','씨 발','시1발','씨@발','ㅅㅂ','병신짱','찐따쉑','노랑섹사고싶다','섹스박사','일이삼사오육덕수','수호발닦개도윤',
 '장애준','정시파이터운지정','꼬3cm강시현','강시현3cm','앙 기모딱딱','게이','sexybody','F.u.c.k','fvck','sh1t','b!tch'])
 assert.equal(isBadName(name),true,`걸러야 함: ${name}`);

// 괜찮은 별명 — 나쁜 말이 우연히 들어 있어도 막지 않는다
for(const name of ['게이머','게이지충전','졸라맨','성기사','호로록','장애물달리기','야스오장인','새끼고양이','운지법연습','젖소우유',
 '종필쌤잘생김','제육먹는제욱','ㅁㄹ','ㅎㅈ','도현짱@짱123','zi존강림','kingkong','Defrost','1004','.','치즈퐁듀','혀 깨문 독사'])
 assert.equal(isBadName(name),false,`막으면 안 됨: ${name}`);

assert.equal(isBadName(''),false);assert.equal(isBadName(null),false);
assert.equal(shownName('찐따쉑'),HIDDEN_NAME);assert.equal(shownName('항상초심'),'항상초심');

// 저장: 나쁜 별명은 저장하지 않고, 예전에 저장된 나쁜 별명은 없는 것으로 읽는다(다시 고르게).
{
 const d=new Map(),storage={getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v))};
 assert.equal(saveName(storage,'항상초심'),'항상초심');assert.equal(lastName(storage),'항상초심');
 assert.equal(saveName(storage,'찐따쉑'),'','나쁜 별명은 저장하지 않는다');
 assert.equal(lastName(storage),'항상초심','저장돼 있던 좋은 별명은 그대로');
 d.set(NAME_KEY,'노랑섹사고싶다');
 assert.equal(lastName(storage),'','예전에 저장된 나쁜 별명은 다시 고르게 한다');
}

// 랭킹 표: 이미 올라온 나쁜 별명은 익명으로 가린다(점수·순위는 그대로).
{
 const board=[{name:'찐따쉑',score:900,cycle:1,stage:2,kills:40},{name:'항상초심',score:800,cycle:1,stage:1,kills:30}];
 const html=rankingTable(board);
 assert.ok(!html.includes('찐따'),'나쁜 별명이 표에 보이지 않는다');
 assert.ok(html.includes(HIDDEN_NAME)&&html.includes('항상초심'));
 assert.ok(html.includes('900'),'점수는 그대로 보인다');
}

console.log('별명 거르기: 욕설·피해 가기·괜찮은 낱말·저장·랭킹 가리기 통과');
