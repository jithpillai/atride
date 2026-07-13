import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

async function approvedOrigin(request: Request, slug: string) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === new URL(request.url).origin) return origin;
  const approved = await db.communityEmbedOrigin.findFirst({ where: { origin, community: { slug, status: "ACTIVE" } }, select: { id: true } });
  return approved ? origin : null;
}

function cors(origin: string) {
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, OPTIONS", "access-control-allow-headers": "content-type", vary: "Origin" };
}

export async function OPTIONS(request: Request, { params }: Props) {
  const { slug } = await params;
  const origin = await approvedOrigin(request, slug);
  return origin ? new Response(null, { status: 204, headers: cors(origin) }) : Response.json({ ok: false, message: "This website is not approved for the Guild widget." }, { status: 403 });
}

export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const origin = await approvedOrigin(request, slug);
  if (!origin) return Response.json({ ok: false, message: "This website is not approved for the Guild widget." }, { status: 403, headers: { vary: "Origin" } });
  const guild = await db.community.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      slug: true, name: true, shortName: true,
      rides: {
        where: { status: "PUBLISHED", visibility: "PUBLIC", startsAt: { gte: new Date() } },
        orderBy: [{ featured: "desc" }, { startsAt: "asc" }], take: 12,
        select: { slug: true, title: true, summary: true, originCity: true, destination: true, startsAt: true, endsAt: true, pricePaise: true, totalSlots: true, bufferSlots: true, bookedSlots: true, vehicleType: true, difficulty: true, featured: true },
      },
    },
  });
  if (!guild) return Response.json({ ok: false, message: "Guild not found." }, { status: 404, headers: cors(origin) });
  return Response.json({
    ok: true,
    guild: { slug: guild.slug, name: guild.name, shortName: guild.shortName },
    rides: guild.rides.map((ride) => ({ slug: ride.slug, title: ride.title, summary: ride.summary, originCity: ride.originCity, destination: ride.destination, startsAt: ride.startsAt, endsAt: ride.endsAt, price: ride.pricePaise / 100, slotsAvailable: Math.max(0, ride.totalSlots + ride.bufferSlots - ride.bookedSlots), vehicleType: ride.vehicleType, difficulty: ride.difficulty, featured: ride.featured, url: `${new URL(request.url).origin}/rides/${ride.slug}` })),
  }, { headers: { ...cors(origin), "cache-control": "public, max-age=60, s-maxage=300" } });
}
