"use client";

import React from "react";
import styles from "./XpTargetWave.module.css";

interface XpTargetWaveProps {
  className?: string;
  progress?: number;
}

export function XpTargetWave({ className = "", progress }: XpTargetWaveProps) {
  return <div className={`${styles.waveWrapper} ${className}`} aria-hidden="true"><img src="/gold-card-wave.svg" alt="" className={styles.waveSvg}/></div>;
}
