import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth/server";

const principles = [
  {
    index: "01",
    title: "One clear page",
    description:
      "Start writing straight away. No projects, dashboards, or busy workspace to set up.",
  },
  {
    index: "02",
    title: "Markdown underneath",
    description:
      "The familiar format stays beneath every document, quietly keeping your work portable.",
  },
  {
    index: "03",
    title: "Simply shared",
    description:
      "Invite someone, write side by side, and always know who is in the document.",
  },
];

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/app");

  return (
    <div className="min-h-svh overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Editora home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-heading text-xl text-primary-foreground">
            E
          </span>
          <span className="font-heading text-2xl font-semibold tracking-tight">Editora</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
          <a href="#why">Why Editora</a>
          <a href="#principles">Principles</a>
          <a href="mailto:hello@editora.sh">Contact</a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" className="hidden sm:inline-flex" render={<Link href="/sign-in" />} nativeButton={false}>
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />} nativeButton={false}>
            Create a document
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 pt-16 pb-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(24rem,0.75fr)] lg:items-center lg:gap-16 lg:px-8 lg:pt-24 lg:pb-28">
          <div className="flex max-w-3xl flex-col items-start">
            <Badge variant="secondary" className="mb-7 h-6 gap-1.5 px-2.5 font-mono text-[0.7rem] tracking-[0.12em] uppercase">
              <SparklesIcon data-icon="inline-start" />
              Shared documents, native Markdown
            </Badge>
            <h1 className="max-w-3xl font-heading text-5xl leading-[0.95] font-medium tracking-[-0.045em] text-balance sm:text-7xl lg:text-[5.4rem]">
              The simple way to write Markdown <em className="font-normal">together.</em>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground text-pretty">
              Editora feels as natural as a shared document, with clean Markdown
              underneath. Open a page, invite your people, and let the words do the work.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="/sign-up" />} nativeButton={false}>
                Create a document
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button size="lg" variant="outline" render={<a href="#why" />} nativeButton={false}>
                See how it works
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">editora.sh — private beta</p>
          </div>

          <HeroDocument />
        </section>

        <section id="why" className="border-y border-border/80 bg-card/45">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8 lg:py-18">
            <div>
              <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">Made for a shared page</p>
              <h2 className="mt-4 max-w-sm font-heading text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
                All the document. None of the workspace.
              </h2>
            </div>
            <div className="grid gap-7 sm:grid-cols-3">
              {principles.map((principle) => (
                <article key={principle.index} className="flex flex-col gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{principle.index}</span>
                  <h3 className="font-heading text-2xl font-medium tracking-tight">{principle.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{principle.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="principles" className="mx-auto flex w-full max-w-7xl flex-col items-center px-6 py-20 text-center lg:px-8 lg:py-28">
          <p className="mt-6 max-w-2xl font-heading text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
            Write together with the ease of Google Docs, and keep every page as readable, portable Markdown.
          </p>
          <Button variant="link" className="mt-5" render={<Link href="/sign-up" />} nativeButton={false}>
            Create your first page
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="font-heading text-lg text-foreground">Editora</span>
          <span>A calm shared home for Markdown.</span>
          <a href="mailto:hello@editora.sh" className="font-mono text-xs">hello@editora.sh</a>
        </div>
      </footer>
    </div>
  );
}

function HeroDocument() {
  return (
    <Card className="relative bg-card/90 shadow-xl shadow-foreground/5 ring-border">
      <CardHeader className="border-b border-border/80">
        <div className="flex items-center gap-2 font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
          <span className="size-1.5 rounded-full bg-status-online" />
          Shared document
        </div>
        <CardTitle className="mt-4 text-3xl">Project brief</CardTitle>
        <CardDescription>Shared with Ada, Miko, and you</CardDescription>
        <CardAction>
          <Badge variant="secondary">Saved</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="py-8">
        <div className="font-heading text-2xl leading-tight">Overview</div>
        <p className="mt-4 leading-7 text-muted-foreground">
          We are making space for a clearer way to share plans, drafts, and decisions.
        </p>
        <blockquote className="mt-6 border-l-2 border-callout-border pl-4 font-heading text-xl leading-snug text-callout-foreground">
          “Keep the document simple enough for the thought to stay in view.”
        </blockquote>
        <Separator className="my-6" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-presence-1" />
          Ada is writing here
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3 text-xs text-muted-foreground">
        <span>3 people editing</span>
        <span>Markdown underneath</span>
      </CardFooter>
    </Card>
  );
}
