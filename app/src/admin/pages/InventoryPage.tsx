import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { shirtGradient } from "../../lib/shirtArt";
import { useToast } from "../../components/Toast";
import { StatusPill } from "../components/StatusPill";
import { ProgressBar } from "../components/ProgressBar";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";

type Shirt = NonNullable<ReturnType<typeof useQuery<typeof api.admin.listShirts>>>[number];

export default function InventoryPage() {
  const shirts = useQuery(api.admin.listShirts, {});
  const createShirt = useMutation(api.admin.createShirt);
  const activateShirt = useMutation(api.admin.activateShirt);
  const doArchive = useMutation(api.admin.archiveShirt);
  const { showToast } = useToast();

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Shirt | null>(null);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await createShirt({ name });
      setNewName("");
      showToast(`"${name}" added as a draft`);
    } catch {
      showToast("Couldn't add shirt. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleActivate(shirt: Shirt) {
    try {
      const result = await activateShirt({ shirtId: shirt._id });
      if (result.warn) {
        showToast(
          `Activated — prize load ${result.prizeLoadPct.toFixed(1)}% is outside the target band`
        );
      } else {
        showToast(`"${shirt.name}" is now active`);
      }
    } catch (err) {
      if (err instanceof ConvexError && err.data === "SHIRT_MISSING_IMAGES") {
        showToast("Add a web image + print master before activating");
      } else {
        showToast("Couldn't activate shirt. Please try again.");
      }
    }
  }

  async function handleArchive(shirt: Shirt) {
    try {
      await doArchive({ shirtId: shirt._id });
      showToast(`"${shirt.name}" archived`);
    } catch {
      showToast("Couldn't archive shirt. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
          placeholder="New shirt name…"
          className="w-80 rounded-xl border border-border2 bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-faint focus:border-lime focus:outline-none"
        />
        <Button variant="lime" onClick={handleAdd} disabled={adding || !newName.trim()}>
          + Add Shirt
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-panel">
        <div className="grid grid-cols-[56px_1fr_160px_150px_110px_120px] items-center gap-4 border-b border-[#22223a] px-5 py-3 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
          <span />
          <span>Shirt</span>
          <span>Bids / Thr</span>
          <span>Progress</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {shirts === undefined && (
          <p className="px-5 py-6 text-xs text-muted">Loading…</p>
        )}
        {shirts?.length === 0 && (
          <p className="px-5 py-6 text-xs text-muted">No shirts yet.</p>
        )}

        {shirts?.map((shirt) => {
          const progressPct =
            shirt.bidThreshold > 0
              ? (shirt.bidCount / shirt.bidThreshold) * 100
              : 0;
          return (
            <div
              key={shirt._id}
              className="grid grid-cols-[56px_1fr_160px_150px_110px_120px] items-center gap-4 border-b border-[#22223a] px-5 py-3 last:border-b-0 hover:bg-[#1a1a30]"
            >
              <div
                className="h-10 w-10 rounded-lg"
                style={{
                  background: shirt.webImageUrl
                    ? `center / cover no-repeat url(${shirt.webImageUrl})`
                    : shirtGradient(shirt._id),
                }}
              />
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setEditing(shirt)}
                  className="block truncate text-left text-sm font-bold text-white hover:text-lime"
                >
                  {shirt.name}
                </button>
                {shirt.designer && (
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-[1px] text-faint">
                    by {shirt.designer}
                  </p>
                )}
              </div>
              <span className="font-mono text-xs text-lime">
                {shirt.bidCount} / {shirt.bidThreshold}
              </span>
              <ProgressBar pct={progressPct} />
              <StatusPill status={shirt.status} kind="shirt" />
              <div className="flex gap-2">
                {shirt.status === "draft" && (
                  <ActionButton onClick={() => handleActivate(shirt)}>
                    Activate
                  </ActionButton>
                )}
                {shirt.status === "active" && (
                  <ActionButton onClick={() => handleArchive(shirt)}>
                    Archive
                  </ActionButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditShirtModal shirt={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
}: {
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-border2 px-3 py-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[1px] text-white transition-colors hover:border-pink hover:text-pink"
    >
      {children}
    </button>
  );
}

function EditShirtModal({
  shirt,
  onClose,
}: {
  shirt: Shirt;
  onClose: () => void;
}) {
  const updateShirt = useMutation(api.admin.updateShirt);
  const { showToast } = useToast();
  const [threshold, setThreshold] = useState(String(shirt.bidThreshold));
  const [retailPrice, setRetailPrice] = useState(
    String((shirt.retailPriceCents / 100).toFixed(2))
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateShirt({
        shirtId: shirt._id as Id<"shirts">,
        bidThreshold: Number(threshold) || undefined,
        retailPriceCents: Math.round(Number(retailPrice) * 100) || undefined,
      });
      showToast(`"${shirt.name}" updated`);
      onClose();
    } catch {
      showToast("Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} zIndex={80}>
      <h2 className="font-[family-name:var(--font-display)] text-lg uppercase text-white">
        {shirt.name}
      </h2>
      <div className="mt-5 flex flex-col gap-4">
        <Field label="Bid Threshold">
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full rounded-xl border border-border2 bg-transparent px-4 py-2.5 text-sm text-white focus:border-lime focus:outline-none"
          />
        </Field>
        <Field label="Retail Price ($)">
          <input
            type="number"
            step="0.01"
            value={retailPrice}
            onChange={(e) => setRetailPrice(e.target.value)}
            className="w-full rounded-xl border border-border2 bg-transparent px-4 py-2.5 text-sm text-white focus:border-lime focus:outline-none"
          />
        </Field>
      </div>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          variant="lime"
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
