"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import styles from "./season.module.css";

type Split = { days: number; hours: number; minutes: number; seconds: number };

function nextMonday(): Date {
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  const day = target.getDay();
  let diff = (1 - day + 7) % 7;
  if (diff === 0) diff = 7;
  target.setDate(target.getDate() + diff);
  return target;
}

function splitRemaining(ms: number): Split {
  const clamped = Math.max(ms, 0);
  const seconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function Countdown({
  labels,
}: {
  labels: { days: string; hours: string; minutes: string; seconds: string };
}) {
  const [split, setSplit] = useState<Split | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const target = nextMonday();
    const tick = () => setSplit(splitRemaining(target.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const units: Array<{ key: keyof Split; label: string }> = [
    { key: "days", label: labels.days },
    { key: "hours", label: labels.hours },
    { key: "minutes", label: labels.minutes },
    { key: "seconds", label: labels.seconds },
  ];

  return (
    <div className={styles.countdownRow} role="timer" aria-live="off">
      {units.map((u) => {
        const value = split ? pad(split[u.key]) : "--";
        return (
          <div key={u.key} className={styles.countUnit}>
            {reduceMotion ? (
              <span className={styles.countNum}>{value}</span>
            ) : (
              <motion.span
                key={value}
                className={styles.countNum}
                initial={{ opacity: 0.4, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {value}
              </motion.span>
            )}
            <span className={styles.countLabel}>{u.label}</span>
          </div>
        );
      })}
    </div>
  );
}
