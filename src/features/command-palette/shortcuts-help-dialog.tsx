"use client";

import {
  formatShortcut,
  SHORTCUTS,
  type ShortcutGroup,
} from "@/lib/shortcuts/registry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GROUP_ORDER: ShortcutGroup[] = ["General", "Documents", "Editor", "View"];

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Everything in Editora can be reached without leaving the keyboard.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {GROUP_ORDER.map((group) => (
            <section key={group}>
              <h3 className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {group}
              </h3>
              <dl className="mt-3 flex flex-col gap-2">
                {SHORTCUTS.filter((shortcut) => shortcut.group === group).map(
                  (shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <dt className="text-foreground/90">{shortcut.label}</dt>
                      <dd className="flex items-center gap-1">
                        {formatShortcut(shortcut.id)
                          .split("+")
                          .map((part, index) => (
                            <kbd
                              key={`${shortcut.id}-${index}`}
                              className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border bg-muted px-1.5 font-mono text-xs text-muted-foreground"
                            >
                              {part}
                            </kbd>
                          ))}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
