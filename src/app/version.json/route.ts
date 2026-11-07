/** Which build is deployed right now. The app compares it with the build it is running to offer updates. */
export const dynamic = "force-static";

export function GET() {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev", builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? null });
}
