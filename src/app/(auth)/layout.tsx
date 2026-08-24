import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await getAuth().getSession();
  if (session?.user) redirect("/app");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold tracking-tight"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          E
        </span>
        Editora
      </Link>
      {children}
    </main>
  );
}
