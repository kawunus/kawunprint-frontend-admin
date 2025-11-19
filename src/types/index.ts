export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  telegramAccount?: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT' | 'ANALYST';
  isActive: boolean;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  currentPassword: string;
  newPassword?: string;
}

export interface Order {
  id: number;
  customer: User;
  employee?: User;
  status: string;
  statusId?: number;
  totalPrice: number;
  createdAt: string;
  completedAt?: string;
  comment?: string;
}

export interface OrderHistory {
  id: number;
  status?: string;
  statusId?: number;
  employee: User;
  comment?: string;
  createdAt: string;
}

export interface OrderStatus {
  id: number;
  description: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: T;
}

export interface BaseResponse {
  success: boolean;
  message?: string;
  data?: string;
}

export interface FilamentType {
  id: number;
  name: string;
  description: string;
}

export interface Filament {
  id: number;
  color: string;
  type: FilamentType;
  pricePerGram: number;
  residue: number;
  hexColor: string;
}

export interface CreateFilamentRequest {
  color: string;
  typeId: number;
  pricePerGram: number;
  residue: number;
  hexColor: string;
}

export type UpdateFilamentRequest = CreateFilamentRequest;

export interface CreateFilamentTypeRequest {
  name: string;
  description: string;
}

export type UpdateFilamentTypeRequest = CreateFilamentTypeRequest;

export interface Printer {
  id: number;
  name: string;
  isMulticolor: boolean;
  isActive: boolean;
  description?: string | null;
}

export interface CreatePrinterRequest {
  name: string;
  isMulticolor: boolean;
  isActive?: boolean;
  description?: string | null;
}

export type UpdatePrinterRequest = CreatePrinterRequest;

export interface PrinterHistory {
  id: number;
  printerId: number;
  action?: string;
  comment?: string;
  employeeId?: number;
  employee?: User;
  createdAt?: string;
  occurredAt?: string;
}

export interface OrderFile {
  id: number;
  orderId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: number;
}

export interface OrderFileStats {
  orderId: number;
  totalFiles: number;
  maxFiles: number;
  remainingSlots: number;
  totalSize: number;
  totalSizeFormatted: string;
  canUploadMore: boolean;
  files: OrderFileInfo[];
}

export interface OrderFileInfo {
  id: number;
  fileName: string;
  size: number;
  sizeFormatted: string;
  mimeType: string;
  isImage: boolean;
  uploadedAt: string;
}