"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type User = {
  _id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  approvedByAdmin: boolean;
  createdAt: string;
};

type MotorLog = {
  _id: string;
  device: string;
  email: string;
  timestamp: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<MotorLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/motor-off"),
      ]);
      const uData = await uRes.json();
      const lData = await lRes.json();
      setUsers(uData.users ?? []);
      setLogs(lData.logs ?? []);
    } catch {
      /* network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function toggleApprove(email: string, current: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, approve: !current }),
    });
    void fetchData();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-500">Loading\u2026</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
            Admin Dashboard
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              type="button"
            >
              Tank Alert
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Users */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
            Users ({users.length})
          </h2>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.map((u) => (
              <div
                key={u._id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {u.email}
                  </p>
                  <div className="flex gap-2 mt-0.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        u.role === "super_admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {u.role}
                    </span>
                    {u.emailVerified ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        verified
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        unverified
                      </span>
                    )}
                  </div>
                </div>
                {u.role !== "super_admin" && (
                  <button
                    onClick={() => toggleApprove(u.email, u.approvedByAdmin)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      u.approvedByAdmin
                        ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                    }`}
                    type="button"
                  >
                    {u.approvedByAdmin ? "Revoke" : "Approve"}
                  </button>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <p className="px-4 py-6 text-sm text-zinc-500 text-center">
                No users yet
              </p>
            )}
          </div>
        </section>

        {/* Motor Logs */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
            Motor Switch-Off Log
          </h2>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {logs.map((l) => (
              <div key={l._id} className="flex justify-between px-4 py-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {l.email}
                </span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {new Date(l.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="px-4 py-6 text-sm text-zinc-500 text-center">
                No logs yet
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
