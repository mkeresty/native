import { ClockIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { auth } from "@/lib/auth/server";
import { listRecentDocuments } from "@/lib/documents/server";

export default async function AppHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const recent = await listRecentDocuments(session.user.id);

  if (recent.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>Your workspace is ready</EmptyTitle>
            <EmptyDescription>
              Create your first document from the sidebar — then edit it here,
              together with your team.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClockIcon className="size-4 text-muted-foreground" />
          Recent documents
        </h1>
        <ul className="mt-5 flex flex-col gap-1">
          {recent.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/app/doc/${doc.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{doc.title}</span>
                </span>
                <time
                  dateTime={doc.updatedAt.toISOString()}
                  className="shrink-0 text-sm text-muted-foreground"
                >
                  {doc.updatedAt.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
