"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createKhachHang, updateKhachHang } from "@/services/khach-hang";
import type { KhachHang } from "@/types/khach-hang";

type FormMode = "create" | "edit";

type KhachHangFormProps = {
  initialData?: KhachHang | null;
  mode: FormMode;
  onClose: () => void;
  onSuccess: (result: {
    item: KhachHang | null;
    mode: FormMode;
  }) => Promise<void> | void;
  open: boolean;
};

function mapKhachHangFormError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Không thể lưu khách hàng.";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("cccd") &&
    (normalizedMessage.includes("exist") ||
      normalizedMessage.includes("unique") ||
      normalizedMessage.includes("duplicate") ||
      normalizedMessage.includes("tồn tại"))
  ) {
    return "CCCD đã tồn tại trong hệ thống";
  }

  return message;
}

function isValidCccd(value: string) {
  if (!value) {
    return true;
  }

  return /^[0-9]{9,12}$/.test(value);
}

export function KhachHangForm({
  initialData,
  mode,
  onClose,
  onSuccess,
  open,
}: KhachHangFormProps) {
  const [hoTen, setHoTen] = useState("");
  const [cccd, setCccd] = useState("");
  const [thongTinLienHe, setThongTinLienHe] = useState("");
  const [quocTich, setQuocTich] = useState("Việt Nam");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      return;
    }

    setHoTen(initialData?.hoTen ?? "");
    setCccd(initialData?.cccd ?? "");
    setThongTinLienHe(initialData?.thongTinLienHe ?? "");
    setQuocTich(initialData?.quocTich || "Việt Nam");
    setError(null);
  }, [
    initialData,
    initialData?.cccd,
    initialData?.hoTen,
    initialData?.khachHangId,
    initialData?.quocTich,
    initialData?.thongTinLienHe,
    open,
  ]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    const normalizedHoTen = hoTen.trim();
    const normalizedCccd = cccd.trim();
    const normalizedThongTinLienHe = thongTinLienHe.trim();
    const normalizedQuocTich = quocTich.trim() || "Việt Nam";

    if (!normalizedHoTen) {
      setError("Họ tên không được để trống.");
      return;
    }

    if (!isValidCccd(normalizedCccd)) {
      setError("CCCD không hợp lệ. Vui lòng nhập 9 đến 12 chữ số.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        hoTen: normalizedHoTen,
        cccd: normalizedCccd,
        thongTinLienHe: normalizedThongTinLienHe,
        quocTich: normalizedQuocTich,
      };

      if (mode === "edit") {
        if (!initialData) {
          throw new Error("Không tìm thấy dữ liệu khách hàng để cập nhật.");
        }

        const updatedItem = await updateKhachHang(
          initialData.khachHangId,
          payload,
        );

        await onSuccess({
          item: updatedItem,
          mode,
        });
      } else {
        const createdItem = await createKhachHang(payload);

        await onSuccess({
          item: createdItem,
          mode,
        });
      }
    } catch (submitError) {
      setError(mapKhachHangFormError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      description={
        mode === "create"
          ? "Tạo hồ sơ khách hàng mới để phục vụ đặt phòng và tra cứu khách cũ."
          : "Cập nhật thông tin hồ sơ khách hàng hiện có."
      }
      isOpen={open}
      onClose={submitting ? () => undefined : onClose}
      title={mode === "create" ? "Thêm khách hàng" : "Cập nhật khách hàng"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="hoTen">
            Họ tên
          </label>
          <Input
            id="hoTen"
            onChange={(event) => setHoTen(event.target.value)}
            placeholder="Nhập họ tên khách hàng"
            value={hoTen}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="cccd"
            >
              CCCD
            </label>
            <Input
              id="cccd"
              onChange={(event) => setCccd(event.target.value)}
              placeholder=" bắt buộc"
              value={cccd}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="quocTich"
            >
              Quốc tịch
            </label>
            <Input
              id="quocTich"
              onChange={(event) => setQuocTich(event.target.value)}
              placeholder="Ví dụ: Việt Nam"
              value={quocTich}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="thongTinLienHe"
          >
            Thông tin liên hệ
          </label>
          <Input
            id="thongTinLienHe"
            onChange={(event) => setThongTinLienHe(event.target.value)}
            placeholder="Số điện thoại, email hoặc thông tin liên hệ khác"
            value={thongTinLienHe}
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            disabled={submitting}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Hủy
          </Button>
          <Button disabled={submitting} type="submit">
            {submitting
              ? "Đang lưu..."
              : mode === "create"
                ? "Tạo khách hàng"
                : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
