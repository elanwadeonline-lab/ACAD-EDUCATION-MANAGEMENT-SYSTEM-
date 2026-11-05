"use client";

import React, {useEffect,useState} from "react";
import {PauseIcon} from '@phosphor-icons/react/dist/csr/Pause';
import {PlayIcon} from '@phosphor-icons/react/dist/csr/Play';
import styles from "./XpTargetWave.module.css";

interface XpTargetWaveProps {
  className?: string;
  progress?: number;
}

export function XpTargetWave({ className = "", progress }: XpTargetWaveProps) {
  const [slide,setSlide]=useState(0),[paused,setPaused]=useState(false),[visible,setVisible]=useState(true),[reduced,setReduced]=useState(true);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion=()=>setReduced(media.matches),visibility=()=>setVisible(!document.hidden);
    motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
    return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(paused||reduced||!visible)return;
    const timer=window.setInterval(()=>setSlide(current=>1-current),5000);
    return()=>window.clearInterval(timer);
  },[paused,reduced,visible]);
  return <div className={`${styles.waveWrapper} ${className}`} role="group" aria-label="XP illustration" data-slide={slide===0?'wave':'trophy'} data-autoplay={!paused&&!reduced&&visible}>
    <div className={styles.frame} data-active={slide===0} aria-hidden="true"><img src="/gold-card-wave.svg" alt="" className={styles.waveSvg}/></div>
    <div className={`${styles.frame} ${styles.trophyFrame}`} data-active={slide===1} aria-hidden="true"><img src="/illustrations/fluent/trophy.svg" alt="" className={styles.trophy}/></div>
    <div className={styles.controls}>
      <button type="button" aria-label="Show golden wave" aria-pressed={slide===0} onClick={()=>setSlide(0)}><span/></button>
      <button type="button" aria-label="Show golden trophy" aria-pressed={slide===1} onClick={()=>setSlide(1)}><span/></button>
      {!reduced&&<button type="button" aria-label={paused?'Play illustration slideshow':'Pause illustration slideshow'} onClick={()=>setPaused(value=>!value)}>{paused?<PlayIcon weight="fill" size={12}/>:<PauseIcon weight="fill" size={12}/>}</button>}
    </div>
  </div>;
}
