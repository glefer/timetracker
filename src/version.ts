import packageJson from "../package.json" with { type: "json" };

/** Version de l'application depuis package.json */
export const APP_VERSION = packageJson.version;
