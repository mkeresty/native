"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { getAuthPageHref, getSafeCallbackPath } from "@/lib/auth/redirects";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { SocialSignInButtons } from "@/features/auth/social-sign-in-buttons";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const provider = searchParams.get("oauth");
    if (!searchParams.has("error") || !["github", "google"].includes(provider ?? "")) {
      return null;
    }
    const providerName = provider === "github" ? "GitHub" : "Google";
    return `${providerName} sign-in did not complete. Please try again or use email.`;
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setError(
          error.status === 401
            ? "Incorrect email or password."
            : (error.message ?? "Could not sign you in. Please try again."),
        );
        return;
      }
      toast.success("Welcome back.");
      router.replace(getSafeCallbackPath(searchParams.get("next")));
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to open your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        <SocialSignInButtons />
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Separator />
          </div>
          <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            or email
          </span>
          <div className="min-w-0 flex-1">
            <Separator />
          </div>
        </div>
        <form id="sign-in-form" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                autoFocus
              />
            </Field>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
              />
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-3">
        <Button
          type="submit"
          form="sign-in-form"
          disabled={pending}
          className="w-full"
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Sign in
        </Button>
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={getAuthPageHref("/sign-up", searchParams.get("next"))}
            className="font-medium underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
