"use client";

import { Button } from "@/components/ui/button";
import type { DatPhong } from "@/types/dat-phong";

export type DatPhongStatusActionType = "checkIn" | "checkOut" | "cancel";

type DatPhongStatusActionProps = {
  datPhong: DatPhong;
  canManage: boolean;
  loadingAction: {
    datPhongId: number;
    action: DatPhongStatusActionType;
  } | null;
  onCheckIn: (id: number) => Promise<DatPhong | null>;
  onCheckOut: (id: number) => Promise<DatPhong | null>;
  onCancel: (id: number) => Promise<DatPhong | null>;
  onSuccess: (result: {
    action: DatPhongStatusActionType;
    item: DatPhong | null;
  }) => Promise<void> | void;
  onError: (error: unknown) => void;
};

function isCurrentActionLoading(
  loadingAction: DatPhongStatusActionProps["loadingAction"],
  datPhongId: number,
  action: DatPhongStatusActionType,
) {
  return (
    loadingAction?.datPhongId === datPhongId && loadingAction.action === action
  );
}

export function DatPhongStatusAction({
  datPhong,
  canManage,
  loadingAction,
  onCheckIn,
  onCheckOut,
  onCancel,
  onSuccess,
  onError,
}: DatPhongStatusActionProps) {
  if (!canManage) {
    return null;
  }

  async function handleAction(action: DatPhongStatusActionType) {
    if (loadingAction !== null) {
      return;
    }

    let confirmed = false;

    if (action === "checkIn") {
      confirmed = window.confirm(
        `Xác nhận check-in đặt phòng #${datPhong.datPhongId}?`,
      );
    } else if (action === "checkOut") {
      confirmed = window.confirm(
        `Xác nhận check-out đặt phòng #${datPhong.datPhongId}?`,
      );
    } else {
      confirmed = window.confirm(
        `Xác nhận hủy đặt phòng #${datPhong.datPhongId}?`,
      );
    }

    if (!confirmed) {
      return;
    }

    try {
      let updatedItem: DatPhong | null = null;

      if (action === "checkIn") {
        updatedItem = await onCheckIn(datPhong.datPhongId);
      } else if (action === "checkOut") {
        updatedItem = await onCheckOut(datPhong.datPhongId);
      } else {
        updatedItem = await onCancel(datPhong.datPhongId);
      }

      await onSuccess({
        action,
        item: updatedItem,
      });
    } catch (error) {
      onError(error);
    }
  }

  if (datPhong.trangThai === "DatTruoc") {
    return (
      <>
        <Button
          disabled={loadingAction !== null}
          onClick={() => {
            void handleAction("checkIn");
          }}
          variant="secondary"
        >
          {isCurrentActionLoading(loadingAction, datPhong.datPhongId, "checkIn")
            ? "Đang check-in..."
            : "Check-in"}
        </Button>
        <Button
          disabled={loadingAction !== null}
          onClick={() => {
            void handleAction("cancel");
          }}
          variant="danger"
        >
          {isCurrentActionLoading(loadingAction, datPhong.datPhongId, "cancel")
            ? "Đang hủy..."
            : "Hủy"}
        </Button>
      </>
    );
  }

  if (datPhong.trangThai === "DaNhanPhong") {
    return (
      <Button
        disabled={loadingAction !== null}
        onClick={() => {
          void handleAction("checkOut");
        }}
        variant="secondary"
      >
        {isCurrentActionLoading(loadingAction, datPhong.datPhongId, "checkOut")
          ? "Đang check-out..."
          : "Check-out"}
      </Button>
    );
  }

  return null;
}
