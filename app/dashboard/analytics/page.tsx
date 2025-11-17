"use client";

import { useState, useEffect } from "react";
import { analyticsAPI, accountsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  User,
} from "lucide-react";

interface AnalyticsSummary {
  total_created: number;
  total_posted: number;
  currently_posted: number;
  currently_pending: number;
  not_posted: number;
}

interface AccountStats {
  account_email: string;
  created_count: number;
  posted_count: number;
}

interface DailyBreakdown {
  date: string;
  created: number;
  posted: number;
}

interface AnalyticsData {
  period: string;
  summary: AnalyticsSummary;
  by_account: AccountStats[];
  daily_breakdown: DailyBreakdown[];
}

interface FacebookAccount {
  id: number;
  email: string;
  session_cookie?: string;
  created_at: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"weekly" | "monthly" | "lifetime">(
    "lifetime"
  );
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  useEffect(() => {
    fetchAccounts();
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, selectedAccount]);

  const fetchAccounts = async () => {
    try {
      const response = await accountsAPI.list();
      console.log("Analytics - Accounts API Response:", response.data);
      const accountsData = response.data.results || response.data;
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (err) {
      console.error("Failed to load accounts", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getAnalytics(
        period,
        selectedAccount || undefined
      );
      console.log("Analytics API Response:", response.data);
      setAnalytics(response.data);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const successRate =
    analytics?.summary?.total_created && analytics.summary.total_created > 0
      ? Math.round(
          ((analytics.summary.total_posted || 0) /
            analytics.summary.total_created) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            📊 Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Track your posting performance and statistics
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Period Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Time Period
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={period === "weekly" ? "default" : "outline"}
                  onClick={() => setPeriod("weekly")}
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Weekly
                </Button>
                <Button
                  variant={period === "monthly" ? "default" : "outline"}
                  onClick={() => setPeriod("monthly")}
                  size="sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Monthly
                </Button>
                <Button
                  variant={period === "lifetime" ? "default" : "outline"}
                  onClick={() => setPeriod("lifetime")}
                  size="sm"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Lifetime
                </Button>
              </div>
            </div>

            {/* Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Account
              </label>
              <div className="relative">
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full h-9 px-4 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  aria-label="Filter by account"
                >
                  <option value="" className="text-gray-900">
                    All Accounts
                  </option>
                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.email}
                      className="text-gray-900"
                    >
                      {account.email}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics?.summary?.total_created || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  All time posts created
                </p>
              </div>
              <FileText className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics?.summary?.total_posted || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully posted
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Currently Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics?.summary?.currently_pending || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Waiting to be posted
                </p>
              </div>
              <Clock className="h-12 w-12 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {successRate}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Posts successfully posted
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Performance by Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!analytics?.by_account || analytics.by_account.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No account data available
            </p>
          ) : (
            <div className="space-y-4">
              {analytics.by_account.map((account, index) => {
                const accountSuccessRate =
                  account.created_count > 0
                    ? Math.round(
                        (account.posted_count / account.created_count) * 100
                      )
                    : 0;

                return (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {account.account_email}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {accountSuccessRate}% success rate
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">
                          Posts Created
                        </p>
                        <p className="text-2xl font-bold text-blue-600">
                          {account.created_count}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">
                          Posts Posted
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          {account.posted_count}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(accountSuccessRate, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Breakdown Chart */}
      {period !== "lifetime" && analytics.daily_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.daily_breakdown.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <div
                        className="bg-blue-500 h-8 rounded flex items-center justify-center text-white text-xs font-medium"
                        style={{
                          width: `${Math.max(
                            (day.created /
                              Math.max(
                                ...analytics.daily_breakdown.map(
                                  (d) => d.created
                                )
                              )) *
                              100,
                            5
                          )}%`,
                        }}
                      >
                        {day.created > 0 && `${day.created} created`}
                      </div>
                      <div
                        className="bg-green-500 h-8 rounded flex items-center justify-center text-white text-xs font-medium"
                        style={{
                          width: `${Math.max(
                            (day.posted /
                              Math.max(
                                ...analytics.daily_breakdown.map(
                                  (d) => d.posted
                                )
                              )) *
                              100,
                            5
                          )}%`,
                        }}
                      >
                        {day.posted > 0 && `${day.posted} posted`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Created</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">Posted</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-700 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Currently Posted
                </span>
                <span className="font-bold text-green-600">
                  {analytics?.summary?.currently_posted || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-gray-700 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Currently Pending
                </span>
                <span className="font-bold text-yellow-600">
                  {analytics?.summary?.currently_pending || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lifetime Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-700">Total Posts Created</span>
                <span className="font-bold text-blue-600">
                  {analytics?.summary?.total_created || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-700">Overall Success Rate</span>
                <span className="font-bold text-purple-600">
                  {successRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
