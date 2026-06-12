"use client";

import type { User } from "@/types/modules/users";
import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
  useEffect,
} from "react";
import {
  useLogin,
  useLogout,
  useMe,
  useRegister,
  useRegisterVerification,
  useActivate,
} from "@/features/auth/api/authQueries";
import type {
  AuthenticatePayload,
  RegisterUserPayload,
} from "@/features/auth/types/api";
import type { AuthContextType } from "@/features/auth/types/context";
import { LoginDialog } from "../components/LoginDialog";
import { RegisterDialog } from "../components/RegisterDialog";

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");

  const { data: me, isLoading: isInitialLoading } = useMe();

  useEffect(() => {
    if (me) {
      const { data: userData } = me;
      setUser(userData?.user || null);
    } else if (!isInitialLoading) {
      setUser(null);
    }
  }, [me, isInitialLoading]);

  // Auth API queries
  const loginMutation = useLogin((user) => setUser(user));
  const logoutMutation = useLogout(() => setUser(null));
  const registerMutation = useRegister();
  const registerVerificationMutation = useRegisterVerification((user) => setUser(user));
  const activateMutation = useActivate(() => { });

  const login = useCallback(
    async (payload: AuthenticatePayload) => {
      await loginMutation.mutateAsync(payload);
    },
    [loginMutation],
  );

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const register = useCallback(
    async (payload: RegisterUserPayload) => {
      return await registerMutation.mutateAsync(payload);
    },
    [registerMutation],
  );

  const registerVerification = useCallback(
    async (payload: any) => {
      await registerVerificationMutation.mutateAsync(payload);
    },
    [registerVerificationMutation],
  );

  const activate = useCallback(
    async (token: string) => {
      await activateMutation.mutateAsync(token);
    },
    [activateMutation],
  );

  const isLoading =
    isInitialLoading ||
    loginMutation.isPending ||
    logoutMutation.isPending ||
    registerMutation.isPending ||
    registerVerificationMutation.isPending ||
    activateMutation.isPending;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        registerVerification,
        activate,
        isAuthOpen,
        setIsAuthOpen,
        authMode,
        setAuthMode,
      }}
    >
      {children}
      <LoginDialog
        open={isAuthOpen && authMode === "sign-in"}
        onOpenChange={setIsAuthOpen}
        onSwitchToRegister={() => setAuthMode("sign-up")}
      />
      <RegisterDialog
        open={isAuthOpen && authMode === "sign-up"}
        onOpenChange={setIsAuthOpen}
        onSwitchToLogin={() => setAuthMode("sign-in")}
      />
    </AuthContext.Provider>
  );
}
