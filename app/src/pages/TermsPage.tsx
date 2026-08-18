import { PageShell } from "../components/PageShell";

export default function TermsPage() {
  return (
    <PageShell title="Terms">
      <div className="flex flex-col gap-3 text-sm text-muted">
        <p>
          These Terms of Service and the official sweepstakes rules are
          being finalized. This placeholder will be replaced with the full,
          lawyer-reviewed terms before real-money purchases go live.
        </p>
        <p>
          In the meantime: you must be 18 or older and a US resident to
          participate. No purchase is necessary to enter or win — see the{" "}
          <a href="/rules" className="text-lime underline">
            Rules
          </a>{" "}
          page for free daily entries.
        </p>
      </div>
    </PageShell>
  );
}
