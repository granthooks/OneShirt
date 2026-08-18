import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./Button";
import type { Doc } from "../../convex/_generated/dataModel";

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"] as const;

/**
 * Profile edit form — name, size, shipping address. Shared by `ProfileModal`
 * (overlay, e.g. opened from the header dropdown or the win flow) and
 * `ProfilePage` (rendered inline in normal page flow at /profile). Layout
 * only; the caller supplies the surrounding container (modal card vs. page
 * column) and an optional Cancel action.
 */
export function ProfileForm({
  user,
  onCancel,
  onSaved,
}: {
  user: Doc<"users">;
  onCancel?: () => void;
  onSaved?: () => void;
}) {
  const addresses = useQuery(api.addresses.list, {});
  const updateProfile = useMutation(api.users.updateProfile);
  const upsertAddress = useMutation(api.addresses.upsert);

  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const [name, setName] = useState(user.name);
  const [size, setSize] = useState<(typeof SIZES)[number] | "">(
    user.shirtSize ?? ""
  );
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [zip, setZip] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (defaultAddress) {
      setAddress1(defaultAddress.address1);
      setAddress2(defaultAddress.address2 ?? "");
      setCity(defaultAddress.city);
      setRegion(defaultAddress.region);
      setZip(defaultAddress.zip);
    }
  }, [defaultAddress]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name,
        shirtSize: size === "" ? undefined : size,
      });
      if (address1 && city && region && zip) {
        const [firstName, ...rest] = name.trim().split(/\s+/);
        await upsertAddress({
          addressId: defaultAddress?._id,
          firstName: firstName || name,
          lastName: rest.join(" ") || "-",
          address1,
          address2: address2 || undefined,
          city,
          region,
          zip,
          country: "US",
          isDefault: true,
        });
      }
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-16 w-16 rounded-full"
          style={{ background: "linear-gradient(135deg,#ff2d78,#7b2ff7)" }}
        />
        <button
          type="button"
          disabled
          className="rounded-full border border-border2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[1px] text-muted"
        >
          Change avatar
        </button>
      </div>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
        />
      </Field>

      <Field label="Email">
        <input
          value={user.email}
          disabled
          className="w-full rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-muted"
        />
      </Field>

      <Field label="Size">
        <select
          value={size}
          onChange={(e) => setSize(e.target.value as (typeof SIZES)[number])}
          className="w-full rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
        >
          <option value="">Select size</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Shipping address">
        <div className="flex flex-col gap-2">
          <input
            placeholder="Address line 1"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            className="w-full rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
          />
          <input
            placeholder="Address line 2 (optional)"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            className="w-full rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
          />
          <div className="flex gap-2">
            <input
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-1/2 rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
            />
            <input
              placeholder="State"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-1/4 rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
            />
            <input
              placeholder="ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-1/4 rounded-xl border border-border2 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-lime"
            />
          </div>
        </div>
      </Field>

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" variant="lime" disabled={saving} className="flex-1">
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </Button>
      </div>

      <p className="text-center font-mono text-[9.5px] uppercase tracking-[1px] text-faint">
        winners get shirts shipped — keep this current
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
