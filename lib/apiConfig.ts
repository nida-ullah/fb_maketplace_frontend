// Primary: Cloudflare Tunnel (permanent)
// Fallback: ngrok (temporary)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.nidaullah.tech/api";

export const FALLBACK_API_URL =
  "https://torie-hippiest-jeni.ngrok-free.dev/api";


// export const API_BASE_URL =
//   process.env.NEXT_PUBLIC_API_URL ||
//   "https://torie-hippiest-jeni.ngrok-free.dev/api";
//   // "https://thuy-butlerlike-subculturally.ngrok-free.dev/api";
