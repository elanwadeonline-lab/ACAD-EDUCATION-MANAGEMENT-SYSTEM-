"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Copy, Flag, Gamepad2, Medal, Mountain, RefreshCw, ShieldCheck, Swords, Target, Trophy, Users, X } from "../icons/StudentIcons";
import { StudyWorkspace } from './StudyWorkspace';
import { JourneySetup } from './JourneySetup';
import { arenaApi } from '../../lib/arena';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../ui/Modal';
import type { ArenaMode, ArenaOverview, ArenaSession } from '../../../shared/arena';
import styles from './PracticeArena.module.css';

const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const requestKey = () => typeof crypto.randomUUID==='function' ? crypto.randomUUID() : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

export function PracticeArena() {
  const {user}=useAuth();
  return user ? <ArenaContent key={user.id} userId={user.id} /> : null;
}

function ArenaContent({userId}:{userId:number}) {
  const [overview,setOverview]=useState<ArenaOverview|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [tab,setTab]=useState<'play'|'league'|'partners'>('play');
  const [paper,setPaper]=useState('');
  const [studyPartner,setStudyPartner]=useState<{id:number;name:string}|null>(null);
  const [code,setCode]=useState('');
  const [session,setSession]=useState<ArenaSession|null>(null);
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);
  const [confirmLeave,setConfirmLeave]=useState(false);
  const [sessionError,setSessionError]=useState('');
  const [sessionNotice,setSessionNotice]=useState('');
  const inFlight=useRef(false);
  const mounted=useRef(true);
  const createIntent=useRef<{paper:string;mode:ArenaMode;key:string}|null>(null);
  const questionHeading=useRef<HTMLHeadingElement>(null);

  const refresh=useCallback(async()=>{
    const next=await arenaApi.overview();
    if (!mounted.current) return;
    setOverview(next);setError('');
    setPaper(current=>next.papers.some(p=>p.id===current)?current:next.papers[0]?.id||'');
  },[]);

  useEffect(()=>{
    mounted.current=true;
    void refresh().catch(e=>{if(mounted.current)setError(message(e));}).finally(()=>{if(mounted.current)setLoading(false);});
    return()=>{mounted.current=false;};
  },[refresh]);

  // Never let an older poll replace a locked answer or a terminal match state.
  const applySession=useCallback((next:ArenaSession)=>{
    setSession(current=>{
      if(current?.id===next.id && (current.answered>next.answered || (['completed','closed'].includes(current.status)&&!['completed','closed'].includes(next.status)))) return current;
      return next;
    });
  },[]);

  useEffect(()=>{setSelected(null);setConfirmLeave(false);},[session?.id,session?.answered]);
  useEffect(()=>{if(open&&session?.question)questionHeading.current?.focus();},[open,session?.id,session?.question?.position]);
  useEffect(()=>{
    if(!open||!session||!['waiting','active'].includes(session.status))return;
    let cancelled=false;
    const id=session.id;
    const poll=async()=>{
      if(document.hidden||inFlight.current)return;
      try{
        const next=await arenaApi.session(id);
        if(cancelled)return;
        applySession(next);setSessionError('');
        if(next.status==='completed'||next.status==='closed')void refresh().catch(()=>undefined);
      }catch(e){if(!cancelled)setSessionError(`${message(e)} Your saved answers are kept. Retry or reopen the quest.`);}
    };
    const timer=window.setInterval(poll,4000);
    const visible=()=>{if(!document.hidden)void poll();};
    document.addEventListener('visibilitychange',visible);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[open,session?.id,session?.status,applySession,refresh]);

  const run=async(task:()=>Promise<void>,inSession=false)=>{
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);
    if(inSession){setSessionError('');setSessionNotice('');}else{setError('');setNotice('');}
    try{await task();}catch(e){if(inSession)setSessionError(message(e));else setError(message(e));}
    finally{inFlight.current=false;if(mounted.current)setBusy(false);}
  };

  const showSession=(next:ArenaSession)=>{setSession(next);setSelected(null);setSessionError('');setSessionNotice('');setConfirmLeave(false);setOpen(true);};
  const start=(mode:ArenaMode)=>void run(async()=>{
    if(!createIntent.current||createIntent.current.paper!==paper||createIntent.current.mode!==mode)createIntent.current={paper,mode,key:requestKey()};
    const next=await arenaApi.create(paper,mode,createIntent.current.key);
    createIntent.current=null;showSession(next);await refresh();
  });
  const resume=(id:string)=>void run(async()=>{showSession(await arenaApi.session(id));});
  const lockAnswer=()=>{
    if(!session?.question||selected===null)return;
    const current=session;
    void run(async()=>{
      const next=await arenaApi.answer(current.id,current.question!.position,selected);
      applySession(next);setSelected(null);
      if(next.finished)await refresh();
    },true);
  };

  const content=()=>{
    if(loading)return <p className={styles.empty} role="status">Loading your arena…</p>;
    if(!overview)return <button className={styles.secondary} disabled={busy} onClick={()=>void run(async()=>{setLoading(true);try{await refresh();}finally{setLoading(false);}})}><RefreshCw size={16}/> Retry arena</button>;
    if(tab==='league')return <div className={styles.league}>
      <div><span className={styles.kicker}>A fresh start each week</span><h3>Your school-year league</h3><p>Ten XP for each correct question, once a day. Your school grades stay separate.</p><span className={styles.weekNote}>Resets Monday · West Africa Time</span></div>
      {overview.leaderboard.length?<ol className={styles.leaderboard}>{overview.leaderboard.map(row=><li key={`${row.rank}-${row.name}`} data-self={row.isSelf}><span className={styles.rank}>{row.rank===1?<Trophy size={18}/>:row.rank}</span><strong>{row.name}{row.isSelf&&<small> You</small>}</strong><span>{row.xp} XP</span></li>)}</ol>:<p className={styles.empty}>No XP earned in your school year this week. Complete a quest to get started.</p>}
    </div>;
    if(tab==='partners')return <div className={styles.partners}>
      <div className={styles.sectionIntro}><h3>Better together</h3><p>Finish a two-player challenge, then invite your classmate to study. Both students choose whether to connect.</p></div>
      {overview.partners.length?overview.partners.map(partner=><article key={partner.id} className={styles.partner}><div className={styles.peerIcon}><Users size={20}/></div><div><strong>{partner.name}</strong><p>{partner.goal}</p><small>{partner.status==='accepted'?'Study partners · Try the paper, compare mistakes, then practise again.':partner.incoming?'Invited you to study':'Invitation sent · Waiting for their reply'}</small></div><div className={styles.partnerActions}>{partner.status==='accepted'&&<button className={styles.primary} onClick={()=>setStudyPartner(partner)}>Open private study</button>}{partner.status==='pending'&&partner.incoming?<><button disabled={busy} className={styles.primary} onClick={()=>void run(async()=>{await arenaApi.partner(partner.id,'accept');await refresh();setNotice('Study partnership accepted.');})}>Accept</button><button disabled={busy} className={styles.secondary} onClick={()=>void run(async()=>{await arenaApi.partner(partner.id,'decline');await refresh();})}>Decline</button></>:<button disabled={busy} className={styles.textButton} onClick={()=>void run(async()=>{await arenaApi.partner(partner.id,'end');await refresh();setNotice(partner.status==='accepted'?'Study partnership ended.':'Invitation withdrawn.');})}>{partner.status==='accepted'?'End partnership':'Withdraw'}</button>}</div></article>):<p className={styles.empty}>Your study partners will appear here after a classmate accepts an invitation.</p>}
    </div>;
    return <>
      <JourneySetup papers={overview.papers} onStart={next=>{showSession(next);void refresh().catch(e=>setError(message(e)));}}/>
      {overview.active&&<div className={styles.resume}><span><strong>{overview.active.finished?'Your classmate is still playing':overview.active.status==='waiting'?'Your challenge room is waiting':'Pick up where you left off'}</strong><small>{overview.active.title} · {overview.active.answered}/{overview.active.total} answered</small></span><button disabled={busy} className={styles.secondary} onClick={()=>resume(overview.active!.id)}>Open quest <ArrowRight size={16}/></button></div>}
      <div className={styles.playGrid}>
        <div className={styles.modes}><label className={styles.paperLabel}>Choose your paper<select value={paper} disabled={busy||!overview.papers.length} onChange={e=>{setPaper(e.target.value);createIntent.current=null;}}>{!overview.papers.length&&<option value="">No eligible papers yet</option>}{overview.papers.map(p=><option key={p.id} value={p.id}>{p.title} · {p.questionCount} questions</option>)}</select></label>
          <div className={styles.modeGrid}><article className={styles.mode}><div className={styles.modeIcon}><Mountain size={24}/></div><h3>Solo quest</h3><p>Five questions. One small step towards mastering your subject.</p><span className={styles.modeMeta}><Target size={14}/> Your pace · Up to 50 XP</span><button className={styles.primary} disabled={busy||!paper} onClick={()=>start('solo')}>Start quest <ArrowRight size={16}/></button></article><article className={styles.mode}><div className={styles.modeIcon}><Swords size={24}/></div><h3>Challenge a classmate</h3><p>Same five questions. Compare your scores, then learn together.</p><span className={styles.modeMeta}><Users size={14}/> Two players · Your pace</span><button className={styles.secondary} disabled={busy||!paper} onClick={()=>start('duel')}>Create a room <ArrowRight size={16}/></button></article></div>
          {!overview.papers.length&&<p className={styles.hint}>Your teacher needs to upload a paper with at least five valid multiple-choice questions before you can play.</p>}
        </div>
        <aside className={styles.join}><Flag size={24}/><h3>Have a room code?</h3><p>Join a classmate in your school year. Rooms stay open for 24 hours.</p><form onSubmit={e=>{e.preventDefault();void run(async()=>{showSession(await arenaApi.join(code.trim()));await refresh();});}}><label htmlFor="arena-room-code">Room code</label><input id="arena-room-code" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="8-character code" autoComplete="off" autoCapitalize="characters" spellCheck={false}/><button className={styles.secondary} disabled={busy||!/^[A-F0-9]{8}$/i.test(code.trim())}>Join challenge <ArrowRight size={16}/></button></form><span className={styles.safety}><ShieldCheck size={15}/> Only your classmate can join with the code.</span></aside>
      </div>
      {overview.recent.length>0&&<div className={styles.history}><span className={styles.kicker}>Recent quests</span>{overview.recent.map(item=><button key={item.id} onClick={()=>resume(item.id)} disabled={busy}><span>{item.mode==='duel'?<Swords size={16}/>:<Mountain size={16}/>} {item.title}</span><small>{item.status==='completed'?`${item.score}/${item.total} · Review`:item.status==='closed'?'Closed':item.status==='waiting'?'Waiting':'In progress'} <ArrowRight size={14}/></small></button>)}</div>}
    </>;
  };

  const opponent=session?.players.find(p=>p.id!==userId);
  const resultTitle=session?.status==='completed'?(session.mode==='solo'?'Quest complete':session.score===opponent?.score?'A well-matched challenge':(session.score??0)>(opponent?.score??0)?'You won this challenge':'A good round of learning'):'Quest closed';

  return <section className={styles.arena} aria-labelledby="practice-arena-title">
    <div className={styles.hero}><div className={styles.heroCopy}><span className={styles.heroKicker}><Gamepad2 size={17}/> Practice Arena</span><h2 id="practice-arena-title">A little practice.<br/>A new personal best.</h2><p>Turn past questions into quests. Challenge a classmate, earn your XP, and keep getting better.</p></div><div className={styles.levelCard}><span className={styles.levelTop}><Medal size={20}/> Level {overview?.level??1}</span><strong>{overview?.xp??0}<small> Arena XP</small></strong><div className={styles.levelTrack} role="progressbar" aria-label="Progress to next arena level" aria-valuenow={(overview?.xp??0)%100} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${(overview?.xp??0)%100}%`}}/></div><span className={styles.levelCaption}>{overview?overview.nextLevelXp-overview.xp:100} XP to your next level</span><div className={styles.checkpoints} aria-hidden="true">{[0,20,40,60,80].map(n=><span key={n} data-earned={(overview?.xp??0)%100>n}>{(overview?.xp??0)%100>n?<Check size={12}/>:<span/>}</span>)}</div></div></div>
    <div className={styles.body}><div className={styles.toolbar}><div className={styles.tabs} aria-label="Practice Arena sections">{([['play','Play'],['league','Weekly league'],['partners','Study partners']] as const).map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);setNotice('');void refresh().catch(e=>setError(message(e)));}}>{label}{value==='partners'&&!!overview?.partners.filter(p=>p.incoming&&p.status==='pending').length&&<span className={styles.dot}/>}</button>)}</div><span className={styles.weekly}><Trophy size={15}/>{overview?.weeklyXp??0} XP this week</span></div>
      {error&&<div className={styles.error} role="alert">{error} <button onClick={()=>void run(refresh)} disabled={busy}>Retry</button></div>}{notice&&<p className={styles.notice} role="status">{notice}</p>}{content()}
    </div>
    <Modal open={!!studyPartner} onClose={()=>setStudyPartner(null)} title={studyPartner?`Study with ${studyPartner.name}`:'Private study'} description="Read class materials and keep your conversation and notes together." size="xl">{studyPartner&&<StudyWorkspace key={studyPartner.id} partnerId={studyPartner.id} userId={userId} name={studyPartner.name}/>}</Modal>
    <Modal open={open&&!!session} onClose={()=>{setOpen(false);void refresh().catch(()=>undefined);}} title={session?.mode==='duel'?'Classmate challenge':'Solo quest'} description={session?.title} size="lg">
      {session&&<div className={styles.game}>
        {sessionError&&<div className={styles.error} role="alert">{sessionError}<button disabled={busy} onClick={()=>void run(async()=>{applySession(await arenaApi.session(session.id));},true)}>Reconnect</button></div>}
        {sessionNotice&&<p className={styles.notice} role="status">{sessionNotice}</p>}
        <div className={styles.gameMeta}><span>{session.mode==='solo'?`${session.total}-question quest`:'Two-player challenge'} · No timer</span><span>{session.answered}/{session.total} answered</span></div>
        <div className={styles.rounds} aria-label="Quest progress">{Array.from({length:session.total},(_,i)=><span key={i} data-done={i<session.answered} data-current={i===session.answered&&session.status==='active'}/>)}</div>
        {session.mode==='duel'&&<div className={styles.players}>{session.players.map(player=><div key={player.id}><span className={styles.avatar}>{player.name[0]}</span><span><strong>{player.id===userId?'You':player.name}</strong><small>{player.finished?'Finished':`${player.answered}/${session.total} answered`}</small></span>{player.score!==null&&<b>{player.score}/{session.total}</b>}</div>)}{!opponent&&<div><span className={styles.avatar}><Users size={18}/></span><span><strong>Your classmate</strong><small>Waiting to join</small></span></div>}</div>}
        {session.status==='waiting'?<div className={styles.waiting}><Swords size={32}/><h3>Your room is ready</h3><p>Share this code with a classmate in your school year. Your questions open when they join.</p><div className={styles.roomCode}><strong>{session.roomCode}</strong><button aria-label="Copy room code" onClick={()=>void run(async()=>{if(!navigator.clipboard)throw new Error('Copy is unavailable here. Select and copy the room code.');await navigator.clipboard.writeText(session.roomCode!);setSessionNotice('Room code copied.');},true)}><Copy size={18}/></button></div><small>Expires {new Date(session.expiresAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}. Both players answer at their own pace.</small></div>:session.question?<>
          <div className={styles.questionHeader}><span className={styles.kicker}>Question {session.question.position+1}{session.question.topic?` · ${session.question.topic}`:''}</span><h3 tabIndex={-1} ref={questionHeading}>{session.question.text}</h3></div>
          <fieldset className={styles.options} disabled={busy}><legend className={styles.srOnly}>Choose your answer</legend>{session.question.options.map((option,i)=><label key={i} data-selected={selected===i}><input type="radio" name={`arena-answer-${session.id}-${session.question!.position}`} checked={selected===i} onChange={()=>setSelected(i)}/><span className={styles.optionLetter}>{String.fromCharCode(65+i)}</span><span>{option}</span>{selected===i&&<Check size={18}/>}</label>)}</fieldset>
          <div className={styles.answerFooter}><span><ShieldCheck size={15}/> Answers lock when saved.</span><button className={styles.primary} disabled={busy||selected===null} onClick={lockAnswer}>{busy?'Saving answer…':session.answered===session.total-1?'Finish quest':'Lock answer'}<ArrowRight size={16}/></button></div>
        </>:session.finished&&session.status==='active'?<div className={styles.waiting}><Check size={34}/><h3>Your answers are saved</h3><p>Your classmate is still playing. Scores, explanations and XP unlock when both of you finish.</p><button className={styles.secondary} onClick={()=>setOpen(false)}>Back to Practice</button></div>:<div className={styles.results}>
          <div className={styles.resultHeading}><Trophy size={32}/><h3>{resultTitle}</h3>{session.status==='completed'?<><strong>{session.score}<small> / {session.total}</small></strong><p>+{session.xp} Arena XP{session.xp===0?' · Correct questions already rewarded today can still help you learn.':''}</p><small>Earn 10 XP per correct question, once each day.</small></>:<p>This room ended or expired. Start another quest whenever you are ready. No new XP was awarded.</p>}</div>
          {session.status==='completed'&&<><div className={styles.reviewHeading}><BookOpen size={18}/><h4>Make the next round count</h4></div>{session.review.map((item,i)=><details key={i} className={styles.review}><summary><span data-correct={item.selected===item.correct}>{item.selected===item.correct?<Check size={15}/>:<X size={15}/>}</span><span>{i+1}. {item.text}</span></summary><div><p><strong>Your answer:</strong> {item.options[item.selected]}</p><p><strong>Correct answer:</strong> {item.options[item.correct]}</p><p>{item.explanation||'Ask your teacher to explain the reasoning, then try a fresh question on this topic.'}</p></div></details>)}{session.mode==='duel'&&<div className={styles.studyInvite}><Users size={24}/><div><strong>Keep learning with {opponent?.name}</strong><p>Invite your classmate to review this paper together. They choose whether to accept.</p></div><button className={styles.secondary} disabled={busy} onClick={()=>void run(async()=>{await arenaApi.invite(session.id);setSessionNotice('Invitation available in Study partners. Your classmate can accept it there.');await refresh();},true)}>Invite to study</button></div>}</>}
        </div>}
        {['waiting','active'].includes(session.status)&&<div className={styles.leave}>{confirmLeave?<><p>End this quest for {session.mode==='duel'?'both players':'yourself'}? Saved answers remain in your history, but this quest will not award XP.</p><button className={styles.secondary} disabled={busy} onClick={()=>setConfirmLeave(false)}>Keep playing</button><button className={styles.danger} disabled={busy} onClick={()=>void run(async()=>{applySession(await arenaApi.leave(session.id));setConfirmLeave(false);await refresh();},true)}>End quest</button></>:<><button className={styles.textButton} disabled={busy} onClick={()=>setConfirmLeave(true)}>Leave quest</button><small>Closing this window keeps your quest saved.</small></>}</div>}
      </div>}
    </Modal>
  </section>;
}
