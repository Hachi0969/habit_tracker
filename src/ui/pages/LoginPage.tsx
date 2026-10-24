import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AuthService } from "../../infrastructure/AuthService.ts";
import { Button, FieldError } from "../components/primitives.tsx";

const schema = z.object({
  email: z.email({ error: "Enter a valid email" }),
  password: z.string().min(8, { error: "At least 8 characters" }),
});
type Values = z.infer<typeof schema>;

const input =
  "h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-base text-ink aria-invalid:border-danger";

/** UC1: email + password. Supabase handles confirmation emails and rate limiting. */
export function LoginPage({ auth }: { auth: AuthService }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const errors = formState.errors;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setMessage(null);
    try {
      if (mode === "signin") {
        await auth.signIn(email, password);
      } else {
        const { needsConfirmation } = await auth.signUp(email, password);
        if (needsConfirmation) {
          setMessage({
            tone: "info",
            text: "Check your email to confirm your account, then sign in.",
          });
          setMode("signin");
        }
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Sign-in failed",
      });
    }
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold tracking-tight">Life Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Sleep, study, spending and mood, once a day.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={input}
            aria-invalid={errors.email ? true : undefined}
            {...register("email")}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={input}
            aria-invalid={errors.password ? true : undefined}
            {...register("password")}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        {message && (
          <p
            role="alert"
            className={`text-sm ${message.tone === "error" ? "text-danger" : "text-good"}`}
          >
            {message.text}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={formState.isSubmitting}>
          {formState.isSubmitting
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "No account yet? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
