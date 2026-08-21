import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sta dev-toegang toe vanaf het lokale netwerk (bv. testen op je telefoon
  // via het LAN-IP). Next.js 16 blokkeert cross-origin dev-resources anders.
  allowedDevOrigins: ["192.168.2.42"],
  // Profielfoto's gaan via een server-actie; sta grotere uploads toe dan de
  // standaard 1MB.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
