import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/auth"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (!isPublicPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/auth");
  }
});

export const config = {
  // /api routes (including /api/health) are intentionally excluded from auth middleware
  // and are either public by design or protected within the route handler itself.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
