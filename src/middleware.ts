import { NextResponse, NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Example path protections
  // Note: Most authorization is handled at the layout/API level.
  // The middleware just ensures some basic structure if needed.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
