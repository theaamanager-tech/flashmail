import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Inbox, Mail, Globe, Key, Zap, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getDashboardStatsFn, getEmailUsageHistoryFn } from "@/lib/server-fns/member-fns";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/dashboard/")({
  component: OverviewPage,
  loader: async () => {
    const stats = await getDashboardStatsFn();
    const history = await getEmailUsageHistoryFn({ data: { days: 7 } });
    return { stats, history };
  },
});

function OverviewPage() {
  const { data } = useSuspenseQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const stats = await getDashboardStatsFn();
      const history = await getEmailUsageHistoryFn({ data: { days: 7 } });
      return { stats, history };
    },
  });

  const { stats, history } = data;
  const usagePct = Math.min(100, Math.round((stats.receivedToday / stats.dailyLimit) * 100));

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-medium sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan aktivitas dan penggunaan akun.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon={<Inbox className="h-5 w-5" />}
          label="Total Mailboxes"
          value={stats.totalMailboxes}
        />
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Emails Today"
          value={`${stats.emailsToday} / ${stats.dailyLimit}`}
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          label="Remaining Credit"
          value={stats.remainingCredit}
        />
        <StatCard
          icon={<Globe className="h-5 w-5" />}
          label="Private Domains"
          value={stats.privateDomains}
        />
        <StatCard
          icon={<Key className="h-5 w-5" />}
          label="Active API Keys"
          value={stats.activeApiKeys}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Emails"
          value={stats.totalEmails}
        />
      </div>

      <div className="mt-8 border border-[#303030] bg-[#181818] p-6">
        <h2 className="mb-2 font-display text-lg font-medium">Daily Email Credit</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {stats.receivedToday} of {stats.dailyLimit} used
          </span>
          <span className="font-medium">{stats.remainingCredit} remaining</span>
        </div>
        <Progress value={usagePct} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">Resets daily at 00:00 UTC</p>
      </div>

      <div className="mt-8 border border-[#303030] bg-[#181818] p-6">
        <h2 className="mb-4 font-display text-lg font-medium">Email Received — Last 7 Days</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#da291c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#da291c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                }
                stroke="oklch(1 0 0 / 0.3)"
                fontSize={12}
              />
              <YAxis stroke="oklch(1 0 0 / 0.3)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#181818",
                  border: "1px solid #303030",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#da291c"
                fillOpacity={1}
                fill="url(#colorEmails)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border border-[#303030] bg-[#181818] p-5 transition hover:border-[#505050]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex h-8 w-8 items-center justify-center border border-[#303030]">
          {icon}
        </div>
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-medium">{value}</div>
    </div>
  );
}
