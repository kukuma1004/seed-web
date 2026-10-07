// Private candidates are reachable only from a localhost inspection session.
// This does not open public characters or enable account/ranking writes.
export function isDuelCandidateLab({hostname='',search=''}={}){
 if(!['127.0.0.1','localhost'].includes(hostname))return false;
 const params=new URLSearchParams(search),batch=params.get('duelCandidates');
 return params.has('inspect')&&/^\d{2}$/.test(batch||'')&&Number(batch)>=8&&Number(batch)<=67;
}
