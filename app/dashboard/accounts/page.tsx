"use client";

import { useEffect, useState } from "react";
import { accountsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  Upload,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";
import AddAccountModal from "@/components/AddAccountModal";
import BulkUploadModal from "@/components/BulkUploadModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface FacebookAccount {
  id: number;
  email: string;
  session_exists: boolean;
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isManualLoginOpen, setIsManualLoginOpen] = useState(false);
  const [manualLoginEmail, setManualLoginEmail] = useState("");
  const [manualLoginLoading, setManualLoginLoading] = useState(false);
  const [manualLoginError, setManualLoginError] = useState("");
  const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(
    null
  );
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger" as "danger" | "warning" | "success" | "info",
    confirmText: "Confirm",
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.list();
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError("Failed to load accounts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLoginSubmit = async () => {
    // Clear previous error
    setManualLoginError("");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualLoginEmail)) {
      setManualLoginError("Please enter a valid email address");
      return;
    }

    try {
      setManualLoginLoading(true);
      await accountsAPI.addManualLogin(manualLoginEmail);

      // Close modal
      setIsManualLoginOpen(false);
      setManualLoginEmail("");
      setManualLoginError("");

      // Refresh accounts list after a delay (give time for login)
      setTimeout(() => {
        fetchAccounts();
      }, 3000);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || "Failed to start manual login";
      setManualLoginError(errorMsg);

      // Only log unexpected errors to console (not validation errors)
      if (err.response?.status !== 400) {
        console.error(err);
      }
    } finally {
      setManualLoginLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const accountToDelete = accounts.find((acc) => acc.id === id);

    setConfirmDialog({
      isOpen: true,
      title: "Delete Account",
      message: `Are you sure you want to delete the account "${
        accountToDelete?.email || "this account"
      }"? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await accountsAPI.delete(id);
          setAccounts(accounts.filter((acc) => acc.id !== id));
        } catch (err) {
          alert("Failed to delete account");
          console.error(err);
        }
      },
    });
  };

  const handleBulkDelete = async () => {
    if (selectedAccounts.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Selected Accounts",
      message: `Are you sure you want to delete ${selectedAccounts.length} account(s)? This action cannot be undone.`,
      type: "danger",
      confirmText: "Delete All",
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          const deletePromises = selectedAccounts.map((id) =>
            accountsAPI.delete(id)
          );
          const results = await Promise.allSettled(deletePromises);

          const successCount = results.filter(
            (r) => r.status === "fulfilled"
          ).length;
          const failCount = results.filter(
            (r) => r.status === "rejected"
          ).length;

          if (successCount > 0) {
            alert(`Successfully deleted ${successCount} account(s)`);
            setSelectedAccounts([]);
            fetchAccounts();
          }

          if (failCount > 0) {
            alert(`Failed to delete ${failCount} account(s)`);
          }
        } catch (err) {
          alert("Failed to delete accounts");
          console.error(err);
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map((acc) => acc.id));
    }
  };

  const handleSelectAccount = (id: number) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((accId) => accId !== id) : [...prev, id]
    );
  };

  const handleUpdateSession = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: "Update Session",
      message:
        "This will open a browser window for you to log in to Facebook. The session will be saved once you complete the login. Continue?",
      type: "info",
      confirmText: "Continue",
      onConfirm: async () => {
        try {
          setUpdatingSessionId(id);
          const response = await accountsAPI.updateSession(id);
          setConfirmDialog({
            isOpen: true,
            title: "Login Required",
            message:
              response.data.message ||
              "Browser opening for login. Please complete the login process.",
            type: "success",
            confirmText: "OK",
            onConfirm: () => {
              setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            },
          });
          // Refresh accounts after a delay to allow session update
          setTimeout(() => {
            fetchAccounts();
            setUpdatingSessionId(null);
          }, 3000);
        } catch (err: unknown) {
          const error = err as { response?: { data?: { error?: string } } };
          setConfirmDialog({
            isOpen: true,
            title: "Update Failed",
            message:
              error.response?.data?.error ||
              "Failed to update session. Please try again.",
            type: "danger",
            confirmText: "OK",
            onConfirm: () => {
              setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
            },
          });
          setUpdatingSessionId(null);
          console.error(err);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
      />

      {/* Add Account Modal */}
      <AddAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAccounts}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={fetchAccounts}
      />

      {/* Manual Login Modal */}
      {isManualLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Manual Login
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Enter your Facebook email. A browser will open for you to login
              manually.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="manualEmail"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Facebook Email
                </label>
                <input
                  id="manualEmail"
                  type="email"
                  value={manualLoginEmail}
                  onChange={(e) => {
                    setManualLoginEmail(e.target.value);
                    setManualLoginError(""); // Clear error when typing
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !manualLoginLoading) {
                      handleManualLoginSubmit();
                    }
                  }}
                  placeholder="your.email@example.com"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 ${
                    manualLoginError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-green-500"
                  }`}
                  disabled={manualLoginLoading}
                  autoFocus
                />
                {manualLoginError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <X size={16} />
                    {manualLoginError}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-medium mb-1">
                  ℹ️ What happens next:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Browser opens to Facebook login</li>
                  <li>You type email & password manually</li>
                  <li>Solve CAPTCHA if shown</li>
                  <li>Browser closes automatically</li>
                  <li>Session saved for posting!</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setIsManualLoginOpen(false);
                    setManualLoginEmail("");
                    setManualLoginError("");
                  }}
                  variant="outline"
                  disabled={manualLoginLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualLoginSubmit}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={manualLoginLoading || !manualLoginEmail.trim()}
                >
                  {manualLoginLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Opening Browser...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-2" />
                      Start Manual Login
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Facebook Accounts
          </h1>
          <p className="text-gray-700 mt-1">
            Manage your Facebook accounts for marketplace automation
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsBulkUploadOpen(true)}
            variant="purple"
            className="flex items-center gap-2"
          >
            <Upload size={20} />
            Upload Multiple Accounts
          </Button>
          <Button
            onClick={() => setIsManualLoginOpen(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <UserPlus size={20} />
            Manual Login
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus size={20} />
            Add Account
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Total Accounts
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {accounts.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              All registered accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Active Sessions
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {accounts.filter((acc) => acc.session_exists).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Ready to post</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              No Session
            </CardTitle>
            <XCircle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">
              {accounts.filter((acc) => !acc.session_exists).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Requires login</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-gray-900">All Accounts</CardTitle>
              {accounts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="w-fit"
                >
                  {selectedAccounts.length === accounts.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              )}
            </div>

            {/* Bulk Actions - Right Side */}
            {selectedAccounts.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {selectedAccounts.length} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete {selectedAccounts.length}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                No accounts
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Get started by adding a Facebook account.
              </p>
              <div className="mt-6">
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus size={20} className="mr-2" />
                  Add Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                      {/* Checkbox column header - empty for safety */}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Session Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accounts.map((account) => (
                    <tr
                      key={account.id}
                      className={`hover:bg-gray-50 ${
                        selectedAccounts.includes(account.id)
                          ? "bg-blue-50"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.id)}
                          onChange={() => handleSelectAccount(account.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Select account ${account.email}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {account.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {account.session_exists ? (
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(account.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {!account.session_exists && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUpdateSession(account.id)}
                              disabled={updatingSessionId === account.id}
                              className="flex items-center gap-1"
                            >
                              <RefreshCw
                                size={16}
                                className={
                                  updatingSessionId === account.id
                                    ? "animate-spin"
                                    : ""
                                }
                              />
                              {updatingSessionId === account.id
                                ? "Updating..."
                                : "Update Session"}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(account.id)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 size={16} />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
