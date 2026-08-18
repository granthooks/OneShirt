import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "../../components/Toast";
import { Button } from "../../components/Button";

const NUMERIC_FIELDS: {
  key:
    | "defaultThreshold"
    | "welcomeCredits"
    | "freeSwipesPerDay"
    | "earlyBirdWindow"
    | "earlyBirdWeight"
    | "perUserEntryCapPct"
    | "shirtExpiryDays"
    | "drawDelayMinutes"
    | "defaultRetailCents";
  label: string;
  help: string;
}[] = [
  {
    key: "defaultThreshold",
    label: "Default Threshold",
    help: "Bids needed to trigger a draw for new shirts",
  },
  {
    key: "welcomeCredits",
    label: "Welcome Credits",
    help: "Free credits granted to new signups",
  },
  {
    key: "freeSwipesPerDay",
    label: "Free Swipes / Day",
    help: "Daily free-bid claim amount",
  },
  {
    key: "earlyBirdWindow",
    label: "Early Bird Window",
    help: "Number of early entries that get bonus weight",
  },
  {
    key: "earlyBirdWeight",
    label: "Early Bird Weight",
    help: "Entry weight multiplier during the early-bird window",
  },
  {
    key: "perUserEntryCapPct",
    label: "Per-User Entry Cap %",
    help: "Max % of a shirt's threshold one user can hold",
  },
  {
    key: "shirtExpiryDays",
    label: "Shirt Expiry (days)",
    help: "Days an active shirt runs before expiring unfilled",
  },
  {
    key: "drawDelayMinutes",
    label: "Draw Delay (minutes)",
    help: "Grace period between threshold hit and draw execution",
  },
  {
    key: "defaultRetailCents",
    label: "Default Retail Price (cents)",
    help: "Fallback retail price for new shirts",
  },
];

export default function ConfigPage() {
  const config = useQuery(api.admin.getConfig, {});
  const updateConfig = useMutation(api.admin.updateConfig);
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    const next: Record<string, string> = {};
    for (const field of NUMERIC_FIELDS) {
      next[field.key] = String(config[field.key]);
    }
    setValues(next);
  }, [config]);

  if (config === undefined) {
    return (
      <p className="font-mono text-xs uppercase tracking-[2px] text-faint">
        Loading…
      </p>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Record<string, number> = {};
      for (const field of NUMERIC_FIELDS) {
        const raw = values[field.key];
        const num = Number(raw);
        if (raw !== "" && !Number.isNaN(num)) {
          patch[field.key] = num;
        }
      }
      await updateConfig(patch);
      showToast("Config saved");
    } catch {
      showToast("Couldn't save config. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-panel p-6">
      <div className="grid grid-cols-2 gap-5">
        {NUMERIC_FIELDS.map((field) => (
          <label key={field.key} className="flex flex-col gap-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
              {field.label}
            </span>
            <input
              type="number"
              value={values[field.key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              className="rounded-xl border border-border2 bg-transparent px-4 py-2.5 text-sm text-white focus:border-lime focus:outline-none"
            />
            <span className="text-[11px] text-muted">{field.help}</span>
          </label>
        ))}
      </div>

      <Button
        variant="lime"
        onClick={handleSave}
        disabled={saving}
        className="mt-6"
      >
        Save
      </Button>
    </div>
  );
}
