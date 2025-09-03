"use client";

import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { pusherClient } from "@/lib/pusher/client";
import { useSession } from "next-auth/react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InquiriesPage() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;

    const supplierId = session?.user?.id;
    pusherClient.subscribe(`supplier-${supplierId}`);

    pusherClient.bind("new-inquiry", (data: any) => {
      // Option A: refetch SWR
      mutate("/api/supplier/inquiries");
      // Option B: update local state manually
    });

    return () => {
      pusherClient.unsubscribe(`supplier-${supplierId}`);
    };
  }, []);

  const { data, error } = useSWR("/api/supplier/inquiries", fetcher);

  if (error) return <div>Error loading inquiries</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Inquiries</h1>
      <div className="space-y-4">
        {data.map((inq: any) => (
          <div
            key={inq.id}
            className="p-4 bg-white rounded-xl shadow flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{inq.buyer.name}</p>
              <p className="text-sm text-gray-500">
                {inq.quantity} {inq.unit} • {inq.product.name}
              </p>
              <p className="text-xs text-gray-400">
                Valid: {inq.validity} • {inq.status}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {inq.unread && <Badge variant="destructive">New</Badge>}
              <Link href={`/chat/${inq.conversationId}`}>
                <Button size="sm">View</Button>
              </Link>
              <Button size="sm" variant="secondary">
                Send Quote
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
