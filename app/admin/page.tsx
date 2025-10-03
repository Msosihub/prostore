"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  //   PieChart,
  //   Pie,
  //   Cell,
} from "recharts";
// import { ComposableMap, Geographies, Geography } from "react-simple-maps";

type DashboardResponse = {
  stats: {
    totalSuppliers: number;
    verifiedSuppliers: number;
    pendingDocs: number;
    totalProducts: number;
    totalCategories: number;
    totalUsers: number;
  };
  recentLogs: Array<{
    id: string;
    action: string;
    entityType?: string | null;
    reason?: string | null;
    details?: string | null;
    createdAt: string;
    admin: { id?: string; name: string };
  }>;
  recentDocs: Array<{
    id: string;
    label?: string;
    fileUrl?: string;
    uploadedAt: string;
    supplier?: { id: string; name: string } | null;
  }>;
  charts: {
    suppliersByMonth: { month: string; count: number }[];
    productsByCategory: { category: string; count: number }[];
    suppliersByCountry: { country: string | null; count: number }[];
  };
  topSuppliers: Array<{
    id: string;
    name: string;
    rating: number;
    productsCount: number;
    isVerified: boolean;
  }>;
};

const PIE_COLORS = ["#4CAF50", "#FFC107", "#FF7043", "#42A5F5", "#9C27B0"];
console.log("PIE_COLORS", PIE_COLORS);

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // const geoUrl =
  // "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        setData(j);
      })
      .catch((err) => {
        console.error("Failed to load dashboard", err);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Loading dashboard…</div>;
  if (!data) return <div className="p-6">No data available.</div>;

  const { stats, charts, recentLogs, recentDocs, topSuppliers } = data;
  const vendorVerificationData = [
    { status: "Verified", count: stats?.verifiedSuppliers },
    {
      status: "Pending",
      count: stats?.totalSuppliers - stats?.verifiedSuppliers,
    },
  ];

  // map country counts into object for rapid lookup by name (match against geography properties)
  //   const countryCountsMap = new Map<string, number>();
  //   charts.suppliersByCountry.forEach((c) => {
  //     if (c.country)
  //       countryCountsMap.set(String(c.country).toLowerCase(), c.count);
  //   });
  //   const maxCountryCount = Math.max(
  //     0,
  //     ...charts.suppliersByCountry.map((c) => c.count)
  //   );

  // color helper for map
  //   function colorForCount(count: number) {
  //     if (!count || count <= 0) return "#ECEFF1";
  //     const ratio = count / Math.max(1, maxCountryCount);
  //     if (ratio > 0.66) return "#b71c1c";
  //     if (ratio > 0.33) return "#ff7043";
  //     return "#ffcc80";
  //   }

  return (
    <div className="space-y-6 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Suppliers</CardTitle>
          </CardHeader>
          <CardContent>{stats?.totalSuppliers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified Suppliers</CardTitle>
          </CardHeader>
          <CardContent>{stats?.verifiedSuppliers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Docs</CardTitle>
          </CardHeader>
          <CardContent>{stats?.pendingDocs}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>{stats?.totalProducts}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>{stats?.totalCategories}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>{stats?.totalUsers}</CardContent>
        </Card>
      </div>

      {/* Charts: Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Supplier Registrations (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts?.suppliersByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#1976D2"
                  name="Suppliers"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verified vs Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vendorVerificationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts: Row 2 (products by category + world map) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={charts?.productsByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suppliers by Country (map)</CardTitle>
          </CardHeader>
          <CardContent>
            {/* <div style={{ width: "100%", height: 320 }}>
              <ComposableMap projectionConfig={{ scale: 135 }}>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      // try matching by common name (properties.NAME or NAME_LONG)
                      const name = (
                        geo.properties &&
                        (geo.properties.NAME || geo.properties.NAME_LONG || "")
                      )
                        .toString()
                        .toLowerCase();
                      const count = countryCountsMap.get(name) ?? 0;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={colorForCount(count)}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", opacity: 0.9 },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>

              <div className="mt-2 text-xs text-muted-foreground">
                Note: map matches supplier.country to geography NAME text; if a
                country doesnt color, check supplier.country spelling.
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* Top suppliers and recent stuff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {topSuppliers &&
                topSuppliers.map((s, i) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {i + 1}. {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.productsCount} products
                      </div>
                    </div>
                    <div className="text-sm">
                      <Badge>{s.rating.toFixed(2)}</Badge>
                    </div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Pending Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentDocs && recentDocs.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No pending documents
                </div>
              ) : (
                recentDocs &&
                recentDocs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {d.supplier?.name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.label ?? "Document"} •{" "}
                        {new Date(d.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <Link
                        href={`/admin/documents`}
                        className="text-sm underline"
                      >
                        Review
                      </Link>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentLogs &&
                recentLogs.map((l) => (
                  <li key={l.id} className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{l.action}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.entityType ?? "—"} • {l.reason ?? ""}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div>{l.admin.name}</div>
                      <div className="text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: Click “Review” to go to the Documents review page. If countries
        appear blank on the map, check `supplier.country` spelling and consider
        standardizing to ISO codes for better mapping.
      </div>
    </div>
  );
}
