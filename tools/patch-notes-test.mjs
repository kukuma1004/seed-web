import assert from 'node:assert/strict';
import {PATCH_NOTES,NOTES_KEY,latestNoteId,readSeenNote,markNotesSeen,hasUnseenNotes,noteCount} from '../src/patch-notes.js';

const memory=()=>{const d=new Map();return {getItem:k=>d.has(k)?d.get(k):null,setItem:(k,v)=>d.set(k,String(v)),d};};

// 소식은 최신이 맨 위, 날짜와 같은 날의 짧은 개정 id는 겹치지 않고, 빈 글이 없다.
assert.ok(noteCount()>=3);
const ids=PATCH_NOTES.map(n=>n.id);
assert.equal(new Set(ids).size,ids.length,'같은 날짜가 두 번 오지 않는다');
assert.deepEqual([...ids].sort().reverse(),ids,'최신 소식이 맨 위');
assert.equal(latestNoteId,ids[0]);
for(const note of PATCH_NOTES){
 assert.match(note.id,/^\d{4}-\d{2}-\d{2}(?:-[a-z0-9]+)*$/,`${note.id} 날짜 형식`);
 assert.ok(note.date&&note.title.length>=3,`${note.id} 제목`);
 assert.ok(Array.isArray(note.lines)&&note.lines.length>=1,`${note.id} 내용`);
 for(const line of note.lines){
  assert.ok(line.length>=8,`${note.id} 너무 짧은 줄`);
  assert.ok(line.length<=120,`${note.id} 너무 긴 줄: ${line.slice(0,20)}…`);
  assert.ok(!/<|>/.test(line),'소식에는 태그를 넣지 않는다');
 }
}

// 읽음 표시: 처음 온 사람에게는 점을 띄우지 않고, 한 번 읽으면 사라진다.
{
 const s=memory();
 assert.equal(readSeenNote(s),'');
 assert.equal(hasUnseenNotes(s,{firstVisit:true}),false,'처음 오는 사람에게는 점이 없다');
 assert.equal(hasUnseenNotes(s),true,'하던 사람에게는 새 소식 점');
 assert.ok(markNotesSeen(s));
 assert.equal(readSeenNote(s),latestNoteId);
 assert.equal(hasUnseenNotes(s),false,'읽으면 점이 사라진다');
 markNotesSeen(s,'2026-09-14');
 assert.equal(hasUnseenNotes(s),true,'더 새로운 소식이 오면 다시 점이 붙는다');
 const broken={getItem(){throw new Error('막힘');},setItem(){throw new Error('막힘');}};
 assert.equal(readSeenNote(broken),'');assert.equal(markNotesSeen(broken),false);
 assert.equal(hasUnseenNotes(broken),true);
 assert.equal(readSeenNote(null),'');
}

console.log('새 소식: 순서·형식·읽음 표시 통과');
