"use client";
import { cn } from "@/lib/utils";

export default function MessageBubble({
  me,
  body,
  createdAt,
}: {
  me: boolean;
  body?: string;
  createdAt: string | Date;
}) {
  return (
    <div className={cn("flex w-full", me ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow",
          me ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {body && <p className="whitespace-pre-wrap leading-relaxed">{body}</p>}
        <p
          className={cn(
            "mt-1 text-[10px] opacity-70",
            me ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {new Date(createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
