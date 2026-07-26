import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sta dev-toegang toe vanaf het lokale netwerk (bv. testen op je telefoon
  // via het LAN-IP). Next.js 16 blokkeert cross-origin dev-resources anders.
  allowedDevOrigins: ["192.168.2.42"],
};

export default nextConfig;
