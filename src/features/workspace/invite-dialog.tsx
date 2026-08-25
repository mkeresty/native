"use client";

import { CheckIcon, CopyIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getInviteTokenAction,
  regenerateInviteTokenAction,
} from "@/features/workspace/invite-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The workspace's join link. Anyone with the URL can join as a member, so
 * regenerating is the revoke path — the old link stops working immediately.
 */
export function InviteDialog({
  workspaceId,
  workspaceName,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const result = await getInviteTokenAction(workspaceId);
      if (cancelled) return;
      if (result.ok) setToken(result.token);
      else toast.error(result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId]);

  const link = token ? `${window.location.origin}/app/join/${token}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link. Select it and copy manually.");
    }
  }

  async function regenerate() {
    setRegenerating(true);
    const result = await regenerateInviteTokenAction(workspaceId);
    setRegenerating(false);
    if (result.ok) {
      setToken(result.token);
      toast.success("Previous invite link revoked.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {workspaceName}</DialogTitle>
          <DialogDescription>
            Anyone with this link can join as a member. Regenerate to revoke a
            link that has spread too far.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={link}
            placeholder="Loading…"
            aria-label="Invite link"
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => void copy()}
            disabled={!link}
            aria-label="Copy invite link"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-muted-foreground">
            {copied ? "Copied to clipboard." : null}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void regenerate()}
            disabled={regenerating || !token}
          >
            <RefreshCwIcon data-icon="inline-start" />
            Regenerate link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
