// Temporary character access is a view session, never a permanent story unlock.
export function createDuelTrial({order,characters}){
 const roster=Object.freeze(order.filter(id=>characters[id]&&!characters[id].inspectionOnly));
 const allowed=new Set(roster);
 let active=false,closed=false,generation=0;
 return {
  roster,
  get active(){return active&&!closed;},
  enter(){if(closed)return;active=true;generation++;},
  leave(){active=false;generation++;},
  close(){closed=true;active=false;generation++;},
  selectable(id,unlocked=false){return !closed&&(active?allowed.has(id):unlocked);},
  token(){return generation;},
  canRecord(token=generation){return !closed&&!active&&token===generation;},
 };
}
