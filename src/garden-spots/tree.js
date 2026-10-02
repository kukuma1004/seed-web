// Coordinates follow the original 1536×1024 scene. Shared stage sprites avoid
// six duplicate texture sets; each legend retains its own flowering silhouette.
const plot=(id,name,box,at)=>Object.freeze({id:String(id),name,box:Object.freeze(box),at:Object.freeze(at)});
export default Object.freeze({size:Object.freeze([1536,1024]),spots:Object.freeze([
 plot(0,'가운데 큰 화단',[565,190,988,500],[770,442]),
 plot(1,'왼쪽 위 화단',[108,250,370,430],[240,396]),
 plot(2,'왼쪽 가운데 화단',[225,335,495,520],[360,485]),
 plot(3,'왼쪽 아래 화단',[170,440,450,650],[305,602]),
 plot(4,'오른쪽 위 화단',[1175,250,1437,435],[1305,396]),
 plot(5,'오른쪽 가운데 화단',[1050,335,1320,530],[1190,490]),
 plot(6,'오른쪽 아래 화단',[1105,440,1385,650],[1255,608]),
])});
