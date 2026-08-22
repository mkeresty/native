import { FileTextIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function AppHomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileTextIcon />
          </EmptyMedia>
          <EmptyTitle>Your workspace is ready</EmptyTitle>
          <EmptyDescription>
            The collaborative editor is on its way. When it ships, you&apos;ll
            create and edit Markdown documents right here — with your team, in
            real time.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
