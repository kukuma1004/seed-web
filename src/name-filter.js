// 별명 거르기. 아이들이 보는 랭킹이라 욕설·성적인 말·남을 깎아내리는 말이 든 별명은
// 새로 쓸 수 없게 막고, 이미 올라온 것은 '익명'으로 가려 보여 준다(기록 자체는 지우지 않는다).
// 띄어쓰기·숫자·기호를 끼워 넣어 피해 가는 경우가 많아서, 그것들을 뺀 글자로 찾는다.
export const HIDDEN_NAME='익명';

// 괜찮은 낱말 안에 나쁜 말이 우연히 들어 있는 경우(게이머, 졸라맨, 성기사 …). 검사 전에 지운다.
const SAFE=['게이머','게이밍','게이트','게이지','졸라맨','성기사','호로록','장애물','야스오','새끼고양이','새끼강아지','새끼손가락',
 '보지마','보지말','자지마','자지말','젖소','쉑쉑','호모사피엔스','운지법','어미새','기모바지'];

const KOREAN=[
 // 욕설
 '시발','씨발','씨바','시바','싸발','씨팔','시팔','씹새','씹창','씹할','씹덕','병신','븅신','빙신','병싄','좆','존나','졸라','지랄',
 '개새','개색','개세끼','새끼','쉑','닥쳐','미친','미췬','또라이','등신','찐따','호로새','호로자','후레자','느금','느검','니애미','애미','애비',
 '니미럴','어미','엠창','앰창','염병','옘병','썅','걸레','창녀','창년','운지',
 // 성적인 말
 '섹','야동','보지','자지','잠지','꼬추','딸딸이','딸치','딸쳐','자위','발기','정액','성기','거유','빈유','육덕','빨통','젖',
 '야스','떡치','붕가','변태','팬티','강간','성폭행','성추행','몸캠','딕','꼬삼','기모','발딱',
 // 깎아내리는 말·혐오
 '게이','레즈','호모','한남','한녀','김치녀','된장녀','틀딱','맘충','급식충','짱깨','쪽바리','깜둥','흑형','애자','장애',
 '발닦개','꼴초',
 // 해치는 말
 '자살','뒤져','뒈져','살인',
 // 초성으로 쓴 욕
 'ㅅㅂ','ㅆㅂ','ㅄ','ㅂㅅ','ㅈㄹ','ㅈㄴ','ㅁㅊ','ㄴㄱㅁ','ㅗㅗ'
];
const LATIN=['fuck','fuk','fck','fvck','phuck','fuq','shit','bitch','btch','sex','porn','dick','pussy','penis','vagina','boob','nigg','fag','rape','whore','slut','cunt','asshole','kys','gay'];
const LEET={'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a','$':'s','!':'i'};

function strip(text){
 let out=String(text??'').normalize('NFC').toLowerCase();
 for(const safe of SAFE)out=out.split(safe).join('');
 return out;
}
export function isBadName(name){
 const base=strip(name);
 if(!base)return false;
 const korean=base.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣ]/g,'');
 if(KOREAN.some(word=>korean.includes(word)))return true;
 // 친구 몸을 놀리는 크기 장난(꼬3, 3cm)
 if(/꼬\s*\d|\d\s*(cm|센치|센티)/.test(base))return true;
 const latin=[...base].map(c=>LEET[c]??c).join('').replace(/[^a-z]/g,'');
 return LATIN.some(word=>latin.includes(word));
}
// 랭킹 표에 보일 이름. 나쁜 별명은 가린다.
export function shownName(name){return isBadName(name)?HIDDEN_NAME:name;}
