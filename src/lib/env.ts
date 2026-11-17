/** Environment access in one place, with clear errors when a key is missing. Names match .env.example. */
function need(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env.local (or set it in Vercel).`);
  }
  return value;
}

export function publicEnv() {
  return {
    supabaseUrl: need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: need("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "")
  };
}

export function serverEnv() {
  return {
    serviceRoleKey: need("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
}

export function paymongoEnv() {
  const secretKey = need("PAYMONGO_SECRET_KEY", process.env.PAYMONGO_SECRET_KEY);
  return {
    secretKey,
    webhookSecret: need("PAYMONGO_WEBHOOK_SECRET", process.env.PAYMONGO_WEBHOOK_SECRET),
    methods: (process.env.PAYMONGO_METHODS ?? "gcash,paymaya,card,qrph")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
    isLive: secretKey.startsWith("sk_live_")
  };
}
