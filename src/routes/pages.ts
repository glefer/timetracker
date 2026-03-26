import { App } from "../infrastructure/mod.ts";
import { configPage } from "../views/config.ts";
import { distancesPage } from "../views/distances.ts";
import { timesheetPage } from "../views/timesheet.ts";
import { settingsPage } from "../views/settings.ts";

export function addPageRoutes(app: App): void {
  app.get("/", (c) => c.redirect("/timesheet"));

  app.get("/config", (c) => {
    return c.html(configPage());
  });

  app.get("/distances", (c) => {
    return c.html(distancesPage());
  });

  app.get("/timesheet", (c) => {
    return c.html(timesheetPage());
  });

  app.get("/settings", (c) => {
    return c.html(settingsPage());
  });
}
