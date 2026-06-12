"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/features/auth/types/schema";
import { ApiError } from "@/api/errors";
import type { RegisterUserPayload } from "@/features/auth/types/api";

type RegisterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwitchToLogin: () => void;
};

const PROVIDER_STORAGE_KEY = "auth-last-provider";
const MIN_PASSWORD_LENGTH = 8;

export function RegisterDialog({
  open,
  onOpenChange,
  onSwitchToLogin,
}: RegisterDialogProps) {
  const { register, registerVerification, isLoading, isAuthenticated } = useAuth();
  const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);

  // Registration steps: "details" | "otp"
  const [step, setStep] = useState<"details" | "otp">("details");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Cache user input and returned OTP data
  const [savedData, setSavedData] = useState<RegisterUserPayload | null>(null);
  const [otpInfo, setOtpInfo] = useState<{ code: string; expiresIn: string } | null>(null);

  const form = useForm<RegisterUserPayload>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.reset();
    setTermsAccepted(false);
    setShowPassword(false);
    setStep("details");
    setEnteredOtp("");
    setOtpError("");
    setSavedData(null);
    setOtpInfo(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const stored = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
    setLastUsedProvider(stored);
  }, [open]);

  const firstNameValue = form.watch("firstName");
  const lastNameValue = form.watch("lastName");
  const emailValue = form.watch("email");
  const passwordValue = form.watch("password");

  const canContinueSignUp =
    firstNameValue !== "" &&
    !form.formState.errors.firstName &&
    lastNameValue !== "" &&
    !form.formState.errors.lastName &&
    emailValue !== "" &&
    !form.formState.errors.email &&
    passwordValue !== "" &&
    !form.formState.errors.password &&
    termsAccepted;

  const handleSocialClick = (provider: string) => {
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
    setLastUsedProvider(provider);
  };

  const handleContinue = () => {
    form.handleSubmit(async (data) => {
      try {
        const responseData = await register(data);
        if (responseData && responseData.otp) {
          // Store details for step 2 verification
          setSavedData(data);
          setOtpInfo(responseData.otp);
          setStep("otp");
        } else {
          throw new Error("No verification code received from server.");
        }
      } catch (error) {
        if (error instanceof ApiError) {
          form.setError("email", {
            message: error.message || "Email already exists or invalid data",
          });
        } else {
          form.setError("email", {
            message: "Registration failed. Please try again.",
          });
        }
      }
    })();
  };

  const handleVerifyOtp = async () => {
    if (!enteredOtp || enteredOtp.length < 6) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }
    setOtpError("");

    if (!savedData || !otpInfo || !registerVerification) return;

    try {
      await registerVerification({
        otp: {
          hashedOtp: otpInfo.code,
          expiresIn: otpInfo.expiresIn,
          enteredOtp: enteredOtp,
        },
        user: {
          firstName: savedData.firstName,
          lastName: savedData.lastName,
          email: savedData.email,
          password: savedData.password,
          phone: "",
          role: "USER",
        },
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setOtpError(error.message || "Verification code is incorrect or expired");
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    }
  };

  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 rounded-3xl border border-border shadow-2xl bg-background text-foreground">
        {step === "details" ? (
          <>
            <div className="px-6 pt-7 pb-6">
              <DialogHeader className="items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full text-primary-foreground">
                  <img src="/images/logo/logo.png" alt="Vai" className="size-12 rounded-full" onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48x48?text=PAD";
                  }} />
                </div>
                <DialogTitle className="text-xl">Create your account</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Welcome! Please fill in the details to get started.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 justify-center gap-2 rounded-full border-border bg-muted/20"
                    onClick={() => handleSocialClick("google")}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </Button>
                  {lastUsedProvider === "google" && (
                    <Badge
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
                    >
                      Last used
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="auth-first-name">First name</Label>
                      <Input
                        {...form.register("firstName")}
                        id="auth-first-name"
                        placeholder="First name"
                        autoComplete="given-name"
                        className="h-11 rounded-xl"
                      />
                      {form.formState.errors.firstName && (
                        <span className="text-sm text-destructive">
                          {form.formState.errors.firstName.message}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="auth-last-name">Last name</Label>
                      <Input
                        {...form.register("lastName")}
                        id="auth-last-name"
                        placeholder="Last name"
                        autoComplete="family-name"
                        className="h-11 rounded-xl"
                      />
                      {form.formState.errors.lastName && (
                        <span className="text-sm text-destructive">
                          {form.formState.errors.lastName.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-signup-email">Email address</Label>
                    <Input
                      {...form.register("email")}
                      id="auth-signup-email"
                      type="email"
                      placeholder="Enter your email address"
                      autoComplete="email"
                      className="h-11 rounded-xl"
                    />
                    {form.formState.errors.email && (
                      <span className="text-sm text-destructive">
                        {form.formState.errors.email.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="auth-signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        {...form.register("password")}
                        id="auth-signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                        autoComplete="new-password"
                        className="h-11 rounded-xl pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {form.formState.errors.password && (
                      <span className="text-sm text-destructive">
                        {form.formState.errors.password.message}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      id="auth-terms"
                      checked={termsAccepted}
                      onCheckedChange={(value) => setTermsAccepted(Boolean(value))}
                    />
                    <Label htmlFor="auth-terms" className="leading-5 cursor-pointer">
                      I agree to the{" "}
                      <button type="button" className="underline bg-transparent hover:text-foreground">
                        Terms of Service
                      </button>{" "}
                      and{" "}
                      <button type="button" className="underline bg-transparent hover:text-foreground">
                        Privacy Policy
                      </button>
                      .
                    </Label>
                  </div>
                </div>

                <Button
                  type="button"
                  className="h-11 w-full rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleContinue}
                  disabled={!canContinueSignUp || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border-t border-border/70 bg-muted/40 px-6 py-4 text-center text-sm rounded-b-3xl text-muted-foreground">
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-foreground hover:underline cursor-pointer"
                  onClick={onSwitchToLogin}
                >
                  Sign in
                </button>
              </span>
            </div>
          </>
        ) : (
          // OTP Entry step
          <>
            <div className="px-6 pt-7 pb-6">
              <DialogHeader className="items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <KeyRound className="size-6" />
                </div>
                <DialogTitle className="text-xl">Verify your email</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  We sent a 6-digit code to <span className="font-semibold text-foreground">{savedData?.email}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auth-otp">Verification Code</Label>
                  <Input
                    id="auth-otp"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-11 rounded-xl text-center text-lg tracking-[0.5em] font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && enteredOtp.length === 6) {
                        e.preventDefault();
                        handleVerifyOtp();
                      }
                    }}
                  />
                  {otpError && (
                    <span className="text-sm text-destructive block text-center">
                      {otpError}
                    </span>
                  )}
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    * Tip: If running locally without mail config, find the OTP code printed in the server stdout log.
                  </p>
                </div>

                <Button
                  type="button"
                  className="h-11 w-full rounded-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleVerifyOtp}
                  disabled={enteredOtp.length < 6 || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify Code"
                  )}
                </Button>

                <div className="flex justify-between items-center text-xs pt-1">
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-muted-foreground h-auto"
                    onClick={() => setStep("details")}
                  >
                    Change details
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-primary h-auto"
                    onClick={async () => {
                      if (savedData) {
                        try {
                          const responseData = await register(savedData);
                          if (responseData && responseData.otp) {
                            setOtpInfo(responseData.otp);
                            setOtpError("");
                            setEnteredOtp("");
                          }
                        } catch (err: any) {
                          setOtpError(err?.message || "Failed to resend code");
                        }
                      }
                    }}
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="th8JXc"
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="24"
      viewBox="0 0 40 48"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M39.2 24.45c0-1.55-.16-3.04-.43-4.45H20v8h10.73c-.45 2.53-1.86 4.68-4 6.11v5.05h6.5c3.78-3.48 5.97-8.62 5.97-14.71z"
      ></path>
      <path
        fill="#34A853"
        d="M20 44c5.4 0 9.92-1.79 13.24-4.84l-6.5-5.05C24.95 35.3 22.67 36 20 36c-5.19 0-9.59-3.51-11.15-8.23h-6.7v5.2C5.43 39.51 12.18 44 20 44z"
      ></path>
      <path
        fill="#FABB05"
        d="M8.85 27.77c-.4-1.19-.62-2.46-.62-3.77s.22-2.58.62-3.77v-5.2h-6.7C.78 17.73 0 20.77 0 24s.78 6.27 2.14 8.97l6.71-5.2z"
      ></path>
      <path
        fill="#E94235"
        d="M20 12c2.93 0 5.55 1.01 7.62 2.98l5.76-5.76C29.92 5.98 25.39 4 20 4 12.18 4 5.43 8.49 2.14 15.03l6.7 5.2C10.41 15.51 14.81 12 20 12z"
      ></path>
    </svg>
  );
}
