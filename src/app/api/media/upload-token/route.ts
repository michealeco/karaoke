import { NextResponse } from "next/server";
import {
  createUploadToken,
  getPublicUploadUrl,
  isRemoteMediaEnabled,
} from "@/lib/media";
import {
  isLibraryAdminAuthorized,
  libraryAdminUnauthorized,
} from "@/lib/libraryAdmin";

export async function GET(request: Request) {
  try {
    if (!isLibraryAdminAuthorized(request)) {
      return libraryAdminUnauthorized();
    }

    if (!isRemoteMediaEnabled()) {
      return NextResponse.json({
        mode: "local",
        uploadUrl: null,
        token: null,
      });
    }

    return NextResponse.json({
      mode: "ubuntu",
      uploadUrl: getPublicUploadUrl(),
      token: createUploadToken(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
