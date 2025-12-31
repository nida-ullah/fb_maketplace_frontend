"use client";

import { useState, useEffect } from "react";
import { accountsAPI } from "@/lib/api";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Account {
  id: number;
  email: string;
}

interface RenewalResult {
  account_id: number;
  email: string;
  renewed_count: number;
  available_count: number;
  success: boolean;
  message: string;
  condition_met: string;
  timestamp?: Date;
}

export default function RenewListingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [renewalCount, setRenewalCount] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RenewalResult[]>([]);
  const [totalRenewed, setTotalRenewed] = useState(0);
  const [activeRenewalJobId, setActiveRenewalJobId] = useState<string | null>(
    () => {
      // Load active job ID from localStorage on mount (survives page refresh)
      if (typeof window !== "undefined") {
        return localStorage.getItem("activeRenewalJobId");
      }
      return null;
    }
  );

  // Load activity logs from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem("renewalActivityLogs");
    if (savedLogs) {
      try {
        const parsedLogs = JSON.parse(savedLogs) as Array<{
          account_id: number;
          email: string;
          renewed_count: number;
          available_count: number;
          success: boolean;
          message: string;
          condition_met: string;
          timestamp: string;
        }>;

        // Convert timestamp strings back to Date objects
        const logsWithDates = parsedLogs.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));

        // Filter out logs older than 24 hours
        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        );
        const recentLogs = logsWithDates.filter(
          (log) =>
            log.timestamp &&
            log.timestamp.getTime() > twentyFourHoursAgo.getTime()
        );

        setResults(recentLogs);

        // Recalculate total renewed from loaded logs
        const calculatedTotal = recentLogs.reduce(
          (sum, result) => sum + (result.renewed_count || 0),
          0
        );
        setTotalRenewed(calculatedTotal);
      } catch (error) {
        console.error("Failed to load renewal activity logs:", error);
        localStorage.removeItem("renewalActivityLogs");
      }
    }
  }, []);

  // Save activity logs to localStorage whenever they change
  useEffect(() => {
    if (results.length > 0) {
      const logsWithTimestamp = results.map((log) => ({
        ...log,
        timestamp: new Date().toISOString(),
      }));
      localStorage.setItem(
        "renewalActivityLogs",
        JSON.stringify(logsWithTimestamp)
      );
    }
  }, [results]);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    // Check for active renewal process on page load
    if (activeRenewalJobId) {
      const checkRenewalStatus = async () => {
        try {
          // Since we don't have a backend endpoint to check renewal status,
          // we'll assume the process has completed if we have results
          // and clear the active job ID
          if (results.length > 0) {
            // Process has completed, clear the job ID
            localStorage.removeItem("activeRenewalJobId");
            setActiveRenewalJobId(null);
            setLoading(false);
          } else {
            // No results found, but we have an active job ID
            // This might be a stale job ID, so clear it
            console.log("Found stale renewal job ID, clearing...");
            localStorage.removeItem("activeRenewalJobId");
            setActiveRenewalJobId(null);
            setLoading(false);
          }
        } catch (error) {
          console.error("Error checking renewal status:", error);
          // Clear invalid job ID
          localStorage.removeItem("activeRenewalJobId");
          setActiveRenewalJobId(null);
          setLoading(false);
        }
      };

      checkRenewalStatus();
    }
  }, [activeRenewalJobId, results]);

  const loadAccounts = async () => {
    try {
      const response = await accountsAPI.list();
      setAccounts(response.data);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  };

  const toggleAccount = (accountId: number) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map((acc) => acc.id));
    }
  };

  const handleRenewal = async () => {
    if (selectedAccounts.length === 0) {
      alert("Please select at least one account");
      return;
    }

    if (renewalCount < 1 || renewalCount > 20) {
      alert("Renewal count must be between 1 and 20 (Facebook limit)");
      return;
    }

    setLoading(true);
    setResults([]);
    setTotalRenewed(0);

    // Generate unique job ID for this renewal process
    const jobId = `renewal_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setActiveRenewalJobId(jobId);
    localStorage.setItem("activeRenewalJobId", jobId);

    try {
      const response = await accountsAPI.renewListings({
        account_ids: selectedAccounts,
        renewal_count: renewalCount,
      });

      // Add timestamps to results for persistence
      const resultsWithTimestamp = response.data.results.map(
        (result: RenewalResult) => ({
          ...result,
          timestamp: new Date(),
        })
      );

      setResults(resultsWithTimestamp);

      // Calculate total renewed from results if API doesn't provide it
      const calculatedTotal =
        response.data.total_renewed ||
        response.data.results.reduce(
          (sum: number, result: RenewalResult) =>
            sum + (result.renewed_count || 0),
          0
        );
      setTotalRenewed(calculatedTotal);

      // Clear job ID when renewal completes successfully
      resetRenewalState();
    } catch (error: unknown) {
      let errorMessage = "Failed to renew listings. Please try again.";
      if (error && typeof error === "object" && "response" in error) {
        const responseError = error as {
          response?: { data?: { error?: string } };
        };
        errorMessage = responseError.response?.data?.error || errorMessage;
      }
      alert(errorMessage);

      // Clear job ID on error
      resetRenewalState();
    } finally {
      setLoading(false);
    }
  };

  const resetRenewalState = () => {
    setLoading(false);
    setActiveRenewalJobId(null);
    localStorage.removeItem("activeRenewalJobId");
  };

  const clearActivityLogs = () => {
    setResults([]);
    setSelectedAccounts([]);
    setTotalRenewed(0);
    localStorage.removeItem("renewalActivityLogs");
    resetRenewalState(); // Use the reset function
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Marketplace Renewal
            </h1>
            <p className="text-gray-700 mt-1">
              Manage listing renewals for your Facebook accounts
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Account Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Account Selection
                </h2>
                <p className="text-gray-600 mt-1 text-sm">
                  Choose accounts for renewal processing
                </p>
              </div>
              <button
                onClick={selectAll}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-200"
              >
                {selectedAccounts.length === accounts.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No accounts available</p>
                <p className="text-sm mt-2">
                  Please add Facebook accounts to continue
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="grid grid-cols-12 gap-4 font-medium text-gray-700 text-xs uppercase tracking-wider">
                    <div className="col-span-1">SELECT</div>
                    <div className="col-span-6">EMAIL</div>
                    <div className="col-span-3">SESSION STATUS</div>
                    <div className="col-span-2">ACTIONS</div>
                  </div>
                </div>

                {/* Scrollable Account List */}
                <div className="max-h-80 overflow-y-auto">
                  {accounts.map((account, index) => (
                    <label
                      key={account.id}
                      className={`grid grid-cols-12 gap-4 items-center px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                        selectedAccounts.includes(account.id)
                          ? "bg-blue-50"
                          : ""
                      } ${index === accounts.length - 1 ? "border-b-0" : ""}`}
                    >
                      {/* Checkbox Column */}
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.id)}
                          onChange={() => toggleAccount(account.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                      </div>

                      {/* Email Column */}
                      <div className="col-span-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="text-blue-600" size={16} />
                          </div>
                          <span className="text-gray-900">{account.email}</span>
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="col-span-3">
                        {true ? (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            <XCircle className="h-4 w-4 mr-1" />
                            No Session
                          </span>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="col-span-2">
                        <span className="text-sm text-gray-500">Ready</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Summary Footer */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{accounts.length} total accounts</span>
                    <span>{selectedAccounts.length} selected</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Renewal Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Renewal Configuration
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                Configure renewal parameters and execute
              </p>
            </div>

            <div className="space-y-6">
              {/* Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Listings Per Account
                    </label>
                    <input
                      type="number"
                      value={renewalCount}
                      onChange={(e) =>
                        setRenewalCount(parseInt(e.target.value) || 0)
                      }
                      min="1"
                      max="20"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-center font-medium"
                      placeholder="1-20"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mt-6">
                      Facebook displays maximum 20 eligible listings per session
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl font-semibold text-blue-700">
                        {selectedAccounts.length}
                      </div>
                      <div className="text-sm text-blue-600">
                        Selected Accounts
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-indigo-700">
                        {renewalCount}
                      </div>
                      <div className="text-sm text-indigo-600">Per Account</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-purple-700">
                        {selectedAccounts.length * renewalCount}
                      </div>
                      <div className="text-sm text-purple-600">
                        Total Target
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execute Button */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  {!loading &&
                    selectedAccounts.length > 0 &&
                    renewalCount >= 1 &&
                    renewalCount <= 20 && (
                      <p className="text-sm text-gray-600">
                        Ready to process {selectedAccounts.length} account
                        {selectedAccounts.length !== 1 ? "s" : ""}
                      </p>
                    )}
                </div>
                <Button
                  onClick={handleRenewal}
                  disabled={
                    loading ||
                    selectedAccounts.length === 0 ||
                    renewalCount < 1 ||
                    renewalCount > 20
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2" size={20} />
                      Execute Renewal
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Activity Log
                  {results.length > 0 && !loading && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Persistent (24h)
                    </span>
                  )}
                  {activeRenewalJobId && loading && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Active Process
                    </span>
                  )}
                </h2>
                <p className="text-gray-600 mt-1 text-sm">
                  Real-time renewal process monitoring • Data persists for 24
                  hours
                </p>
              </div>
              {!loading && results.length > 0 && (
                <Button
                  onClick={clearActivityLogs}
                  variant="outline"
                  className="px-4 py-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Clear Log
                </Button>
              )}
            </div>

            {/* Show processing during loading, detailed results after completion */}
            {loading || results.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                {!loading && results.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <RefreshCw className="text-gray-400" size={24} />
                    </div>
                    <p className="text-lg font-medium text-gray-600">
                      No renewal activity yet
                    </p>
                    <p className="text-sm mt-1">
                      Start a renewal process to see activity logs here
                    </p>
                  </div>
                )}

                {loading && results.length === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="animate-spin" size={16} />
                      <span className="text-sm font-medium">
                        Processing {selectedAccounts.length} account
                        {selectedAccounts.length !== 1 ? "s" : ""}...
                      </span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-700 font-medium mb-1">
                        Renewal Progress
                      </div>
                      <div className="text-sm text-blue-600">
                        • Authenticating with Facebook accounts
                        <br />
                        • Navigating to Marketplace
                        <br />• Processing {renewalCount} listing
                        {renewalCount !== 1 ? "s" : ""} per account
                      </div>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-3 text-orange-600 mb-2">
                      <Loader2 className="animate-spin" size={20} />
                      <span className="font-medium">
                        Processing renewal for {selectedAccounts.length} account
                        {selectedAccounts.length !== 1 ? "s" : ""}...
                      </span>
                    </div>
                    <div className="text-sm text-orange-700">
                      This may take a few minutes depending on the number of
                      accounts and listings.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* After completion, show detailed account results */
              <div className="space-y-4">
                {/* Success header */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                  <p className="text-lg font-semibold text-green-800 mb-1">
                    Renewal Process Complete
                  </p>
                  <p className="text-sm text-green-700">
                    {results.length} accounts processed • {totalRenewed}{" "}
                    listings renewed
                  </p>
                </div>

                {/* Detailed Account Results */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Account Summary
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {result.success ? (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle
                                className="text-green-600"
                                size={14}
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                              <AlertCircle className="text-red-600" size={14} />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {result.email}
                            </div>
                            <div className="text-sm text-gray-600">
                              {result.message}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-700">
                              {result.renewed_count}
                            </div>
                            <div className="text-xs text-gray-500">renewed</div>
                          </div>
                        </div>

                        {result.condition_met && (
                          <div className="mt-2 mb-3">
                            <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded text-xs font-medium">
                              {result.condition_met}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                          <div className="flex gap-4">
                            {result.available_count > 0 && (
                              <span>Available: {result.available_count}</span>
                            )}
                            {result.timestamp && (
                              <span>
                                Time: {result.timestamp.toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          <span
                            className={
                              result.success ? "text-green-600" : "text-red-600"
                            }
                          >
                            {result.success ? "Success" : "Failed"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="mt-6 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-600" size={24} />
                  <div>
                    <div className="text-lg font-bold text-green-800">
                      Process Complete
                    </div>
                    <div className="text-sm text-green-700">
                      All accounts have been processed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-800">
                    {totalRenewed}
                  </div>
                  <div className="text-sm text-green-700">Total Renewed</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
