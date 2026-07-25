import { NextResponse } from "next/server";
import {
  isLibraryAdminAuthorized,
  isLibraryAdminConfigured,
  libraryAdminUnauthorized,
} from "@/lib/libraryAdmin";

/** Verify owner password before showing upload controls. */
export async function POST(request: Request) {
  try {
    if (!isLibraryAdminConfigured()) {
      return libraryAdminUnauthorized();
    }

    const body = (await request.json().catch(() => null)) as {
      password?: string;
    } | null;
    const password = body?.password?.trim() || "";

    if (!password) {
      return NextResponse.json(
        { error: "Enter your owner password." },
        { status: 400 },
      );
    }

    // Reuse the same check as API routes (header comparison)
    const probe = new Request(request.url, {
      headers: { "x-library-admin": password },
    });
    if (!isLibraryAdminAuthorized(probe)) {
      return NextResponse.json(
        { error: "Wrong password. Only the library owner can upload songs." },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
