import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        port: "",
      },
      {
        protocol: "https",
        hostname: "fdd5alqxb0.ufs.sh",
        port: "",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
        port: "",
      },
    ],
  },
  // experimental: {
  //   ppr: true,
  //   dynamicIO: true,
  // },
};

// module.exports = {
//   outputFileTracingRoot: __dirname,
//   // other config...
// };

export default nextConfig;
// This configuration allows Next.js to load images from the Uploadthing CDN.
// The `utfs.io` hostname is used by Uploadthing to serve uploaded files.
// This is necessary for the application to display images uploaded through Uploadthing.
// The `remotePatterns` array specifies the allowed remote image sources.
// The `protocol`, `hostname`, and `port` fields define the structure of the remote image URL.
// The `protocol` is set to `https`, which is the secure version of HTTP.
