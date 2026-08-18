import { PageShell } from "../components/PageShell";

export default function RulesPage() {
  return (
    <PageShell title="How it works">
      <div className="flex flex-col gap-5 text-sm text-muted">
        <Section title="Credits">
          <p>
            1 credit = 1 swipe-right bid. Credits are never destroyed by
            bidding — a credit spent on a bid converts to store credit at
            identical value, redeemable toward any purchase, forever.
          </p>
          <p>
            Every player gets free welcome credits plus 5 free swipes a day,
            no purchase required. Free swipes are identical entries with
            identical odds.
          </p>
        </Section>

        <Section title="Shirts & thresholds">
          <p>
            Every shirt shows a visible bid target and a live bid count —
            never hidden or fuzzed. When a shirt's threshold is reached, it
            moves to drawing.
          </p>
          <p>
            The first 100 bids on a shirt count as 2 entries each (still 1
            credit) — an early-bird bonus, disclosed on the card.
          </p>
          <p>
            A per-user entry cap (10% of the threshold) keeps every draw
            winnable — once you hit it, further bids on that shirt are
            blocked.
          </p>
          <p>
            If a shirt doesn't reach its threshold within 30 days, it
            expires and all staked credits on it return to your available
            balance.
          </p>
        </Section>

        <Section title="The draw">
          <p>
            When a shirt's threshold is crossed, one entry is picked
            uniformly at random from every entry on that shirt using a
            cryptographically secure random number generator. A user with
            12 entries has 12 tickets. Odds are identical regardless of when
            the bid was placed (after the early-bird window) — bid #5 and
            bid #600 have the same odds.
          </p>
          <p>
            The winner receives the shirt free, including standard shipping.
            Everyone else's staked credits on that shirt return to
            available.
          </p>
        </Section>

        <Section title="Buy it now">
          <p>
            Any active shirt can be bought at retail price at any time,
            using your available and staked credits first. Redeeming staked
            credit toward a purchase withdraws the corresponding entries
            from that shirt's draw.
          </p>
        </Section>

        <Section title="Fair play">
          <ul className="list-disc space-y-1 pl-5">
            <li>No fabricated activity of any kind — no fake bids, no fake winners.</li>
            <li>Draws are uniformly random, logged, and auditable.</li>
            <li>Threshold, bid counts, and odds are fully disclosed.</li>
            <li>Winners pay nothing — no shipping charge on prizes.</li>
            <li>You must be 18+ and a US resident to play.</li>
          </ul>
        </Section>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 font-[family-name:var(--font-display)] text-sm uppercase text-lime">
        {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
