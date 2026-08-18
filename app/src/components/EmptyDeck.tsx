export function EmptyDeck() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-border2 px-6 text-center">
      <h2 className="font-[family-name:var(--font-display)] text-2xl uppercase text-lime">
        All Done!
      </h2>
      <p className="text-sm text-muted">
        Check back later for new shirts, or claim your daily free swipes in
        the meantime.
      </p>
    </div>
  );
}
