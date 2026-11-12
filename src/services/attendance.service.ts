import type {Database} from 'bun:sqlite';
export class AttendanceError extends Error {
  constructor(public status:number,message:string){super(message);}
}
type Actor={userId:number;role:string};
export class AttendanceService {
  constructor(private db:Database){}
  private staff(actor:Actor){
    const user=this.db.query('SELECT role,is_active FROM users WHERE id=?').get(actor.userId) as any;
    if(!user||!user.is_active||user.role!==actor.role||!['teacher','operator'].includes(actor.role))throw new AttendanceError(403,'School staff access required.');
  }
  canReadStudent(actor:Actor,studentId:number){
    this.staff(actor);
    const student=this.db.query("SELECT id FROM users WHERE id=? AND role='student' AND is_active=1").get(studentId);
    if(!student)throw new AttendanceError(404,'Active student not found.');
    if(actor.role==='operator')return;
    const owned=this.db.query('SELECT 1 FROM class_enrollments ce JOIN classes c ON c.id=ce.class_id WHERE ce.student_id=? AND c.class_teacher_id=?').get(studentId,actor.userId);
    if(!owned)throw new AttendanceError(403,'Only the assigned class teacher can access this attendance record.');
  }
  save(actor:Actor,data:any,studentId?:number){
    this.staff(actor);
    const activeTerm=this.db.query('SELECT id,session_id FROM academic_terms WHERE is_active=1 LIMIT 1').get() as any;
    const activeSession=this.db.query('SELECT id FROM academic_sessions WHERE is_active=1 LIMIT 1').get() as any;
    if(!activeTerm||!activeSession)throw new AttendanceError(409,'Activate an academic session and term before recording attendance.');
    const termId=Number(data?.term_id??activeTerm.id),sessionId=Number(data?.session_id??activeSession.id);
    if(termId!==Number(activeTerm.id)||sessionId!==Number(activeSession.id)||Number(activeTerm.session_id)!==sessionId)throw new AttendanceError(409,'Attendance can only be recorded for the active academic session and term.');
    const date=data?.date??new Date(Date.now()+3600000).toISOString().slice(0,10);
    if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new AttendanceError(400,'Enter a valid attendance date.');
    const records=studentId?[{student_id:studentId,status:data?.status,remarks:data?.remarks}]:data?.records;
    if(!Array.isArray(records)||!records.length||records.length>1000)throw new AttendanceError(400,'Submit between one and 1,000 attendance records.');
    let allowed:Set<number>|null=null;
    if(studentId)this.canReadStudent(actor,studentId);
    else {
      const classId=Number(data?.class_id);
      if(!Number.isSafeInteger(classId)||classId<1)throw new AttendanceError(400,'Choose a valid class.');
      const classroom=this.db.query('SELECT * FROM classes WHERE id=?').get(classId) as any;
      if(!classroom)throw new AttendanceError(404,'Class not found.');
      if(actor.role==='teacher'&&Number(classroom.class_teacher_id)!==actor.userId)throw new AttendanceError(403,'You are not the assigned teacher for this class.');
      allowed=new Set((this.db.query("SELECT ce.student_id FROM class_enrollments ce JOIN users u ON u.id=ce.student_id WHERE ce.class_id=? AND u.role='student' AND u.is_active=1").all(classId) as any[]).map(r=>Number(r.student_id)));
    }
    const seen=new Set<number>();
    const validated=records.map(r=>{
      const id=Number(r?.student_id);
      if(!Number.isSafeInteger(id)||id<1||seen.has(id))throw new AttendanceError(400,'Each active student must appear once in the register.');
      if(allowed&&!allowed.has(id))throw new AttendanceError(403,'A student is not enrolled in this class. No attendance was saved.');
      seen.add(id);
      if(!['present','absent','late','holiday','excused'].includes(r?.status))throw new AttendanceError(400,'Choose a valid attendance status for every student.');
      if(r.remarks!=null&&(typeof r.remarks!=='string'||r.remarks.trim().length>2000))throw new AttendanceError(400,'Attendance remarks must be up to 2,000 characters.');
      return {studentId:id,status:r.status as string,remarks:typeof r.remarks==='string'?r.remarks.trim():null};
    });
    const insert=this.db.query(`INSERT INTO attendance_records(student_id,term_id,session_id,date,status,remarks,marked_by)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(student_id,term_id,date) DO UPDATE SET status=excluded.status,remarks=excluded.remarks,marked_by=excluded.marked_by,session_id=excluded.session_id`);
    this.db.transaction(()=>{for(const r of validated)insert.run(r.studentId,termId,sessionId,date,r.status,r.remarks,actor.userId);})();
    return {date,records:validated};
  }
}
