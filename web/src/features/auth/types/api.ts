import type { User } from "@/types/modules/users";

export interface AuthenticatePayload {
  email: string;
  password?: string;
}

export interface RegisterUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
}

export interface RegisterVerificationPayload {
  otp: {
    hashedOtp: string;
    expiresIn: string;
    enteredOtp: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    phone: string;
    role: string;
  };
}

export interface AuthResponse {
  status: string;
  message?: string;
  data: {
    token: string;
    user: User;
  };
}
