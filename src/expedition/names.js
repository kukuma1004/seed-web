import {isBadName} from '../name-filter.js';

export const EXPEDITION_NAME_LIMIT = 16;
export function validateExpeditionName(value) {
 if(typeof value!=='string'||value.length>160||/[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u.test(value))return {ok:false,reason:'보이지 않는 문자나 줄바꿈은 이름에 쓸 수 없어요.'};
 const name=value.normalize('NFC').trim().replace(/\s+/gu,' ');
 if([...name].length>EXPEDITION_NAME_LIMIT)return {ok:false,reason:'이름은 16자까지 지을 수 있어요.'};
 if(isBadName(name))return {ok:false,reason:'다른 이름을 지어 주세요.'};
 return {ok:true,name};
}
