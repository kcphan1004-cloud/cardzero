import type { NextConfig } from "next";

const nextConfig = {
  async redirects() {
    return [
      {
        source: "/cards",
        destination: "/card",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;