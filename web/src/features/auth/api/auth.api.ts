import { apiClient } from "@/api/client";
import type { User } from "@/types/modules/users";
import type {
  AuthenticatePayload,
  RegisterUserPayload,
  RegisterVerificationPayload,
  AuthResponse,
} from "@/features/auth/types/api";
import type { ApiResponse } from "@/features/ideas/types/models/idea";

export const authApi = {
  async login(payload: AuthenticatePayload): Promise<User> {
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      usernameOrEmail: payload.email,
      password: payload.password,
    });
    return response.data.user;
  },

  async logout(): Promise<void> {
    await apiClient.post<ApiResponse<void>>("/auth/logout");
  },

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return await apiClient.get<ApiResponse<{ user: User }>>("/auth/me");
  },

  async register(payload: RegisterUserPayload) {
    const response = await apiClient.post<ApiResponse<{ email: string; otp: { code: string; expiresIn: string } }>>(
      "/auth/register",
      { email: payload.email }
    );
    return response.data;
  },

  async verifyRegister(payload: RegisterVerificationPayload): Promise<User> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/register-verification",
      payload
    );
    return response.data.user;
  },
};
