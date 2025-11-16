export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface FacebookAccount {
  id: number;
  email: string;
  password?: string;
  session_cookie?: string;
  created_at: string;
}

export interface MarketplacePost {
  id: number;
  account: FacebookAccount;
  title: string;
  description: string;
  price: number;
  image?: string;
  scheduled_time: string;
  posted: boolean;
  retry_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardStats {
  total_accounts: number;
  active_accounts: number;
  total_posts: number;
  pending_posts: number;
  posted_today: number;
  success_rate: number;
}

// NEW: Posting job tracking for real-time progress
export interface PostingJob {
  id: number;
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  total_posts: number;
  completed_posts: number;
  failed_posts: number;
  current_post_id?: number;
  current_post_title?: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  progress_percentage: number;
}

// NEW: Error logging
export interface ErrorLog {
  id: number;
  post: number;
  post_title: string;
  error_type:
    | "session_expired"
    | "network_error"
    | "captcha"
    | "rate_limit"
    | "validation_error"
    | "unknown";
  error_message: string;
  stack_trace?: string;
  screenshot?: string;
  created_at: string;
}

// NEW: Account health monitoring
export interface AccountHealth {
  account_id: number;
  email: string;
  session_exists: boolean;
  session_valid: boolean;
  session_age_days?: number;
  total_posts: number;
  posted_count: number;
  failed_count: number;
  health_status: "healthy" | "warning" | "error";
}

export interface HealthCheckResponse {
  overall_health: "healthy" | "warning" | "error";
  summary: {
    total_accounts: number;
    healthy: number;
    warning: number;
    error: number;
  };
  accounts: AccountHealth[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
