// src/types/forms.ts
export interface FormErrors {
  [key: string]: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}