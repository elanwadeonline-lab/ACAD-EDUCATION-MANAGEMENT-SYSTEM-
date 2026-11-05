import {expect,test} from 'bun:test';
import {feeLedger,monthlyAttendance,calendarCells,finite} from '../apps/mobile-guardian/src/api/records';
import {publishedScorePercent} from '../src/utils/published-score';

test('native fee ledger allocates partial payments and excludes failed or unrelated-period payments',()=>{
  const record=feeLedger({structures:[{id:1,title:'Tuition',amount:50000},{id:2,title:'Library',amount:10000}],payments:[
    {id:1,fee_id:1,amount_paid:20000,status:'completed',payment_ref:'ONE',paid_at:'2026-11-01'},
    {id:2,fee_id:1,amount_paid:30000,status:'pending',payment_ref:'TWO',paid_at:'2026-11-01'},
    {id:3,fee_id:99,amount_paid:90000,status:'completed',payment_ref:'OTHER_TERM',paid_at:'2026-01-01'},
  ]});
  expect(record.total).toBe(60000);expect(record.balance).toBe(40000);expect(record.invoices[0]?.status).toBe('partial');expect(record.paid).toBe(20000);
});
test('a recorded payment cannot settle a different invoice or make the balance negative',()=>{
  const record=feeLedger({structures:[{id:1,title:'Tuition',amount:1000}],payments:[{id:1,fee_id:1,amount_paid:1500,status:'completed',payment_ref:'OVER',paid_at:'2026-11-01'}]});
  expect(record.balance).toBe(0);expect(record.paid).toBe(1000);expect(record.invoices[0]?.status).toBe('paid');
});
test('attendance chart contains only actual recorded months and preserves cross-year ordering',()=>{
  expect(monthlyAttendance([{date:'2026-12-01',status:'present'},{date:'2027-01-04',status:'absent'},{date:'2027-01-05',status:'present'}])).toMatchObject([{key:'2026-12',percentage:100},{key:'2027-01',percentage:50}]);
  expect(monthlyAttendance([])).toEqual([]);
});
test('calendar uses Monday-first cells, leap-year dates and no fabricated metric fallback',()=>{
  const feb=calendarCells(2028,1);expect(feb[0]).toBeNull();expect(feb[1]).toBe(1);expect(feb.at(-1)).toBe(29);
  expect(finite(undefined)).toBeNull();expect(finite('')).toBeNull();expect(finite(0)).toBe(0);
});
test('guardian summaries display the awarded mark rather than the maximum mark',()=>{
  expect(publishedScorePercent({score:43,total_score:50})).toBe(86);
  expect(publishedScorePercent({score:0,total_score:100})).toBe(0);
  expect(publishedScorePercent({score:25,total_score:0})).toBe(0);
});
