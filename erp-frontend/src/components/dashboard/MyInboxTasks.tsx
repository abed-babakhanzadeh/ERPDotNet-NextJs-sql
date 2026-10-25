"use client";

import { CheckCircle2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, SectionEmpty, SectionSkeleton } from "@/components/common/SectionCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useTabs } from "@/providers/TabsProvider";
import { workflowService } from "@/services/workflowService";
import { formatDate } from "@/lib/format";

export function MyInboxTasks() {
  const { addTab } = useTabs();
  const { data, isLoading, error } = useAsyncData((s) =>
    workflowService.getInboxTasks({ pageNumber: 1, pageSize: 5 }, s),
  );
  const tasks = data?.items ?? [];

  return (
    <SectionCard
      title="کارتابل من"
      icon={Inbox}
      action={
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => addTab("کارتابل من", "/workflow/inbox")}>
          مشاهده همه
        </Button>
      }
    >
      {isLoading ? (
        <SectionSkeleton rows={4} />
      ) : error ? (
        <SectionEmpty icon={Inbox} text={error} />
      ) : tasks.length === 0 ? (
        <SectionEmpty icon={CheckCircle2} text="کار منتظری ندارید" />
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => (
            <li key={task.taskId}>
              <button
                type="button"
                onClick={() => addTab(task.taskTitle, `/workflow/inbox/${task.taskId}`)}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-start transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{task.taskTitle}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {task.processTitle} · {task.stateTitle}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDate(task.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
