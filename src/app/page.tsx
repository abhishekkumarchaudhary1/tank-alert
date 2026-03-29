"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const POLL_MS = 5000;
const STALE_MS = 30_000;
const MUTE_MS = 10 * 60 * 1000;

type ApiData = { device: string; lastSeen: string | null; serverTime: string };

/* ── audio ────────────────────────────────────────────────── */

function playBeeps(count: number) {
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return;

  const ctx = new Ctor();
  const gain = ctx.createGain();
  gain.gain.value = 0.03 + (count / 10) * 0.12;
  gain.connect(ctx.destination);

  const freq = 660 + (count / 10) * 440;
  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    osc.connect(gain);
    const t = ctx.currentTime + 0.02 + i * 0.2;
    osc.start(t);
    osc.stop(t + 0.12);
  }

  setTimeout(() => void ctx.close(), count * 200 + 500);
}

/* ── notification ─────────────────────────────────────────── */

async function sendNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;

  try {
    new Notification(title, { body, tag: "tank-alert" });
    return;
  } catch {
    /* mobile browsers require SW */
  }

  const reg = await navigator.serviceWorker?.getRegistration();
  reg?.showNotification(title, { body, tag: "tank-alert" });
}

/* ── icons ────────────────────────────────────────────────── */

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
  );
}

function WaterDrop({ color }: { color: "red" | "amber" | "emerald" }) {
  const fill =
    color === "red" ? "#fca5a5" : color === "amber" ? "#fcd34d" : "#6ee7b7";
  const stroke =
    color === "red" ? "#ef4444" : color === "amber" ? "#f59e0b" : "#10b981";
  const showLevel = color !== "emerald";

  return (
    <svg width="72" height="72" viewBox="0 0 100 120" fill="none">
      <path
        d="M50 8C50 8 12 52 12 72C12 93 29 110 50 110C71 110 88 93 88 72C88 52 50 8 50 8Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
      />
      {showLevel && (
        <>
          <line
            x1="30"
            y1="65"
            x2="70"
            y2="65"
            stroke={stroke}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <line
            x1="27"
            y1="78"
            x2="73"
            y2="78"
            stroke={stroke}
            strokeWidth="2"
          />
          <line
            x1="30"
            y1="91"
            x2="70"
            y2="91"
            stroke={stroke}
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}

/* ── main ─────────────────────────────────────────────────── */

export default function Home() {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [device, setDevice] = useState("nodemcu-terrace-1");
  const [mutedUntil, setMutedUntil] = useState(0);
  const [countdown, setCountdown] = useState("");
  const [permission, setPermission] = useState<NotificationPermission>(
    "default",
  );

  const didNotify = useRef(false);
  const round = useRef(0);
  const alarmTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const alarming = useRef(false);

  const isFull = (() => {
    if (!lastSeen || !serverTime) return false;
    return (
      new Date(serverTime).getTime() - new Date(lastSeen).getTime() < STALE_MS
    );
  })();
  const isMuted = mutedUntil > Date.now();
  const color: "red" | "amber" | "emerald" = isFull
    ? isMuted
      ? "amber"
      : "red"
    : "emerald";

  /* register SW + check permission */
  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => {});
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  /* poll server */
  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/heartbeat", { cache: "no-store" });
      const d = (await r.json()) as ApiData;
      setDevice(d.device);
      setLastSeen(d.lastSeen);
      setServerTime(d.serverTime);
    } catch {
      /* network hiccup, retry next interval */
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  /* mute countdown */
  useEffect(() => {
    if (!isMuted) {
      setCountdown("");
      return;
    }
    const tick = () => {
      const r = Math.max(0, mutedUntil - Date.now());
      if (r <= 0) {
        setMutedUntil(0);
        setCountdown("");
        return;
      }
      const m = Math.floor(r / 60000);
      const s = Math.floor((r % 60000) / 1000);
      setCountdown(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isMuted, mutedUntil]);

  /* alarm helpers (use refs so setTimeout closures stay valid) */
  function nextRound() {
    if (!alarming.current) return;
    round.current = Math.min(round.current + 1, 10);
    playBeeps(round.current);
    alarmTimer.current = setTimeout(nextRound, round.current * 200 + 1500);
  }

  function startAlarm() {
    if (alarming.current) return;
    alarming.current = true;
    round.current = 0;
    nextRound();
  }

  function stopAlarm() {
    alarming.current = false;
    round.current = 0;
    clearTimeout(alarmTimer.current);
  }

  /* react to tank status */
  useEffect(() => {
    if (isFull && !isMuted) {
      if (!alarming.current) startAlarm();
      if (!didNotify.current) {
        didNotify.current = true;
        void sendNotification(
          "Tank Alert",
          "Water tank almost full! Turn off the motor.",
        );
      }
    } else {
      stopAlarm();
    }
    if (!isFull) didNotify.current = false;
    return () => stopAlarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFull, isMuted]);

  function mute() {
    stopAlarm();
    setMutedUntil(Date.now() + MUTE_MS);
    didNotify.current = true;
  }

  /* ── render ───────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-5">
        <p className="text-center text-lg font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
          Tank Alert
        </p>

        {/* status card */}
        <div
          className={`rounded-3xl p-6 text-center flex flex-col items-center gap-3 border-2 transition-colors ${
            color === "red"
              ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
              : color === "amber"
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
          }`}
        >
          <div className={isFull && !isMuted ? "animate-pulse" : ""}>
            <WaterDrop color={color} />
          </div>

          <div>
            <p
              className={`text-xl font-bold ${
                color === "red"
                  ? "text-red-700 dark:text-red-400"
                  : color === "amber"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {isFull
                ? isMuted
                  ? `Motor switched off${countdown ? ` (${countdown})` : ""}`
                  : "Tank almost full!"
                : "All clear"}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {isFull
                ? isMuted
                  ? "Still monitoring. Alerts resume after cooldown."
                  : "Turn off the motor now."
                : "Monitoring for signals\u2026"}
            </p>
          </div>
        </div>

        {/* info */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          {(
            [
              ["Device", device],
              [
                "Last signal",
                lastSeen ? new Date(lastSeen).toLocaleTimeString() : "\u2014",
              ],
              ["Notifications", permission],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between px-4 py-3">
              <span className="text-sm text-zinc-500">{label}</span>
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="flex flex-col gap-2.5">
          {permission !== "granted" && (
            <button
              onClick={async () =>
                setPermission(await Notification.requestPermission())
              }
              className="w-full rounded-xl bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              type="button"
            >
              <BellIcon /> Enable notifications
            </button>
          )}

          {isFull && !isMuted && (
            <button
              onClick={mute}
              className="w-full rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-red-900/30"
              type="button"
            >
              <PowerIcon /> Switched off motor
            </button>
          )}

          {isMuted && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-400 font-medium">
              Alerts paused &mdash; resuming in {countdown}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
