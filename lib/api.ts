import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

// Django backend URL - configured in apiConfig.ts

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login/", { email, password }),

  signup: (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) =>
    api.post("/auth/register/", {
      username,
      email,
      password,
      confirm_password: password,
      first_name: firstName || "",
      last_name: lastName || "",
    }),

  logout: () => api.post("/auth/logout/"),

  getProfile: () => api.get("/auth/user/"),

  updateProfile: (data: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  }) => api.put("/auth/user/", data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post("/auth/change-password/", {
      old_password: oldPassword,
      new_password: newPassword,
    }),

  getAllUsers: () => api.get("/auth/users/"),

  approveUser: (userId: number) => api.post(`/auth/users/${userId}/approve/`),

  disapproveUser: (userId: number) =>
    api.post(`/auth/users/${userId}/disapprove/`),

  updateUserPermissions: (
    userId: number,
    data: { is_staff: boolean; is_superuser: boolean }
  ) => api.post(`/auth/users/${userId}/update-permissions/`, data),

  resetUserPassword: (userId: number, newPassword: string) =>
    api.post(`/auth/users/${userId}/reset-password/`, {
      new_password: newPassword,
    }),
};

export const accountsAPI = {
  list: () => api.get("/accounts/"),

  create: (data: { email: string; password: string }) =>
    api.post("/accounts/", data),

  addWithLogin: (data: { email: string; password: string }) =>
    api.post("/accounts/add-with-login/", data),

  addManualLogin: (email: string) =>
    api.post("/accounts/add-manual-login/", { email }),

  updateSession: (id: number) => api.post(`/accounts/${id}/update-session/`),

  delete: (id: number) => api.delete(`/accounts/${id}/`),

  bulkUpload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/accounts/bulk-upload/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  importSession: (data: { session_data: any; filename: string }) =>
    api.post("/accounts/import-session/", data),
};

export const postsAPI = {
  list: () => api.get("/posts/"),

  create: (data: FormData) =>
    api.post("/posts/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/posts/${id}/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) => api.delete(`/posts/${id}/`),

  bulkUpload: (file: File, accountIds: number[]) => {
    const formData = new FormData();
    formData.append("csv_file", file);
    accountIds.forEach((id) => {
      formData.append("accounts[]", id.toString());
    });
    return api.post("/posts/bulk-upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  startPosting: (postIds: number[]) =>
    api.post("/posts/start-posting/", { post_ids: postIds }),
};

export const statsAPI = {
  getDashboard: () => api.get("/stats/dashboard/"),
};

export const analyticsAPI = {
  getAnalytics: (
    period: "weekly" | "monthly" | "lifetime" = "lifetime",
    account?: string
  ) => {
    const params: any = { period };
    if (account) {
      params.account = account;
    }
    return api.get("/analytics/", { params });
  },
};
