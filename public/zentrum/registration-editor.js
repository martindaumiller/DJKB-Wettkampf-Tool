const norm=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().filter(k=>!['received_at','age_on_event'].includes(k)).map(k=>[k,stable(value[k])])):value;
export function matchingPeople(people,item){return people.filter(p=>norm(p.dojo)===norm(item.dojo)&&norm(p.first)===norm(item.raw?.first)&&norm(p.last)===norm(item.raw?.last));}
export async function registrationPersonId(dojo,raw){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(stable({kind:'person',dojo:norm(dojo),raw}))));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
// Correct every copy of a deduplicated submission without touching other entrants.
export function replaceRegistrationPerson(payload,item,updated){const copy=structuredClone(payload),records=Array.isArray(copy)?copy:copy.records||[{data:copy}],signature=JSON.stringify(stable(item.raw));let count=0;
 for(const record of records){const data=record?.data||record;if(norm(data?.dojo)!==norm(item.dojo)||!Array.isArray(data.participants))continue;data.participants=data.participants.map(p=>{if(JSON.stringify(stable(p))!==signature)return p;count++;return structuredClone(updated);});}
 if(!count)throw Error('Meldung nicht mehr in der Vorschau. Bitte erneut prüfen.');return copy;
}
