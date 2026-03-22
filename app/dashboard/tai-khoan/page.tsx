"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatDateTimeVN } from "@/lib/hotel";
import { repairVietnameseText } from "@/lib/text";
import { isAdmin } from "@/services/auth";
import {
  createTaiKhoan,
  deleteTaiKhoan,
  getTaiKhoanList,
  updateTaiKhoan,
} from "@/services/tai-khoan";
import type {
  CreateTaiKhoanPayload,
  TaiKhoan,
  UpdateTaiKhoanPayload,
} from "@/types/tai-khoan";

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type EditFormState = {
  hoTen: string;
  vaiTro: string;
  trangThai: boolean;
  matKhau: string;
};

const DEFAULT_CREATE_FORM: CreateTaiKhoanPayload = {
  tenDangNhap: "",
  matKhau: "",
  hoTen: "",
  vaiTro: "NhanVien",
};

const DEFAULT_EDIT_FORM: EditFormState = {
  hoTen: "",
  vaiTro: "NhanVien",
  trangThai: true,
  matKhau: "",
};

function normalizeMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const normalized = repairVietnameseText(error.message).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function sortTaiKhoanList(list: TaiKhoan[]) {
  return [...list].sort((currentItem, nextItem) => nextItem.id - currentItem.id);
}

function upsertTaiKhoan(list: TaiKhoan[], item: TaiKhoan) {
  const existed = list.some((currentItem) => currentItem.id === item.id);

  if (!existed) {
    return sortTaiKhoanList([item, ...list]);
  }

  return sortTaiKhoanList(
    list.map((currentItem) => (currentItem.id === item.id ? item : currentItem)),
  );
}

function getVaiTroLabel(vaiTro: string) {
  const normalized = vaiTro.trim().toLowerCase();

  if (normalized === "admin") {
    return "Admin";
  }

  if (["nhanvien", "nhân viên", "staff", "employee"].includes(normalized)) {
    return "Nhân viên";
  }

  return vaiTro;
}

function getVaiTroTone(vaiTro: string): "warning" | "default" {
  return vaiTro.trim().toLowerCase() === "admin" ? "warning" : "default";
}

function toVaiTro(value: string) {
  return value.trim().toLowerCase() === "admin" ? "Admin" : "NhanVien";
}

function getCurrentUserRef(user: TaiKhoan | null) {
  const id = typeof user?.id === "number" && Number.isFinite(user.id) ? user.id : null;
  const tenDangNhap = user?.tenDangNhap?.trim().toLowerCase() ?? "";

  return { id, tenDangNhap };
}

export default function TaiKhoanPage() {
  const user = useAuthUser();
  const [hydrated, setHydrated] = useState(false);
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [createForm, setCreateForm] = useState<CreateTaiKhoanPayload>(
    DEFAULT_CREATE_FORM,
  );
  const [creating, setCreating] = useState(false);

  const [editItem, setEditItem] = useState<TaiKhoan | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(DEFAULT_EDIT_FORM);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const [deleteItem, setDeleteItem] = useState<TaiKhoan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const requestIdRef = useRef(0);
  const canManage = isAdmin(user);
  const currentUserRef = useMemo(() => getCurrentUserRef(user), [user]);
  const isEditingSelf = useMemo(() => {
    if (!editItem) {
      return false;
    }

    const byId = currentUserRef.id !== null && editItem.id === currentUserRef.id;
    const byUsername =
      currentUserRef.tenDangNhap.length > 0 &&
      editItem.tenDangNhap.trim().toLowerCase() === currentUserRef.tenDangNhap;

    return byId || byUsername;
  }, [currentUserRef.id, currentUserRef.tenDangNhap, editItem]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loadTaiKhoanList = useCallback(
    async (showLoading = true) => {
      if (!canManage) {
        return;
      }

      const requestId = ++requestIdRef.current;

      if (showLoading) {
        setLoading(true);
      }

      try {
        const list = await getTaiKhoanList();

        if (requestId !== requestIdRef.current) {
          return;
        }

        setTaiKhoanList(sortTaiKhoanList(list));
        setError(null);
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(
          normalizeMessage(loadError, "Không thể tải danh sách tài khoản."),
        );
      } finally {
        if (showLoading && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [canManage],
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!canManage) {
      requestIdRef.current += 1;
      setTaiKhoanList([]);
      setLoading(false);
      setError(null);
      return;
    }

    void loadTaiKhoanList(true);
  }, [canManage, hydrated, loadTaiKhoanList]);

  const stats = useMemo(() => {
    const adminCount = taiKhoanList.filter(
      (item) => item.vaiTro.trim().toLowerCase() === "admin",
    ).length;
    const lockedCount = taiKhoanList.filter((item) => !item.trangThai).length;

    return {
      total: taiKhoanList.length,
      adminCount,
      staffCount: taiKhoanList.length - adminCount,
      lockedCount,
    };
  }, [taiKhoanList]);

  function isCurrentAccount(item: TaiKhoan) {
    const byId = currentUserRef.id !== null && item.id === currentUserRef.id;
    const byUsername =
      currentUserRef.tenDangNhap.length > 0 &&
      item.tenDangNhap.trim().toLowerCase() === currentUserRef.tenDangNhap;

    return byId || byUsername;
  }

  function guardAdminAction() {
    if (canManage) {
      return true;
    }

    setFeedback({
      type: "error",
      message: "Bạn không có quyền thực hiện thao tác quản trị tài khoản.",
    });
    return false;
  }

  function openEditModal(item: TaiKhoan) {
    if (!guardAdminAction()) {
      return;
    }

    setFeedback(null);
    setEditItem(item);
    setEditForm({
      hoTen: item.hoTen,
      vaiTro: item.vaiTro,
      trangThai: item.trangThai,
      matKhau: "",
    });
    setEditOpen(true);
  }

  function closeEditModal() {
    if (editing) {
      return;
    }

    setEditOpen(false);
    setEditItem(null);
    setEditForm(DEFAULT_EDIT_FORM);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardAdminAction() || creating) {
      return;
    }

    const tenDangNhap = createForm.tenDangNhap.trim();
    const hoTen = createForm.hoTen.trim();
    const vaiTro = createForm.vaiTro.trim();
    const matKhau = createForm.matKhau;

    if (!tenDangNhap) {
      setFeedback({ type: "error", message: "Tên đăng nhập là bắt buộc." });
      return;
    }

    if (!hoTen) {
      setFeedback({ type: "error", message: "Họ tên là bắt buộc." });
      return;
    }

    if (!vaiTro) {
      setFeedback({ type: "error", message: "Vai trò là bắt buộc." });
      return;
    }

    if (!matKhau.trim()) {
      setFeedback({
        type: "error",
        message: "Mật khẩu là bắt buộc khi tạo mới tài khoản.",
      });
      return;
    }

    setCreating(true);
    setFeedback(null);

    try {
      const createdItem = await createTaiKhoan({
        tenDangNhap,
        hoTen,
        vaiTro,
        matKhau,
      });

      if (createdItem) {
        setTaiKhoanList((currentList) => upsertTaiKhoan(currentList, createdItem));
      }

      setCreateForm({
        tenDangNhap: "",
        hoTen: "",
        matKhau: "",
        vaiTro: "NhanVien",
      });

      setFeedback({
        type: "success",
        message: "Tạo tài khoản thành công.",
      });

      void loadTaiKhoanList(false);
    } catch (createError) {
      setFeedback({
        type: "error",
        message: normalizeMessage(createError, "Không thể tạo tài khoản."),
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guardAdminAction() || editing || !editItem) {
      return;
    }

    const normalizedHoTen = editForm.hoTen.trim();
    const normalizedVaiTro = editForm.vaiTro.trim();
    const normalizedMatKhau = editForm.matKhau.trim();

    if (!normalizedHoTen) {
      setFeedback({ type: "error", message: "Họ tên là bắt buộc." });
      return;
    }

    if (!isEditingSelf && !normalizedVaiTro) {
      setFeedback({ type: "error", message: "Vai trò là bắt buộc." });
      return;
    }

    if (
      isEditingSelf &&
      (normalizedVaiTro !== editItem.vaiTro || editForm.trangThai !== editItem.trangThai)
    ) {
      setFeedback({
        type: "error",
        message:
          "Bạn không được tự thay đổi vai trò hoặc trạng thái của chính mình.",
      });
      return;
    }

    const payload: UpdateTaiKhoanPayload = {
      hoTen: normalizedHoTen,
    };

    if (!isEditingSelf) {
      payload.vaiTro = normalizedVaiTro;
      payload.trangThai = editForm.trangThai;
    }

    if (normalizedMatKhau.length > 0) {
      payload.matKhau = normalizedMatKhau;
    }

    setEditing(true);
    setFeedback(null);

    try {
      const updatedItem = await updateTaiKhoan(editItem.id, payload);

      if (updatedItem) {
        setTaiKhoanList((currentList) => upsertTaiKhoan(currentList, updatedItem));
      } else {
        setTaiKhoanList((currentList) =>
          currentList.map((item) => {
            if (item.id !== editItem.id) {
              return item;
            }

            return {
              ...item,
              hoTen: normalizedHoTen,
              vaiTro: payload.vaiTro ? toVaiTro(payload.vaiTro) : item.vaiTro,
              trangThai:
                typeof payload.trangThai === "boolean"
                  ? payload.trangThai
                  : item.trangThai,
            };
          }),
        );
      }

      setFeedback({
        type: "success",
        message: "Cập nhật tài khoản thành công.",
      });

      closeEditModal();
      void loadTaiKhoanList(false);
    } catch (updateError) {
      setFeedback({
        type: "error",
        message: normalizeMessage(updateError, "Không thể cập nhật tài khoản."),
      });
    } finally {
      setEditing(false);
    }
  }

  async function handleToggleTrangThai(item: TaiKhoan) {
    if (!guardAdminAction()) {
      return;
    }

    if (isCurrentAccount(item)) {
      setFeedback({
        type: "error",
        message: "Bạn không được tự khóa/mở tài khoản của chính mình.",
      });
      return;
    }

    setTogglingId(item.id);
    setFeedback(null);

    try {
      const updatedItem = await updateTaiKhoan(item.id, {
        trangThai: !item.trangThai,
      });

      if (updatedItem) {
        setTaiKhoanList((currentList) => upsertTaiKhoan(currentList, updatedItem));
      } else {
        setTaiKhoanList((currentList) =>
          currentList.map((currentItem) =>
            currentItem.id === item.id
              ? { ...currentItem, trangThai: !item.trangThai }
              : currentItem,
          ),
        );
      }

      setFeedback({
        type: "success",
        message: !item.trangThai
          ? "Mở khóa tài khoản thành công."
          : "Khóa tài khoản thành công.",
      });

      void loadTaiKhoanList(false);
    } catch (toggleError) {
      setFeedback({
        type: "error",
        message: normalizeMessage(toggleError, "Không thể cập nhật trạng thái tài khoản."),
      });
    } finally {
      setTogglingId(null);
    }
  }

  function requestDelete(item: TaiKhoan) {
    if (!guardAdminAction()) {
      return;
    }

    if (isCurrentAccount(item)) {
      setFeedback({
        type: "error",
        message: "Bạn không được tự xóa tài khoản của chính mình.",
      });
      return;
    }

    setDeleteItem(item);
  }

  async function handleDelete() {
    if (!guardAdminAction() || !deleteItem || deleting) {
      return;
    }

    if (isCurrentAccount(deleteItem)) {
      setDeleteItem(null);
      setFeedback({
        type: "error",
        message: "Bạn không được tự xóa tài khoản của chính mình.",
      });
      return;
    }

    const targetId = deleteItem.id;

    setDeleting(true);
    setFeedback(null);

    try {
      await deleteTaiKhoan(targetId);

      setTaiKhoanList((currentList) =>
        currentList.filter((item) => item.id !== targetId),
      );

      if (editItem?.id === targetId) {
        closeEditModal();
      }

      setDeleteItem(null);
      setFeedback({ type: "success", message: "Xóa tài khoản thành công." });

      void loadTaiKhoanList(false);
    } catch (deleteError) {
      setFeedback({
        type: "error",
        message: normalizeMessage(deleteError, "Không thể xóa tài khoản."),
      });
    } finally {
      setDeleting(false);
    }
  }

  if (!hydrated) {
    return (
      <section className="space-y-6">
        <PageHeader
          description="Quản lý tài khoản và phân quyền nhân viên trong hệ thống khách sạn."
          title="Quản lý tài khoản"
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          Đang kiểm tra quyền truy cập...
        </div>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="space-y-6">
        <PageHeader
          description="Module này chỉ dành cho Admin để quản lý tài khoản và phân quyền nhân viên."
          title="Quản lý tài khoản"
        />
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Bạn không có quyền truy cập module này.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        action={
          <Button
            disabled={loading}
            onClick={() => {
              void loadTaiKhoanList(true);
            }}
            variant="secondary"
          >
            Làm mới danh sách
          </Button>
        }
        description="Quản trị tài khoản nhân viên, phân quyền vai trò và kiểm soát trạng thái hoạt động."
        title="Quản lý tài khoản"
      />

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng tài khoản</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Admin</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.adminCount}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Nhân viên</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.staffCount}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đã khóa</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {stats.lockedCount}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Tạo tài khoản mới</h2>
        <p className="mt-2 text-sm text-slate-600">
          Chỉ Admin được phép tạo tài khoản mới và gán vai trò cho nhân viên.
        </p>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="tenDangNhap">
              Tên đăng nhập
            </label>
            <Input
              id="tenDangNhap"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  tenDangNhap: event.target.value,
                }))
              }
              placeholder="Nhập tên đăng nhập"
              value={createForm.tenDangNhap}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="hoTen">
              Họ tên
            </label>
            <Input
              id="hoTen"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  hoTen: event.target.value,
                }))
              }
              placeholder="Nhập họ tên"
              value={createForm.hoTen}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="matKhau">
              Mật khẩu
            </label>
            <Input
              id="matKhau"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  matKhau: event.target.value,
                }))
              }
              placeholder="Nhập mật khẩu"
              type="password"
              value={createForm.matKhau}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="vaiTro">
              Vai trò
            </label>
            <Select
              id="vaiTro"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  vaiTro: event.target.value,
                }))
              }
              value={createForm.vaiTro}
            >
              <option value="NhanVien">Nhân viên</option>
              <option value="Admin">Admin</option>
            </Select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <Button disabled={creating} type="submit">
              {creating ? "Đang tạo..." : "Tạo tài khoản"}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Danh sách tài khoản</h2>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Đang tải danh sách tài khoản...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : taiKhoanList.length === 0 ? (
          <EmptyState
            description="Chưa có tài khoản nào trong hệ thống. Hãy tạo tài khoản đầu tiên để bắt đầu."
            title="Danh sách tài khoản đang trống"
          />
        ) : (
          <DataTable
            head={
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Mã tài khoản
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Tên đăng nhập
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Họ tên
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Vai trò
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                  Thao tác
                </th>
              </tr>
            }
          >
            {taiKhoanList.map((item) => {
              const selfAccount = isCurrentAccount(item);

              return (
                <tr key={item.id} className="bg-white">
                  <td className="px-4 py-4 text-slate-900">{item.id}</td>
                  <td className="px-4 py-4 text-slate-900">{item.tenDangNhap}</td>
                  <td className="px-4 py-4 text-slate-900">{item.hoTen}</td>
                  <td className="px-4 py-4 text-slate-900">
                    <Badge tone={getVaiTroTone(item.vaiTro)}>
                      {getVaiTroLabel(item.vaiTro)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-slate-900">
                    <Badge tone={item.trangThai ? "success" : "danger"}>
                      {item.trangThai ? "Hoạt động" : "Đã khóa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-slate-900">
                    {formatDateTimeVN(item.ngayTao ?? null)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEditModal(item)} variant="secondary">
                        Sửa
                      </Button>
                      <Button
                        disabled={selfAccount || togglingId === item.id}
                        onClick={() => {
                          void handleToggleTrangThai(item);
                        }}
                        title={
                          selfAccount
                            ? "Không thể tự khóa/mở tài khoản của chính bạn"
                            : undefined
                        }
                        variant="ghost"
                      >
                        {togglingId === item.id
                          ? "Đang xử lý..."
                          : item.trangThai
                            ? "Khóa"
                            : "Mở khóa"}
                      </Button>
                      <Button
                        disabled={selfAccount || deleting}
                        onClick={() => requestDelete(item)}
                        title={
                          selfAccount
                            ? "Không thể tự xóa tài khoản của chính bạn"
                            : undefined
                        }
                        variant="danger"
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      <Modal
        description="Cập nhật thông tin tài khoản, vai trò, trạng thái hoặc mật khẩu mới."
        isOpen={editOpen}
        onClose={closeEditModal}
        title="Cập nhật tài khoản"
      >
        <form className="space-y-4" onSubmit={handleUpdate}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="edit-ten-dang-nhap"
            >
              Tên đăng nhập
            </label>
            <Input
              disabled
              id="edit-ten-dang-nhap"
              value={editItem?.tenDangNhap ?? ""}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-ho-ten">
              Họ tên
            </label>
            <Input
              id="edit-ho-ten"
              onChange={(event) =>
                setEditForm((current) => ({ ...current, hoTen: event.target.value }))
              }
              placeholder="Nhập họ tên"
              value={editForm.hoTen}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="edit-vai-tro"
              >
                Vai trò
              </label>
              <Select
                disabled={isEditingSelf}
                id="edit-vai-tro"
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, vaiTro: event.target.value }))
                }
                value={editForm.vaiTro}
              >
                <option value="NhanVien">Nhân viên</option>
                <option value="Admin">Admin</option>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="edit-trang-thai"
              >
                Trạng thái
              </label>
              <Select
                disabled={isEditingSelf}
                id="edit-trang-thai"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    trangThai: event.target.value === "true",
                  }))
                }
                value={String(editForm.trangThai)}
              >
                <option value="true">Hoạt động</option>
                <option value="false">Đã khóa</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="edit-mat-khau"
            >
              Mật khẩu mới (không bắt buộc)
            </label>
            <Input
              id="edit-mat-khau"
              onChange={(event) =>
                setEditForm((current) => ({ ...current, matKhau: event.target.value }))
              }
              placeholder="Để trống nếu không đổi mật khẩu"
              type="password"
              value={editForm.matKhau}
            />
          </div>

          {isEditingSelf ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Bạn chỉ được cập nhật họ tên hoặc mật khẩu của chính mình. Vai trò và
              trạng thái bị khóa để đảm bảo an toàn phiên quản trị.
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={closeEditModal} type="button" variant="secondary">
              Hủy
            </Button>
            <Button disabled={editing} type="submit">
              {editing ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Xóa tài khoản"
        description={
          deleteItem
            ? `Bạn có chắc muốn xóa tài khoản "${deleteItem.tenDangNhap}"?`
            : ""
        }
        isLoading={deleting}
        isOpen={Boolean(deleteItem)}
        onClose={() => {
          if (!deleting) {
            setDeleteItem(null);
          }
        }}
        onConfirm={() => {
          void handleDelete();
        }}
        title="Xác nhận xóa tài khoản"
      />
    </section>
  );
}
