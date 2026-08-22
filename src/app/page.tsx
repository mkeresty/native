import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/server";

const features = [
  {
    title: "Real-time collaboration",
    description:
      "Open the same document with your team and edit simultaneously without conflicts.",
  },
  {
    title: "Markdown at the core",
    description:
      "Your content stays portable, standard Markdown. Export any time, own your words.",
  },
  {
    title: "Keyboard-first",
    description:
      "Command palette, quick open, shortcuts for everything. Built for developers.",
  },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/app");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              N
            </span>
            Native
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" render={<Link href="/sign-in" />} nativeButton={false}>
              Sign in
            </Button>
            <Button render={<Link href="/sign-up" />} nativeButton={false}>
              Get started
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <section className="flex max-w-2xl flex-col gap-6">
          <Badge variant="secondary" className="w-fit">
            Early MVP
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Google Docs for technical knowledge.
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            A collaborative Markdown workspace built for developers. Edit
            together in real time, keep your content as clean, portable
            Markdown, and never touch the mouse unless you want to.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" render={<Link href="/sign-up" />} nativeButton={false}>
              Create your workspace
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/sign-in" />} nativeButton={false}>
              Sign in
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent/40"
            >
              <h2 className="font-medium">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 py-6">
        <p className="mx-auto w-full max-w-5xl px-4 text-sm text-muted-foreground">
          Native · Collaborative Markdown for developers
        </p>
      </footer>
    </div>
  );
}
