import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";

type NeonAuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
};

/**
 * Maps Neon Auth's managed identity to the app's durable profile id.
 *
 * Existing Better Auth users are linked on their first Neon Auth sign-in by
 * email, so their workspaces and documents remain attached to the same local
 * profile. New accounts use their Neon identity id as the profile id.
 */
export async function getApplicationUserId(authUser: NeonAuthUser): Promise<string> {
  const [linkedUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.authUserId, authUser.id))
    .limit(1);
  if (linkedUser) return linkedUser.id;

  const [emailMatch] = await db
    .select({ id: user.id, authUserId: user.authUserId })
    .from(user)
    .where(eq(user.email, authUser.email))
    .limit(1);

  if (emailMatch) {
    if (emailMatch.authUserId && emailMatch.authUserId !== authUser.id) {
      throw new Error("This email is already linked to another Neon Auth account.");
    }

    await db
      .update(user)
      .set({ authUserId: authUser.id, updatedAt: new Date() })
      .where(and(eq(user.id, emailMatch.id), eq(user.email, authUser.email)));
    return emailMatch.id;
  }

  const [createdUser] = await db
    .insert(user)
    .values({
      id: authUser.id,
      authUserId: authUser.id,
      name: authUser.name,
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      image: authUser.image ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: user.id });
  if (createdUser) return createdUser.id;

  // A concurrent request created the profile. Resolve it rather than creating
  // another local profile or workspace.
  const [racedUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.authUserId, authUser.id))
    .limit(1);
  if (racedUser) return racedUser.id;

  throw new Error("Could not provision an application profile for this account.");
}
