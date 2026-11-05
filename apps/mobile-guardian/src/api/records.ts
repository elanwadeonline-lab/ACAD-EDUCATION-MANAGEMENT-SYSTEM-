export type Invoice={id:number;title:string;amount:number;due_date?:string;paid:number;balance:number;status:'paid'|'partial'|'pending'};
export type Payment={id:number;fee_id:number;amount_paid:number;status:string;fee_title?:string;payment_ref:string;paid_at:string;method?:string};
export function finite(value:unknown):number|null{return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;}
export function feeLedger(payload:{structures?:any[];payments?:Payment[]}){
  const payments=Array.isArray(payload.payments)?payload.payments:[];
  const invoices:Invoice[]=(payload.structures||[]).map(f=>{
    const amount=Math.max(0,finite(f.amount)||0);
    const paid=payments.filter(p=>Number(p.fee_id)===Number(f.id)&&p.status==='completed').reduce((s,p)=>s+Math.max(0,finite(p.amount_paid)||0),0);
    const balance=Math.max(0,amount-paid);
    return {...f,id:Number(f.id),title:f.title||'School fee',amount,paid,balance,status:balance===0?'paid':paid>0?'partial':'pending'};
  });
  return {invoices,payments,total:invoices.reduce((s,f)=>s+f.amount,0),balance:invoices.reduce((s,f)=>s+f.balance,0),paid:invoices.reduce((s,f)=>s+Math.min(f.paid,f.amount),0)};
}
export function monthlyAttendance(records:Array<{date:string;status:string}>){
  const months=new Map<string,{present:number;total:number}>();
  for(const row of records){if(!/^\d{4}-\d{2}-\d{2}/.test(row.date))continue;const key=row.date.slice(0,7),m=months.get(key)||{present:0,total:0};m.total++;if(row.status==='present')m.present++;months.set(key,m);}
  return [...months].sort(([a],[b])=>a.localeCompare(b)).map(([key,m])=>({key,month:new Date(key+'-15T12:00:00Z').toLocaleString('en-GB',{month:'short'}),percentage:Math.round(m.present/m.total*100)}));
}
export function calendarCells(year:number,month:number){const offset=(new Date(year,month,1).getDay()+6)%7;const days=new Date(year,month+1,0).getDate();return [...Array(offset).fill(null),...Array.from({length:days},(_,i)=>i+1)];}
export function localDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export const money=(value:number)=>'₦'+value.toLocaleString('en-NG',{maximumFractionDigits:0});
