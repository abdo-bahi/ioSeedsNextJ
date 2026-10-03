import { prisma } from "../../prisma/lib/prisma";

// ── Client IP extraction ──────────────────────────────────────────
export function extractClientIp(headers: Headers | null | undefined): string {
  if (!headers) return "unknown";
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

const PRIVATE_IP =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)|^(::1|fc|fd|fe80)/i;

export function isPrivateIp(ip: string): boolean {
  return !ip || ip === "unknown" || PRIVATE_IP.test(ip);
}

// ── Best-effort IP geolocation (ip-api.com, free, no key) ─────────
const GEO_TTL = 24 * 60 * 60 * 1000; // cache 24h per IP
const geoCache = new Map<string, { location: string | null; at: number }>();

async function resolveLocation(ip: string): Promise<string | null> {
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_TTL) return cached.location;

  const mark = (location: string | null) => {
    geoCache.set(ip, { location, at: Date.now() });
    return location;
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(
      `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city&lang=fr`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status === "success") {
      return mark(
        [data.city, data.regionName, data.country].filter(Boolean).join(", ") || null
      );
    }
    return mark(null);
  } catch {
    return mark(null);
  }
}

// ── Write a connection log row (best effort, never throws) ────────
export async function logConnection(input: {
  fk_user?: string | null;
  ip: string;
  success: boolean;
}): Promise<void> {
  try {
    const location = isPrivateIp(input.ip)
      ? input.ip === "unknown"
        ? null
        : "Réseau local"
      : await resolveLocation(input.ip);

    await prisma.connectionLog.create({
      data: {
        fk_user: input.fk_user ?? null,
        ipAddress: input.ip,
        success: input.success,
        location,
      },
    });
  } catch (e) {
    console.error("❌ ConnectionLog write failed:", e);
  }
}