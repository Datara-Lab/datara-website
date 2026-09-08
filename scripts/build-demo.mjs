import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { parse } from "dotenv";

const demoEnvironment = parse(
    readFileSync(".env.demo.local"),
);

const requiredPublicVariables = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL",
    "NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL",
    "NEXT_PUBLIC_DATARA_ENVIRONMENT",
];

for (const variable of requiredPublicVariables) {
    if (!demoEnvironment[variable]) {
        throw new Error(
            `Falta ${variable} en .env.demo.local`,
        );
    }
}

const environment = {
    ...process.env,
};

for (const variable of requiredPublicVariables) {
    environment[variable] =
        demoEnvironment[variable];
}

const result = spawnSync(
    "npx",
    [
        "opennextjs-cloudflare",
        "build",
        "--config=wrangler.demo.jsonc",
    ],
    {
        stdio: "inherit",
        env: environment,
        shell: process.platform === "win32",
    },
);

process.exit(result.status ?? 1);