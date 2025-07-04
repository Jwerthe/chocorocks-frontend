// src/lib/error-handler.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleApiError = (error: any): string => {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Ha ocurrido un error inesperado';
};

export const logError = (error: any, context?: string) => {
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.error(`[${context || 'Error'}]:`, error);
  }
  
  // Here you could send to an error tracking service like Sentry
  // Sentry.captureException(error);
};