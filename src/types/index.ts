export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
  isActive: boolean;
}

export interface Order {
  id: number;
  customer: User;
  employee?: User;
  status: string;
  totalPrice: number;
  createdAt: string;
  completedAt?: string;
  comment?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: T; // Добавляем message поле
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

export interface UpdateFilamentRequest extends CreateFilamentRequest {}

export interface CreateFilamentTypeRequest {
  name: string;
  description: string;
}

export interface UpdateFilamentTypeRequest extends CreateFilamentTypeRequest {}