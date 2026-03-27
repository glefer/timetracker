import * as BunnySDK from "@bunny.net/edgescript-sdk";
import { app } from "./infrastructure/mod.ts";
import { addAddressRoutes } from "./routes/addresses.ts";
import { addDistanceRoutes } from "./routes/distances.ts";
import { addTimesheetRoutes } from "./routes/timesheets.ts";
import { addPageRoutes } from "./routes/pages.ts";
import { addPdfRoutes } from "./routes/pdf.ts";
import { addAdminRoutes } from "./routes/admin.ts";

addAdminRoutes(app);
addPageRoutes(app);
addAddressRoutes(app);
addDistanceRoutes(app);
addTimesheetRoutes(app);
addPdfRoutes(app);

function basicAuth(req: Request): Response | null {
  const credentials = Deno.env.get("BASIC_AUTH_CREDENTIALS");
  if (!credentials) return null;

  const expected = "Basic " + btoa(credentials);
  if (req.headers.get("Authorization") === expected) return null;

  return new Response("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="TimeTracker"' },
  });
}

const listener = BunnySDK.net.tcp.unstable_new();
console.log("Listening on: ", BunnySDK.net.tcp.toString(listener));

BunnySDK.net.http.serve(
  (req: Request): Response | Promise<Response> => {
    const denied = basicAuth(req);
    if (denied) return denied;

    console.log(`[INFO]: ${req.method} - ${req.url}`);
    return app.fetch(req);
  },
);
