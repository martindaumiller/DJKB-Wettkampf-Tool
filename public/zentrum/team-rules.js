
export function ageOnEvent(person,date='2026-10-24'){
  if(!person.birth)return Number.isInteger(person.ageOnEvent)?person.ageOnEvent:NaN;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(person.birth))return NaN;
  const parsed=new Date(person.birth+'T12:00:00Z');
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==person.birth||person.birth>date)return NaN;
  const [y,m,d]=person.birth.split('-').map(Number),[ey,em,ed]=date.split('-').map(Number);
  return ey-y-(em<m||em===m&&ed<d?1:0);
}
export function teamMemberIssues(person,group,date='2026-10-24'){
  if(!person||!group)return ['Person oder Teamgruppe fehlt'];
  const issues=[],age=ageOnEvent(person,date);
  if(!Number.isInteger(age)||age<0)issues.push('Geburtsdatum ungültig');
  else if(age>group.maxAge)issues.push('Zu alt für diese Teamgruppe');
  const kyu=person.kyu;
  if(!Number.isInteger(kyu)||kyu<0||kyu>8)issues.push('Graduierung ungültig');
  else if(kyu<group.maxKyu)issues.push('Zu hoch graduiert für diese Teamgruppe');
  if(!['w','m'].includes(person.gender)||group.gender!=='x'&&person.gender!==group.gender)issues.push('Geschlecht passt nicht zur Teamgruppe');
  if(person.blocked)issues.push('Person zurückgezogen oder gesperrt');
  if(!person.birthVerified&&(age<5||age<8&&kyu===0))issues.push('Geburtsdatum / Grad muss von der Leitung geprüft werden');
  return issues;
}
