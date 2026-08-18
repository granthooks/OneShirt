import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "../../components/Toast";

export default function UsersPage() {
  const users = useQuery(api.admin.listUsers, {});
  const adjustCredits = useMutation(api.admin.adjustCredits);
  const setRole = useMutation(api.admin.setRole);
  const { showToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleGrant(userId: string, name: string) {
    setBusyId(userId);
    try {
      await adjustCredits({
        userId: userId as never,
        delta: 100,
        note: "admin grant",
      });
      showToast(`+100 credits granted to ${name}`);
    } catch {
      showToast("Couldn't grant credits. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleRole(
    userId: string,
    name: string,
    currentRole: "player" | "admin"
  ) {
    const nextRole = currentRole === "admin" ? "player" : "admin";
    if (
      nextRole === "admin" &&
      !window.confirm(`Promote ${name} to admin? They will gain full admin access.`)
    ) {
      return;
    }
    setBusyId(userId);
    try {
      await setRole({ userId: userId as never, role: nextRole });
      showToast(`${name} is now ${nextRole}`);
    } catch {
      showToast("Couldn't update role. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-panel">
      <div className="grid grid-cols-[52px_1fr_150px_130px_130px] items-center gap-4 border-b border-[#22223a] px-5 py-3 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
        <span />
        <span>User</span>
        <span>Credits</span>
        <span>Role</span>
        <span>Joined</span>
      </div>

      {users === undefined && (
        <p className="px-5 py-6 text-xs text-muted">Loading…</p>
      )}
      {users?.length === 0 && (
        <p className="px-5 py-6 text-xs text-muted">No users yet.</p>
      )}

      {users?.map((u) => (
        <div
          key={u._id}
          className="grid grid-cols-[52px_1fr_150px_130px_130px] items-center gap-4 border-b border-[#22223a] px-5 py-3 last:border-b-0 hover:bg-[#1a1a30]"
        >
          <div
            className="h-9 w-9 rounded-full"
            style={{ background: "linear-gradient(135deg,#ff2d78,#7b2ff7)" }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{u.name}</p>
            <p className="truncate font-mono text-[9.5px] uppercase tracking-[1px] text-faint">
              {u.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-lime">
              {u.availableCredits}
            </span>
            <button
              type="button"
              disabled={busyId === u._id}
              onClick={() => handleGrant(u._id, u.name)}
              className="rounded-full border border-border2 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[1px] text-white transition-colors hover:border-lime hover:text-lime"
            >
              +100
            </button>
          </div>
          <button
            type="button"
            disabled={busyId === u._id}
            onClick={() => handleToggleRole(u._id, u.name, u.role)}
            className={`w-fit rounded-full border px-3 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[1px] transition-colors ${
              u.role === "admin"
                ? "border-pink text-pink"
                : "border-border2 text-muted hover:border-pink hover:text-pink"
            }`}
          >
            {u.role === "admin" ? "Admin" : "Player"}
          </button>
          <span className="font-mono text-[9.5px] uppercase tracking-[1px] text-faint">
            {new Date(u.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
