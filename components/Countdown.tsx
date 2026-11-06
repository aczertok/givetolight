"use client";
import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/format";

export default function Countdown({ endsAt }: { endsAt: string | null }) {
  const [t, setT] = useState<string | null>(() => timeLeft(endsAt));
  useEffect(() => {
    const i = setInterval(() => setT(timeLeft(endsAt)), 30000);
    return () => clearInterval(i);
  }, [endsAt]);
  return t ? <div className="clock num">{t}</div> : null;
}
