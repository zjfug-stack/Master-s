/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Sportradar API keys are only accessible server-side
  serverRuntimeConfig: {
    sportradarApiKey: process.env.SPORTRADAR_API_KEY,
  },
};

export default nextConfig;
