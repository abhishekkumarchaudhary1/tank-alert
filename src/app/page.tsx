 "use client";

import { useEffect, useState } from "react";

export default function Home() {
  return <TankAlertDemo />;
}

type HeartbeatResponse = {
  ok: boolean;
  device: string;
  lastSeen: string | null;
  serverTime: string;
  meta: { ip?: string; userAgent?: string } | null;
};

function TankAlertDemo() {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined") return "default";
    return "Notification" in window ? Notification.permission : "denied";
  });
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>("nodemcu-terrace-1");
  const [error, setError] = useState<string | null>(null);
  const [lastNotifiedHeartbeatAt, setLastNotifiedHeartbeatAt] = useState<string | null>(null);

  const pollMs = Number(process.env.NEXT_PUBLIC_POLL_MS ?? "5000");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) setPermission("denied");
  }, []);

  async function requestPermission() {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }

  async function playAlarm() {
    if (typeof window === "undefined") return;
    if (!alarmEnabled) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    gain.connect(ctx.destination);

    const startAt = ctx.currentTime + 0.02;
    const beep = (t: number, freq: number, dur: number) => {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur);
    };

    // Simple "alarm": 3 short beeps.
    beep(startAt, 880, 0.12);
    beep(startAt + 0.18, 880, 0.12);
    beep(startAt + 0.36, 880, 0.12);

    setTimeout(() => {
      void ctx.close();
    }, 1200);
  }

  async function poll() {
    setError(null);
    try {
      const res = await fetch("/api/heartbeat", { cache: "no-store" });
      const data = (await res.json()) as HeartbeatResponse;
      setDeviceId(data.device);
      setLastHeartbeatAt(data.lastSeen);

      if (data.lastSeen && data.lastSeen !== lastNotifiedHeartbeatAt) {
        setLastNotifiedHeartbeatAt(data.lastSeen);

        if (permission === "granted") {
          new Notification("Tank Alert", {
            body: `Heartbeat received from ${data.device}`,
            tag: "tank-alert-heartbeat",
          });
        }

        await playAlarm();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to notify");
    }
  }

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      void poll();
    }, pollMs);

    void poll();

    return () => {
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pollMs, alarmEnabled, permission, lastNotifiedHeartbeatAt]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Tank Alert (test mode)</p>
          <h1 className="text-3xl font-semibold tracking-tight">Minute notification + alarm</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            This listens for real heartbeats from your NodeMCU (via HTTP POST) and alerts only when a heartbeat is received.
          </p>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Notifications permission</p>
              <p className="font-medium">{permission}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                onClick={requestPermission}
                type="button"
              >
                Enable notifications
              </button>
              <button
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-white/10"
                onClick={() => void poll()}
                type="button"
              >
                Poll now
              </button>
              <button
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-white/20 dark:hover:bg-white/10"
                onClick={() => setRunning((v) => !v)}
                type="button"
              >
                {running ? "Stop" : "Start"} polling
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-white/5">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Alarm sound</p>
              <p className="text-sm font-medium">{alarmEnabled ? "Enabled" : "Muted"}</p>
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
              <input
                checked={alarmEnabled}
                onChange={(e) => setAlarmEnabled(e.target.checked)}
                type="checkbox"
                className="h-4 w-4"
              />
              Enable alarm
            </label>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">Error: {error}</p>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Device</p>
            <p className="mt-1 font-medium">{deviceId}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Last heartbeat</p>
            <p className="mt-1 font-medium">{lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleString() : "—"}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Polling</p>
            <p className="mt-1 font-medium">{running ? `Every ${Math.round(pollMs / 1000)}s` : "Stopped"}</p>
          </div>
        </section>

        <footer className="text-xs text-zinc-500 dark:text-zinc-400">
          Note: never put your real WiFi password in any `NEXT_PUBLIC_*` env var (it would be exposed to the browser).
        </footer>
      </div>
    </div>
  );
}
