"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, Upload, FileJson, CheckCircle } from "lucide-react";
import { accountsAPI } from "@/lib/api";

interface ImportSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string, type: "success" | "error") => void;
}

export default function ImportSessionModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportSessionModalProps) {
  const [sessionData, setSessionData] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [importDetails, setImportDetails] = useState<{
    filename: string;
    format: string;
    converted: boolean;
    cookies_count: number;
    facebook_user_id: string;
    email: string;
    account_created: boolean;
    account_id: number;
  } | null>(null);
  const [inputMethod, setInputMethod] = useState<"paste" | "upload">("upload");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file");
      return;
    }

    // Extract filename without extension
    const nameWithoutExt = file.name.replace(".json", "");
    setFilename(nameWithoutExt);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Validate JSON
        JSON.parse(content);
        setSessionData(content);
        setError("");
      } catch {
        setError("Invalid JSON file format");
        setSessionData("");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setImportDetails(null);

    // Validation
    if (!sessionData.trim()) {
      setError("Please provide session data");
      return;
    }

    if (!filename.trim()) {
      setError("Please provide a filename");
      return;
    }

    try {
      setLoading(true);

      // Parse JSON to validate
      let parsedData;
      try {
        parsedData = JSON.parse(sessionData);
      } catch {
        setError(
          "Invalid JSON format. Please paste valid JSON data from your browser session export."
        );
        setLoading(false);
        return;
      }

      // Call API
      const response = await accountsAPI.importSession({
        session_data: parsedData,
        filename: filename,
      });

      setSuccess(true);
      setImportDetails(response.data.details);

      // Show success message
      const successMsg = `Session imported successfully for ${
        response.data.details.email
      }! ${
        response.data.details.account_created
          ? "New account created."
          : "Account updated."
      }`;

      // Reset form after 1.5 seconds and call onSuccess with message
      setTimeout(() => {
        handleClose();
        onSuccess(successMsg, "success");
      }, 1500);
    } catch (err) {
      const error = err as {
        response?: { data?: { error?: string }; status?: number };
      };
      const errorMsg =
        error.response?.data?.error || "Failed to import session";
      setError(errorMsg);

      // Also notify parent after a delay so user can see the error in modal
      setTimeout(() => {
        handleClose();
        onSuccess(errorMsg, "error");
      }, 3000);

      // Only log unexpected errors (not validation errors like 400)
      if (error.response?.status !== 400) {
        console.error("Import session error:", errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSessionData("");
    setFilename("");
    setError("");
    setSuccess(false);
    setImportDetails(null);
    setInputMethod("upload");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Import Facebook Session
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload or paste your browser-exported session JSON
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && importDetails && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-3 text-green-800 font-bold mb-3 text-lg">
                <CheckCircle size={24} className="text-green-600" />
                Session Imported Successfully!
              </div>
              <div className="text-sm text-green-700 space-y-2 ml-9">
                <p className="flex justify-between">
                  <span className="font-semibold">Email:</span>
                  <span className="font-mono">{importDetails.email}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold">Format:</span>
                  <span>
                    {importDetails.format}{" "}
                    {importDetails.converted && (
                      <span className="text-xs bg-green-200 px-2 py-0.5 rounded">
                        converted
                      </span>
                    )}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold">Cookies:</span>
                  <span className="font-mono">
                    {importDetails.cookies_count}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold">Facebook User ID:</span>
                  <span className="font-mono text-xs">
                    {importDetails.facebook_user_id}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold">Status:</span>
                  <span className="font-semibold">
                    {importDetails.account_created
                      ? "✨ New account created"
                      : "🔄 Existing account updated"}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-800 px-5 py-4 rounded-lg shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">
                    Import Failed
                  </h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Input Method Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setInputMethod("upload")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                inputMethod === "upload"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Upload size={16} className="inline mr-2" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setInputMethod("paste")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                inputMethod === "paste"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileJson size={16} className="inline mr-2" />
              Paste JSON
            </button>
          </div>

          {/* File Upload */}
          {inputMethod === "upload" && (
            <div>
              <label
                htmlFor="file-upload"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Session JSON File
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent p-2"
              />
              <p className="text-xs text-gray-500 mt-2">
                Export cookies from browser extension (e.g., EditThisCookie) as
                JSON
              </p>
            </div>
          )}

          {/* Paste JSON */}
          {inputMethod === "paste" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session JSON Data
              </label>
              <textarea
                value={sessionData}
                onChange={(e) => {
                  const value = e.target.value;
                  setSessionData(value);

                  // Clear error if field is empty
                  if (!value.trim()) {
                    setError("");
                    return;
                  }

                  // Validate JSON in real-time
                  try {
                    JSON.parse(value);
                    setError(""); // Clear error if valid
                  } catch {
                    setError(
                      "Invalid JSON format. Please check your pasted data."
                    );
                  }
                }}
                placeholder='Paste your session JSON here... e.g., [{"name":"c_user","value":"..."}]'
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 bg-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-2">
                Paste the JSON content from your browser cookie export
              </p>
            </div>
          )}

          {/* Filename */}
          <div>
            <label
              htmlFor="filename"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Facebook Account Email
            </label>
            <input
              id="filename"
              type="email"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g., myaccount@gmail.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Enter the Facebook email address or any name but in email format
              (e.g., test@gmail.com)
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900 text-sm">
                📝 How to Export Session from Browser:
              </h3>
              <a
                href="https://youtu.be/LK7EnP6YFPA?si=9qSpOizpaVNq1bSn"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Watch Tutorial
              </a>
            </div>
            <ol className="text-sm text-blue-800 space-y-1.5 list-decimal list-inside">
              <li>
                Install{" "}
                <a
                  href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline text-blue-700 hover:text-blue-900"
                >
                  Cookie Editor Extension
                </a>{" "}
                from Chrome Web Store
              </li>
              <li>Login to Facebook in your browser</li>
              <li>
                Click the Cookie Editor icon and export all cookies as JSON
              </li>
              <li>Upload or paste the JSON here with your Facebook email</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-900">
              💡 <span className="font-semibold">Tip:</span> Watch the tutorial
              above for a step-by-step visual guide
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              onClick={handleClose}
              variant="ghost"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading || !sessionData.trim() || !filename.trim()}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Import Session
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
