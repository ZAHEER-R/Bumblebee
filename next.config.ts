import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode:false,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;