"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { accountsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  DollarSign,
  FileText,
  Users,
} from "lucide-react";
import api from "@/lib/api";

interface FacebookAccount {
  id: number;
  email: string;
  session_exists: boolean;
}

export default function CreatePostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<FacebookAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountsAPI.list();
      setAccounts(response.data);
    } catch (err) {
      console.error("Failed to load accounts:", err);
      alert("Failed to load accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAccounts([]);
      setSelectAll(false);
    } else {
      setSelectedAccounts(accounts.map((acc) => acc.id));
      setSelectAll(true);
    }
  };

  const handleSelectAccount = (accountId: number) => {
    if (selectedAccounts.includes(accountId)) {
      setSelectedAccounts(selectedAccounts.filter((id) => id !== accountId));
      setSelectAll(false);
    } else {
      const newSelected = [...selectedAccounts, accountId];
      setSelectedAccounts(newSelected);
      if (newSelected.length === accounts.length) {
        setSelectAll(true);
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageUrl("");
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    if (url) {
      setImagePreview(url);
      setImageFile(null);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (selectedAccounts.length === 0) {
      newErrors.accounts = "Please select at least one account";
    }
    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!price.trim()) {
      newErrors.price = "Price is required";
    } else if (isNaN(Number(price)) || Number(price) <= 0) {
      newErrors.price = "Price must be a positive number";
    }
    if (!imageFile && !imageUrl) {
      newErrors.image = "Please provide an image (file upload or URL)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("account_ids", JSON.stringify(selectedAccounts));
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", price);

      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrl) {
        formData.append("image_url", imageUrl);
      }

      const response = await api.post("/posts/create-for-accounts/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(
        response.data.message ||
          `Successfully created posts for ${selectedAccounts.length} account(s)!`
      );
      router.push("/dashboard/posts");
    } catch (err: any) {
      console.error("Failed to create posts:", err);
      const errorMessage =
        err.response?.data?.error ||
        "Failed to create posts. Please try again.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/posts")}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Posts
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Marketplace Post
          </h1>
          <p className="text-gray-600 mt-1">
            Create a post for one or more Facebook accounts
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Facebook Accounts Selection */}
        <Card>
          <CardHeader className="bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Facebook Accounts
              </CardTitle>
              <span className="text-sm text-gray-600">
                {selectedAccounts.length} selected
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {errors.accounts && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {errors.accounts}
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="font-semibold text-gray-900">
                  Select All Accounts
                </span>
              </label>
            </div>

            <div className="text-sm text-gray-600 mb-3">
              Select one or more accounts. Post will be created for each
              selected account
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No accounts available. Please add Facebook accounts first.
                </div>
              ) : (
                accounts.map((account) => (
                  <label
                    key={account.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border hover:border-blue-400 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => handleSelectAccount(account.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {account.email}
                      </div>
                      {account.session_exists ? (
                        <span className="text-xs text-green-600">
                          ✓ Active Session
                        </span>
                      ) : (
                        <span className="text-xs text-red-600">
                          ⚠ No Session
                        </span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Post Details */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Post Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Brand New Office Chair"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe your product in detail..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={`pl-10 ${errors.price ? "border-red-500" : ""}`}
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image Options (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {errors.image && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {errors.image}
              </div>
            )}

            {/* Option 1: Upload Image */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-600" />
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Option 1: Upload Image
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Upload an image file (optional)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Option 2: Image URL */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Option 2: Image URL
              </label>
              <Input
                type="url"
                value={imageUrl}
                onChange={handleImageUrlChange}
                placeholder="https://example.com/image.jpg"
                className="bg-white"
              />
              <p className="mt-2 text-xs text-gray-600">
                Or provide an image URL (optional)
              </p>
            </div>

            {/* Tip */}
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <p className="text-sm text-cyan-900">
                💡 <strong>Tip:</strong> You can either upload 1 file OR provide
                a URL, but not both. Leave both empty if you want to add the
                image later.
              </p>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Image Preview:
                </p>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-md h-auto rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Note */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  !
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">📝 Note:</h3>
                <p className="text-sm text-blue-800">
                  This post will be created for{" "}
                  <strong>
                    all {selectedAccounts.length} selected account(s)
                  </strong>{" "}
                  and will be scheduled for <strong>immediate posting</strong>.
                  If you select 3 accounts, 3 identical posts will be created.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/posts")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || selectedAccounts.length === 0}
            className="min-w-[200px]"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Posts...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Create Post(s)
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
