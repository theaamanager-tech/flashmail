import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { getApiUsageFn } from "@/lib/server-fns/member-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/dashboard/api-usage")({
  component: ApiUsagePage,
});

function ApiUsagePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["api-usage"],
    queryFn: () => getApiUsageFn(),
  });

  const endpointCounts = (data?.recent ?? []).reduce(
    (acc: Record<string, { endpoint: string; method: string; count: number; last: string }>, r) => {
      const key = `${r.method} ${r.endpoint}`;
      if (!acc[key])
        acc[key] = { endpoint: r.endpoint, method: r.method, count: 0, last: r.requested_at };
      acc[key].count += 1;
      if (new Date(r.requested_at) > new Date(acc[key].last)) acc[key].last = r.requested_at;
      return acc;
    },
    {},
  );

  const chartData = Object.values(endpointCounts).slice(0, 10);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-medium sm:text-3xl">API Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau penggunaan API dan email harian.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="API Requests Today" value={data?.today ?? 0} />
            <StatCard label="API Requests This Month" value={data?.thisMonth ?? 0} />
            <StatCard label="Emails Received Today" value={0} />
            <StatCard label="Recent Endpoints" value={chartData.length} />
          </div>

          <div className="mt-8 h-[300px] border border-[#303030] bg-[#181818] p-5">
            <h2 className="mb-4 font-display text-lg font-medium">Top Endpoints</h2>
            {chartData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                Belum ada aktivitas API.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
                  <XAxis type="number" stroke="oklch(1 0 0 / 0.3)" fontSize={12} />
                  <YAxis
                    dataKey="endpoint"
                    type="category"
                    width={140}
                    stroke="oklch(1 0 0 / 0.3)"
                    fontSize={11}
                    tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
                  />
                  <Tooltip
                    contentStyle={{ background: "#181818", border: "1px solid #303030" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="count" fill="#da291c" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-8 border border-[#303030] bg-[#181818]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Request Count</TableHead>
                  <TableHead>Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(endpointCounts).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                      <Activity className="mx-auto mb-3 h-8 w-8 opacity-40" />
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.values(endpointCounts).map((r) => (
                    <TableRow key={r.endpoint + r.method}>
                      <TableCell className="font-mono text-xs">{r.endpoint}</TableCell>
                      <TableCell>{r.method}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.last).toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-[#303030] bg-[#181818] p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-medium">{value}</div>
    </div>
  );
}
