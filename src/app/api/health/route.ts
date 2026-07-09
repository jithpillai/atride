export async function GET() {
  return Response.json({ status: "ok", service: "atride-web", timestamp: new Date().toISOString() });
}
