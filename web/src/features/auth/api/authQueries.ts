import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./auth.api";
import type { User } from "@/types/modules/users";
import type {
  AuthenticatePayload,
  RegisterUserPayload,
  RegisterVerificationPayload,
} from "@/types/modules/auth/api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      try {
        const response = await authApi.getMe();
        return response;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin(onSuccess: (user: User) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AuthenticatePayload) => {
      return await authApi.login(payload);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), { data: { user } });
      onSuccess(user);
    },
  });
}

export function useLogout(onSuccess: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me(), null);
      queryClient.clear();
      onSuccess();
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterUserPayload) => {
      return await authApi.register(payload);
    },
  });
}

export function useRegisterVerification(onSuccess: (user: User) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterVerificationPayload) => {
      return await authApi.verifyRegister(payload);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), { data: { user } });
      onSuccess(user);
    },
  });
}

export function useActivate(onSuccess?: () => void) {
  return useMutation({
    mutationFn: async (token: string) => {
      await Promise.resolve(token);
    },
    onSuccess,
  });
}
