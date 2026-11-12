import {beforeEach,afterEach,expect,test} from 'bun:test';
import {Database} from 'bun:sqlite';
import {AttendanceService,AttendanceError} from '../src/services/attendance.service';
let db:Database,service:AttendanceService;
const teacher={userId:1,role:'teacher'},other={userId:2,role:'teacher'},admin={userId:3,role:'operator'};
beforeEach(()=>{db=new Database(':memory:');db.run(`
 CREATE TABLE users(id INTEGER PRIMARY KEY,role TEXT,is_active INTEGER);
 INSERT INTO users VALUES(1,'teacher',1),(2,'teacher',1),(3,'operator',1),(4,'student',1),(5,'student',1);
 CREATE TABLE academic_sessions(id INTEGER PRIMARY KEY,is_active INTEGER);INSERT INTO academic_sessions VALUES(1,1),(2,0);
 CREATE TABLE academic_terms(id INTEGER PRIMARY KEY,session_id INTEGER,is_active INTEGER);INSERT INTO academic_terms VALUES(1,1,1),(2,2,0);
 CREATE TABLE classes(id INTEGER PRIMARY KEY,class_teacher_id INTEGER);INSERT INTO classes VALUES(1,1),(2,2);
 CREATE TABLE class_enrollments(student_id INTEGER,class_id INTEGER);INSERT INTO class_enrollments VALUES(4,1),(5,2);
 CREATE TABLE attendance_records(student_id INTEGER,term_id INTEGER,session_id INTEGER,date TEXT,status TEXT,remarks TEXT,marked_by INTEGER,UNIQUE(student_id,term_id,date));
 `);service=new AttendanceService(db);});
afterEach(()=>db.close());
const input=(records:any[]=[{student_id:4,status:'present'}])=>({class_id:1,date:'2026-11-10',records});
function denied(fn:()=>unknown,status:number){try{fn();throw new Error('Expected rejection');}catch(e){expect(e).toBeInstanceOf(AttendanceError);expect((e as AttendanceError).status).toBe(status);}}
test('only the assigned class teacher or admin can write a class register',()=>{denied(()=>service.save(other,input()),403);denied(()=>service.save({userId:4,role:'teacher'},input()),403);service.save(teacher,input());service.save(admin,input([{student_id:4,status:'late'}]));expect((db.query('SELECT * FROM attendance_records').get() as any).status).toBe('late');});
test('validates the whole class batch before saving any row',()=>{denied(()=>service.save(teacher,input([{student_id:4,status:'present'},{student_id:5,status:'absent'}])),403);expect((db.query('SELECT COUNT(*) n FROM attendance_records').get() as any).n).toBe(0);});
test('rejects invalid dates, statuses, repeated students and wrong academic periods',()=>{denied(()=>service.save(teacher,{...input(),date:'2026-02-30'}),400);denied(()=>service.save(teacher,input([{student_id:4,status:'invented'}])),400);denied(()=>service.save(teacher,input([{student_id:4,status:'present'},{student_id:4,status:'present'}])),400);denied(()=>service.save(teacher,{...input(),term_id:2,session_id:2}),409);});
test('individual attendance reads and writes enforce class ownership',()=>{denied(()=>service.canReadStudent(other,4),403);denied(()=>service.save(other,{date:'2026-11-10',status:'present'},4),403);service.save(teacher,{date:'2026-11-10',status:'present'},4);expect((db.query('SELECT COUNT(*) n FROM attendance_records').get() as any).n).toBe(1);});
