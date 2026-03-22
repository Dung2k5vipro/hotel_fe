import { Badge } from "@/components/ui/badge";
import {
  getTrangThaiPhongLabel,
  getTrangThaiPhongVariant,
} from "@/lib/hotel";
import type { TrangThaiPhong } from "@/types/phong";

type StatusBadgeProps = {
  status: TrangThaiPhong;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge tone={getTrangThaiPhongVariant(status)}>
      {getTrangThaiPhongLabel(status)}
    </Badge>
  );
}
