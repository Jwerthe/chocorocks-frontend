// next.config.ts (Verificado y Corregido)
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',   // ⚠️ acepta cualquier host con HTTPS
        pathname: '/**',  // cualquier path
      },
      {
        protocol: 'http',
        hostname: '**',   // si quieres permitir también HTTP
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://23.20.243.209:8080'}/chocorocks/api/:path*`,
      },
    ];
  },
  // Asegurar que las variables de entorno están disponibles
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;