import type { NextRequest } from "next/server";

import { getAuth } from "@/lib/auth/server";

type Context = { params: Promise<{ path: string[] }> };

export function GET(request: NextRequest, context: Context) {
  return getAuth().handler().GET(request, context);
}

export function POST(request: NextRequest, context: Context) {
  return getAuth().handler().POST(request, context);
}

export function PUT(request: NextRequest, context: Context) {
  return getAuth().handler().PUT(request, context);
}

export function PATCH(request: NextRequest, context: Context) {
  return getAuth().handler().PATCH(request, context);
}

export function DELETE(request: NextRequest, context: Context) {
  return getAuth().handler().DELETE(request, context);
}
