export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
  correlationId?: string;
}
