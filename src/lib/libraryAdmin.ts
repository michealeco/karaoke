import { NextResponse } from "next/server";

/** Password only you set — required to upload/remove library songs. */
export function libraryAdminSecret() {
  return process.env.LIBRARY_ADMIN_SECRET?.trim() || "";
}

export function isLibraryAdminConfigured() {
  return Boolean(libraryAdminSecret());
}

export function isLibraryAdminAuthorized(request: Request) {
  const secret = libraryAdminSecret();
  if (!secret) return false;
  const header = request.headers.get("x-library-admin")?.trim() || "";
  return header.length > 0 && header === secret;
}

export function libraryAdminUnauthorized() {
  if (!isLibraryAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Library uploads are locked. Add LIBRARY_ADMIN_SECRET in Vercel → Settings → Environment Variables, Redeploy, then unlock here with that password.",
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: "Wrong password. Unlock with the LIBRARY_ADMIN_SECRET you set on Vercel." },
    { status: 401 },
  );
}
