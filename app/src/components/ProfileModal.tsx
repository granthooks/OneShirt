import { AnimatePresence } from "framer-motion";
import { Modal } from "./Modal";
import { ProfileForm } from "./ProfileForm";
import type { Doc } from "../../convex/_generated/dataModel";

/** Profile edit overlay (header dropdown, win flow). See `ProfileForm` for the fields. */
export function ProfileModal({
  user,
  onClose,
}: {
  user: Doc<"users">;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      <Modal onClose={onClose} zIndex={80}>
        <ProfileForm user={user} onCancel={onClose} />
      </Modal>
    </AnimatePresence>
  );
}
