"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

type AuditLogItem = {
  id: string;
  admin: { id?: string; name: string };
  action: string;
  entityId?: string | null;
  entityType?: string | null;
  reason?: string | null;
  details?: Record<string, string> | null;
  createdAt: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("");
  const [adminNameFilter, setAdminNameFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Build query string
  const qs = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (actionFilter) params.set("action", actionFilter);
    if (entityTypeFilter) params.set("entityType", entityTypeFilter);
    if (adminNameFilter) params.set("adminName", adminNameFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }, [
    page,
    pageSize,
    actionFilter,
    entityTypeFilter,
    adminNameFilter,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/audit-logs?${qs}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to fetch audit logs");
        }
        const json = await res.json();
        setLogs(json.data || []);
        setTotal(json.total || 0);
      } catch (err: unknown) {
        console.error(err);
        setError((err as Error)?.message || "Failed to load logs");
        toast({
          variant: "destructive",
          description: (err as Error)?.message || "Failed to load logs",
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [qs]);

  const pageCount = Math.ceil(total / pageSize);

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Audit Logs</h2>
          <div className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${total} log(s)`}{" "}
            {pageCount > 1 && ` — page ${page}/${pageCount}`}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Input
            placeholder="Action (e.g. DOCUMENT_APPROVED)"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          />
          <Input
            placeholder="Entity Type (SupplierDocument, Supplier...)"
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
          />
          <Input
            placeholder="Admin name"
            value={adminNameFilter}
            onChange={(e) => {
              setAdminNameFilter(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {error && <div className="text-sm text-destructive mb-4">{error}</div>}

        {/* Logs list */}
        <div className="space-y-2">
          {logs.length === 0 && !loading ? (
            <div className="text-sm text-muted-foreground">
              No audit logs found for the selected filters.
            </div>
          ) : (
            logs.map((log) => {
              const created = new Date(log.createdAt);
              const key = log.id;
              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 border rounded p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{log.action}</span>
                      <Badge>{log.entityType ?? "—"}</Badge>
                      {log.entityId ? (
                        <span className="text-xs text-muted-foreground ml-2">
                          ID: {log.entityId}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-muted-foreground mt-1">
                      {log.reason ??
                        (log.details?.message
                          ? String(log.details.message)
                          : "—")}
                    </div>

                    {/* details preview */}
                    <div className="mt-2 text-xs text-muted-foreground">
                      By <span className="font-medium">{log.admin?.name}</span>{" "}
                      • {format(created, "PPpp")}
                    </div>

                    {/* expand details */}
                    <div className="mt-2">
                      <button
                        className="text-xs underline"
                        onClick={() =>
                          setExpanded((s) => ({ ...s, [key]: !s[key] }))
                        }
                      >
                        {expanded[key] ? "Hide details" : "Show details"}
                      </button>

                      {expanded[key] && (
                        <pre className="mt-2 bg-surface p-3 rounded text-sm overflow-auto max-h-64">
                          {JSON.stringify(log.details ?? {}, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    <div className="font-medium">{log.admin?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(created, "Pp")}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {pageCount || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => Math.min(pageCount || 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
