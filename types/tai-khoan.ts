import { repairVietnameseText } from "@/lib/text";

export type Role = "Admin" | "NhanVien";
export type VaiTro = Role;

export type TaiKhoan = {
  id: number;
  tenDangNhap: string;
  hoTen: string;
  vaiTro: VaiTro;
  trangThai: boolean;
  ngayTao?: string | null;
};

export type CreateTaiKhoanPayload = {
  tenDangNhap: string;
  matKhau: string;
  hoTen: string;
  vaiTro: string;
};

export type UpdateTaiKhoanPayload = {
  hoTen?: string;
  vaiTro?: string;
  trangThai?: boolean;
  matKhau?: string;
};

export type LoginRequest = {
  tenDangNhap: string;
  matKhau: string;
};

export type LoginResponse = {
  token?: unknown;
  accessToken?: unknown;
  user?: unknown;
  User?: unknown;
  taiKhoan?: unknown;
  TaiKhoan?: unknown;
  data?: unknown;
  message?: string;
  error?: string;
};

export type NormalizedLoginResponse = {
  token: string;
  user: TaiKhoan;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = repairVietnameseText(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }

    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "active", "hoatdong", "hoạt động"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "inactive", "khoa", "khóa", "đã khóa"].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function pickString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readString(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function pickNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function normalizeVaiTro(value: unknown): VaiTro {
  const normalized = readString(value);

  if (!normalized) {
    return "NhanVien";
  }

  const loweredValue = normalized.toLowerCase();

  if (loweredValue === "admin") {
    return "Admin";
  }

  if (["nhanvien", "nhân viên", "staff", "employee"].includes(loweredValue)) {
    return "NhanVien";
  }

  return "NhanVien";
}

function isTaiKhoanLikeRecord(value: unknown): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }

  return [
    "TaiKhoan_ID",
    "taiKhoanId",
    "id",
    "TenDangNhap",
    "tenDangNhap",
    "HoTen",
    "hoTen",
    "VaiTro",
    "vaiTro",
    "TrangThai",
    "trangThai",
  ].some((key) => key in value);
}

function unwrapRecord(input: unknown, depth = 0): UnknownRecord | null {
  if (!isRecord(input) || depth > 6) {
    return null;
  }

  if (isTaiKhoanLikeRecord(input)) {
    return input;
  }

  const source = input as UnknownRecord;
  const nestedCandidates = [
    source.data,
    source.item,
    source.result,
    source.payload,
    source.user,
    source.User,
    source.taiKhoan,
    source.TaiKhoan,
    source.account,
    source.Account,
    source.dataValues,
  ];

  for (const candidate of nestedCandidates) {
    const unwrapped = unwrapRecord(candidate, depth + 1);

    if (unwrapped) {
      return unwrapped;
    }
  }

  return source;
}

export function normalizeUser(input: unknown): TaiKhoan {
  const record = unwrapRecord(input);

  if (!record) {
    throw new Error("Không đọc được dữ liệu tài khoản.");
  }

  const id = pickNumber(record, [
    "id",
    "ID",
    "taiKhoanId",
    "TaiKhoan_ID",
    "TaiKhoanId",
    "TaiKhoanID",
    "tai_khoan_id",
    "userId",
    "UserId",
  ]);
  const tenDangNhap = pickString(record, [
    "tenDangNhap",
    "TenDangNhap",
    "ten_dang_nhap",
    "username",
    "userName",
    "login",
  ]);
  const hoTen =
    pickString(record, [
      "hoTen",
      "HoTen",
      "ho_ten",
      "fullName",
      "name",
    ]) ?? tenDangNhap;
  const vaiTro = normalizeVaiTro(
    record.vaiTro ?? record.VaiTro ?? record.role ?? record.Role,
  );
  const trangThai =
    readBoolean(
      record.trangThai ??
        record.TrangThai ??
        record.status ??
        record.Status ??
        record.isActive,
    ) ?? true;
  const ngayTao =
    pickString(record, ["ngayTao", "NgayTao", "createdAt", "CreatedAt"]) ??
    null;

  if (id === null && tenDangNhap === null && hoTen === null) {
    throw new Error("Dữ liệu tài khoản trả về không hợp lệ.");
  }

  return {
    id: id ?? 0,
    tenDangNhap: tenDangNhap ?? hoTen ?? "unknown",
    hoTen: hoTen ?? tenDangNhap ?? "Người dùng",
    vaiTro,
    trangThai,
    ngayTao,
  };
}

export const normalizeTaiKhoan = normalizeUser;

function extractUserCandidate(
  source: UnknownRecord,
  dataRecord: UnknownRecord | null,
) {
  const directCandidates = [
    source.user,
    source.User,
    source.taiKhoan,
    source.TaiKhoan,
  ];

  for (const candidate of directCandidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }

  if (dataRecord) {
    const nestedCandidates = [
      dataRecord.user,
      dataRecord.User,
      dataRecord.taiKhoan,
      dataRecord.TaiKhoan,
    ];

    for (const candidate of nestedCandidates) {
      if (candidate !== undefined && candidate !== null) {
        return candidate;
      }
    }

    if (isTaiKhoanLikeRecord(dataRecord)) {
      return dataRecord;
    }
  }

  if (isTaiKhoanLikeRecord(source)) {
    return source;
  }

  return null;
}

export function normalizeLoginResponse(
  input: LoginResponse | unknown,
): NormalizedLoginResponse {
  if (!isRecord(input)) {
    throw new Error("Phản hồi đăng nhập không hợp lệ.");
  }

  const dataRecord = isRecord(input.data) ? input.data : null;
  const token =
    readString(input.token) ??
    readString(input.accessToken) ??
    readString(dataRecord?.token) ??
    readString(dataRecord?.accessToken);

  if (!token) {
    throw new Error("Không tìm thấy token trong phản hồi đăng nhập.");
  }

  const userCandidate = extractUserCandidate(input, dataRecord);

  if (!userCandidate) {
    throw new Error(
      "Đăng nhập thành công nhưng backend chưa trả thông tin tài khoản.",
    );
  }

  return {
    token,
    user: normalizeUser(userCandidate),
  };
}
