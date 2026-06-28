/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // football-data.org serves team crest images from these hosts
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "**.football-data.org" },
    ],
  },
};

export default nextConfig;
