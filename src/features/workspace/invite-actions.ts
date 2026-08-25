"use server";

import { getAuth } from "@/lib/auth/server";
import { getApplicationUserId } from "@/lib/auth/profile";
import {
  getOrCreateWorkspaceInvite,
  redeemWorkspaceInvite,
  regenerateWorkspaceInvite,
} from "@/lib/workspaces/server";

async function requireUserId(): Promise<string> {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) throw new Error("Not signed in");
  return getApplicationUserId(session.user);
}

export type InviteResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/** Members only: the workspace's active join-link token. */
export async function getInviteTokenAction(
  workspaceId: string,
): Promise<InviteResult> {
  try {
    const userId = await requireUserId();
    const invite = await getOrCreateWorkspaceInvite(userId, workspaceId);
    if (!invite) return { ok: false, error: "Not a member of this workspace" };
    return { ok: true, token: invite.token };
  } catch (error) {
    console.error("getInviteTokenAction failed:", error);
    return { ok: false, error: "Could not load the invite link" };
  }
}

/** Revokes the current link and issues a fresh one. */
export async function regenerateInviteTokenAction(
  workspaceId: string,
): Promise<InviteResult> {
  try {
    const userId = await requireUserId();
    const invite = await regenerateWorkspaceInvite(userId, workspaceId);
    if (!invite) return { ok: false, error: "Not a member of this workspace" };
    return { ok: true, token: invite.token };
  } catch (error) {
    console.error("regenerateInviteTokenAction failed:", error);
    return { ok: false, error: "Could not regenerate the invite link" };
  }
}

export type RedeemResult =
  | { ok: true; workspaceName: string; alreadyMember: boolean }
  | { ok: false; error: string };

export async function redeemInviteAction(
  token: string,
): Promise<RedeemResult> {
  try {
    if (typeof token !== "string" || token === "") {
      return { ok: false, error: "This invite link is not valid." };
    }
    const userId = await requireUserId();
    const result = await redeemWorkspaceInvite(userId, token);
    if (!result.ok) {
      return { ok: false, error: "This invite link is not valid." };
    }
    return {
      ok: true,
      workspaceName: result.workspaceName,
      alreadyMember: result.alreadyMember,
    };
  } catch (error) {
    console.error("redeemInviteAction failed:", error);
    return { ok: false, error: "Could not join the workspace. Try again." };
  }
}
