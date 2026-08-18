import { PageShell } from "../components/PageShell";
import { ProfileForm } from "../components/ProfileForm";
import { SignedOutState } from "../components/SignedOutState";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function ProfilePage() {
  const { user } = useCurrentUser();

  if (!user) {
    return (
      <PageShell title="Profile">
        <SignedOutState label="Log in to view and edit your profile." />
      </PageShell>
    );
  }

  return (
    <PageShell title="Profile">
      <div className="rounded-[20px] border border-border bg-panel p-6">
        <ProfileForm user={user} />
      </div>
    </PageShell>
  );
}
