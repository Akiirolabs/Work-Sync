import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api/guard";

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  return NextResponse.json([
    {
      id: "file",
      label: "Local file pointer",
      status: "ready",
      description: "Store a path next to a claim. The file stays where it is.",
    },
    {
      id: "folder",
      label: "Folder pointer",
      status: "stub",
      description: "Point at a directory of notes or dumps. Not a vault import.",
    },
    {
      id: "url",
      label: "URL pointer",
      status: "stub",
      description: "Link a living page. Re-verify when the expiry hits.",
    },
  ]);
}
