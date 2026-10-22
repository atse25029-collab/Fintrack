/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: 'export',
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        async headers() {
          return [
            {
              source: "/sw.js",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=0, must-revalidate",
                },
                {
                  key: "Service-Worker-Allowed",
                  value: "/",
                },
              ],
            },
            {
              source: "/manifest.json",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=0, must-revalidate",
                },
                {
                  key: "Content-Type",
                  value: "application/manifest+json",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
