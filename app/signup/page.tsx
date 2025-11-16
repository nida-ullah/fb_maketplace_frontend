"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

// Strong password validation function
const validatePassword = (password: string) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLongEnough = password.length >= 8;

  return {
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
    isLongEnough,
    isValid:
      hasUpperCase &&
      hasLowerCase &&
      hasNumber &&
      hasSpecialChar &&
      isLongEnough,
  };
};

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((password) => validatePassword(password).isValid, {
        message:
          "Password must contain uppercase, lowercase, number, and special character",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const { signup } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await signup(data.name, data.email, data.password);

      // Check if approval is required
      if (result?.message) {
        setSuccess(result.message);
      }
      // If no result, user was redirected to dashboard (old flow)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Signup failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Create an account
          </CardTitle>
          <CardDescription>
            Enter your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-green-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Account Created Successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>{success}</p>
                      <p className="mt-2">
                        <Link
                          href="/login"
                          className="font-medium underline hover:text-green-600"
                        >
                          Return to login page
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              error={errors.name?.message}
              disabled={!!success}
              {...register("name")}
            />

            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              disabled={!!success}
              {...register("email")}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="Create a password"
                disabled={!!success}
                {...register("password")}
                onChange={(e) => {
                  setPasswordValue(e.target.value);
                  register("password").onChange(e);
                }}
                className={`w-full px-3 py-2 text-sm text-gray-900 border rounded-lg placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  passwordValue && !validatePassword(passwordValue).isValid
                    ? "border-red-500"
                    : "border-gray-400"
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
              {passwordValue &&
                (() => {
                  const validation = validatePassword(passwordValue);
                  if (!validation.isValid) {
                    return (
                      <div className="mt-2 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                        <p className="font-semibold text-red-700 mb-2">
                          ⚠️ Password must contain:
                        </p>
                        <div className="space-y-1">
                          <p
                            className={
                              validation.isLongEnough
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {validation.isLongEnough ? "✓" : "✗"} At least 8
                            characters
                          </p>
                          <p
                            className={
                              validation.hasUpperCase
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {validation.hasUpperCase ? "✓" : "✗"} One uppercase
                            letter (A-Z)
                          </p>
                          <p
                            className={
                              validation.hasLowerCase
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {validation.hasLowerCase ? "✓" : "✗"} One lowercase
                            letter (a-z)
                          </p>
                          <p
                            className={
                              validation.hasNumber
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {validation.hasNumber ? "✓" : "✗"} One number (0-9)
                          </p>
                          <p
                            className={
                              validation.hasSpecialChar
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {validation.hasSpecialChar ? "✓" : "✗"} One special
                            character (!@#$%^&*...)
                          </p>
                        </div>
                      </div>
                    );
                  }
                })()}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                disabled={!!success}
                {...register("confirmPassword")}
                onChange={(e) => {
                  setConfirmPasswordValue(e.target.value);
                  register("confirmPassword").onChange(e);
                }}
                className={`w-full px-3 py-2 text-sm text-gray-900 border rounded-lg placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  confirmPasswordValue &&
                  passwordValue &&
                  confirmPasswordValue !== passwordValue
                    ? "border-red-500"
                    : "border-gray-400"
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword.message}
                </p>
              )}
              {confirmPasswordValue &&
                passwordValue &&
                confirmPasswordValue !== passwordValue && (
                  <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ⚠️ Passwords do not match
                  </p>
                )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !!success}
            >
              {isLoading ? "Creating account..." : "Create account"}
            </Button>

            <p className="text-center text-sm text-gray-700">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
