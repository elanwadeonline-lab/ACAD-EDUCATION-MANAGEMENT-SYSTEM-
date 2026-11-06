"use client";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { AcqadLogo } from "../brand/AcqadLogo";
import styles from "./PortalLogin.module.css";
type Role="student"|"teacher"|"operator"|"guardian";
const content:Record<Role,{label:string;title:string;description:string;features:string[]}>={
 student:{label:"Student portal",title:"Your learning starts here.",description:"Practice, take assessments and follow your progress in one place.",features:["Practice available examination papers","Access your scheduled assessments","View published results and progress"]},
 teacher:{label:"Teacher portal",title:"A clear view of your classroom.",description:"Prepare assessments, record grades and stay connected with your students.",features:["Manage question banks and assessments","Record attendance and class grades","Review submissions and school messages"]},
 operator:{label:"Administration",title:"Your school, working together.",description:"Manage academic sessions, people and assessment operations.",features:["Coordinate sessions and teaching assignments","Manage subjects and examination schedules","Review academic records and results"]},
 guardian:{label:"Guardian portal",title:"Closer to their school day.",description:"Follow your children’s progress and keep in touch with their school.",features:["View published results and attendance","Read school updates and messages","Manage linked children and school records"]}
};
export default function PortalLogin({role}:{role:Role}){
  const copy=content[role];
  return (
    <Suspense fallback={<main className={styles.loading}>Loading sign in…</main>}>
      <main className={styles.page}>
        <div className={styles.layout}>
          <section className={styles.story} aria-label={copy.label}>
            <AcqadLogo size="xl" showSubtitle wordmarkWeight={500}/>
            <div>
              <span className={styles.role}>{copy.label}</span>
              <h1>{copy.title}</h1>
              <p>{copy.description}</p>
            </div>
            <ul>{copy.features.map(feature=><li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
            <span className={styles.footer}>Acqad · Academic coordination, simplified.</span>
          </section>
          <section className={styles.form}>
            <div className={styles.mobileBrand}>
              <AcqadLogo size="lg" showSubtitle wordmarkWeight={500}/>
            </div>
            {role === "guardian" && (
              <div style={{
                marginBottom: 20,
                padding: "12px 16px",
                borderRadius: 12,
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                width: "100%",
                maxWidth: 420
              }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>📱 ACQAD Native Mobile App</span>
                  <span style={{ fontSize: 12, color: "#B45309" }}>Open the native Expo mobile interface</span>
                </div>
                <a
                  href="/mobile"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#FFFFFF",
                    background: "#D97706",
                    padding: "6px 12px",
                    borderRadius: 8,
                    textDecoration: "none",
                    whiteSpace: "nowrap"
                  }}
                >
                  Launch App →
                </a>
              </div>
            )}
            <LoginForm expectedRole={role}/>
          </section>
        </div>
      </main>
    </Suspense>
  );
}
