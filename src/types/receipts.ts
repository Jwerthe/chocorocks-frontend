// src/types/receipts.ts
// Import necessary types
import { UserResponse, ClientResponse, SaleResponse, StoreResponse } from './index';

export enum ReceiptStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  VOIDED = 'VOIDED'
}

export interface ReceiptRequest {
  receiptNumber: string;
  userId: number;
  clientId?: number;
  saleId: number;
  storeId: number;
  receiptStatus?: ReceiptStatus;
  paymentMethod?: string;
  additionalNotes?: string;
  customerName?: string;
  customerIdentification?: string;
}

export interface ReceiptResponse {
  id: number;
  receiptNumber: string;
  user: UserResponse;
  client?: ClientResponse;
  sale: SaleResponse;
  store: StoreResponse;
  issueDate: string;
  receiptStatus: ReceiptStatus;
  subtotal: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  additionalNotes?: string;
  customerName?: string;
  customerIdentification?: string;
  isPrinted: boolean;
  printCount: number;
  createdAt: string;
}

export interface CompleteWithReceiptRequest {
  paymentMethod?: string;
  additionalNotes?: string;
  customerName?: string;
  customerIdentification?: string;
  sendEmail?: boolean;
  recipientEmail?: string;
}

export interface ReceiptXmlDto {
  receiptNumber: string;
  issueDate: string;
  status: string;
  store: StoreXmlDto;
  user: UserXmlDto;
  client?: ClientXmlDto;
  sale: SaleXmlDto;
  totals: TotalsXmlDto;
  paymentMethod?: string;
  additionalNotes?: string;
  customerName?: string;
  customerIdentification?: string;
  isPrinted: boolean;
  printCount: number;
}

export interface StoreXmlDto {
  name: string;
  address: string;
  phoneNumber?: string;
  type: string;
}

export interface UserXmlDto {
  name: string;
  email: string;
  role: string;
}

export interface ClientXmlDto {
  nameLastname: string;
  typeIdentification: string;
  identificationNumber: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
}

export interface SaleXmlDto {
  saleNumber: string;
  saleType: string;
  details: SaleDetailXmlDto[];
}

export interface SaleDetailXmlDto {
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  batchCode?: string;
}

export interface TotalsXmlDto {
  subtotal: string;
  discountAmount: string;
  taxPercentage: string;
  taxAmount: string;
  totalAmount: string;
}