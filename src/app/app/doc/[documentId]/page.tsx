import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { DocumentEditor } from "@/features/editor/document-editor";
import { auth } from "@/lib/auth/server";
import { getDocumentForUser } from "@/lib/documents/server";

type PageProps = { params: Promise<{ documentId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return {};
  const { documentId } = await params;
  const doc = await getDocumentForUser(session.user.id, documentId);
  return { title: doc?.title ?? "Document" };
}

export default async function DocumentPage({ params }: PageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { documentId } = await params;
  const doc = await getDocumentForUser(session.user.id, documentId);
  if (!doc) notFound();

  return (
    <DocumentEditor
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
