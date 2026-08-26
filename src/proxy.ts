import { getAuth } from "@/lib/auth/server";

export default getAuth().middleware({ loginUrl: "/sign-in" });

export const config = {
  matcher: ["/app/:path*"],
};
