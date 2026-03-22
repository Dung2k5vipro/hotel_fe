import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Xac nhan",
  isLoading = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      description={description}
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} variant="secondary">
          Huy
        </Button>
        <Button
          disabled={isLoading}
          onClick={onConfirm}
          variant="danger"
        >
          {isLoading ? "Dang xu ly..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
