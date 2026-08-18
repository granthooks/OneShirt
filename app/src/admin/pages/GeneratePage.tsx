import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useToast } from "../../components/Toast";
import { Button } from "../../components/Button";

type Candidate = {
  printMasterId: Id<"_storage">;
  webImageId: Id<"_storage">;
  previewUrl: string | null;
  seed?: number;
};

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const generateDesign = useAction(api.generation.generateDesign);
  const createShirt = useMutation(api.admin.createShirt);
  const { showToast } = useToast();

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setGenerating(true);
    setCandidates([]);
    setSelected(null);
    try {
      const result = await generateDesign({ prompt: trimmed });
      setCandidates(result.candidates);
      setLastPrompt(result.prompt);
      if (result.candidates.length > 0) {
        setSelected(result.candidates[0]);
      }
    } catch (err) {
      if (err instanceof ConvexError && String(err.data).startsWith("NOT_CONFIGURED")) {
        showToast("Fal.ai isn't configured yet — set FAL_KEY in Convex env");
      } else if (err instanceof ConvexError) {
        showToast(String(err.data));
      } else {
        showToast("Generation failed. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleAddToInventory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await createShirt({
        name: trimmed,
        webImageId: selected?.webImageId,
        printMasterId: selected?.printMasterId,
        generationMeta:
          selected && lastPrompt
            ? { prompt: lastPrompt, model: "fal-ai/nano-banana-2", seed: selected.seed }
            : undefined,
      });
      showToast(`"${trimmed}" added as a draft`);
      setName("");
      setCandidates([]);
      setSelected(null);
      setPrompt("");
    } catch {
      showToast("Couldn't add shirt. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="rounded-2xl border border-border bg-panel p-6">
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
          Prompt
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the design you want to generate…"
          rows={4}
          className="w-full resize-none rounded-xl border border-border2 bg-transparent px-4 py-3 text-sm text-white placeholder:text-faint focus:border-lime focus:outline-none"
        />
        <Button
          variant="pink"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="mt-4"
        >
          &#10022; {generating ? "Generating…" : "Generate Design"}
        </Button>
        <p className="mt-3 font-mono text-[9.5px] uppercase tracking-[1.5px] text-faint">
          4 candidates per prompt via fal-ai/nano-banana-2 + background removal
        </p>
      </div>

      {generating && (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-border2 bg-panel/50 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              className="h-8 w-8 rounded-full border-2 border-lime border-t-transparent"
              style={{ animation: "spin 1s linear infinite" }}
            />
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-faint">
              Generating candidates…
            </p>
          </div>
        </div>
      )}

      {!generating && candidates.length > 0 && (
        <div className="rounded-2xl border border-border bg-panel p-6">
          <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
            Pick a candidate
          </p>
          <div className="grid grid-cols-2 gap-3">
            {candidates.map((c, i) => (
              <button
                key={c.printMasterId}
                type="button"
                onClick={() => setSelected(c)}
                className={`overflow-hidden rounded-xl border-2 ${
                  selected?.printMasterId === c.printMasterId
                    ? "border-lime"
                    : "border-border2"
                }`}
              >
                {c.previewUrl ? (
                  <img
                    src={c.previewUrl}
                    alt={`Candidate ${i + 1}`}
                    className="aspect-square w-full object-contain bg-white/5"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center text-xs text-faint">
                    No preview
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-panel p-6">
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[2px] text-faint">
          Shirt Name
        </p>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddToInventory();
            }}
            placeholder="e.g. Neon Static"
            className="flex-1 rounded-xl border border-border2 bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-faint focus:border-lime focus:outline-none"
          />
          <Button
            variant="lime"
            onClick={handleAddToInventory}
            disabled={adding || !name.trim()}
          >
            Add to Inventory
          </Button>
        </div>
        <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[1.5px] text-faint">
          {selected
            ? "Creates a draft shirt with the selected candidate's art."
            : "Creates a draft shirt with no image — add art later from Inventory."}
        </p>
      </div>
    </div>
  );
}
