import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocumentEditor } from "@/features/editor/document-editor";
import { getAuth } from "@/lib/auth/server";
import { getApplicationUserId } from "@/lib/auth/profile";
import { getDocumentForUser } from "@/lib/documents/server";

type PageProps = { params: Promise<{ documentId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) return {};
  const { documentId } = await params;
  const userId = await getApplicationUserId(session.user);
  const doc = await getDocumentForUser(userId, documentId);
  return { title: doc?.title ?? "Document" };
}

export default async function DocumentPage({ params }: PageProps) {
  const { data: session } = await getAuth().getSession();
  if (!session?.user) redirect("/sign-in");

  const { documentId } = await params;
  const userId = await getApplicationUserId(session.user);
  const doc = await getDocumentForUser(userId, documentId);
  if (!doc) notFound();

  return (
    <DocumentEditor
      user={{ id: userId, name: session.user.name }}
      document={{
        id: doc.id,
        title: doc.title,
        contentMd: doc.contentMd,
        folderName: doc.folderName,
        authorName: doc.authorName,
        updatedAt: doc.updatedAt,
      }}
    />
  );
}
