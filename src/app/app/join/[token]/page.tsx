import { XCircleIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth/server";
import { getApplicationUserId } from "@/lib/auth/profile";
import { redeemWorkspaceInvite } from "@/lib/workspaces/server";
import { Button } from "@/components/ui/button";

/**
 * Join-link redemption. Runs inside the authenticated app layout — signed-out
 * visitors are redirected to sign-in by the layout first.
 */
export default async function JoinWorkspacePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: session } = await getAuth().getSession();
  if (!session?.user) redirect("/sign-in");

  const userId = await getApplicationUserId(session.user);
  const result = await redeemWorkspaceInvite(userId, token);

  if (!result.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <XCircleIcon className="size-8 text-muted-foreground" aria-hidden />
        <div>
          <h1 className="font-heading text-lg font-semibold">
            This invite link is not valid
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been revoked by the workspace owner. Ask for a fresh
            link and try again.
          </p>
        </div>
        <Button render={<Link href="/app" />}>Go to your workspace</Button>
      </div>
    );
  }

  redirect("/app");
}
