/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "12mb" }
  },
  images: {
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost }] : []
  },
  async redirects() {
    // Old PHP URLs keep working (bookmarks, shared links).
    return [
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/shop.php", destination: "/shop", permanent: true },
      { source: "/custom.php", destination: "/custom", permanent: true },
      { source: "/contact.php", destination: "/contact", permanent: true },
      { source: "/track_order.php", destination: "/track-order", permanent: true },
      { source: "/cart.php", destination: "/cart", permanent: true },
      { source: "/checkout.php", destination: "/checkout", permanent: true },
      { source: "/admin/index.php", destination: "/admin", permanent: true },
      { source: "/admin/login.php", destination: "/admin/login", permanent: true }
    ];
  }
};

export default nextConfig;
