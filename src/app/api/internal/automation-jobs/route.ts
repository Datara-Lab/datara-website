import {
    getCloudflareContext,
} from "@opennextjs/cloudflare";

import {
    NextResponse,
} from "next/server";

import {
    processScheduledAutomationJobs,
} from "@/lib/crm/automation-job-processor";

export const dynamic =
    "force-dynamic";

type AutomationEnvironment = {
    CRON_SECRET?: string;
};

function getEnvironment():
    AutomationEnvironment {
    try {
        const {
            env,
        } =
            getCloudflareContext();

        return env as
            AutomationEnvironment;
    } catch {
        return {};
    }
}

export async function POST(
    request: Request,
) {
    const environment =
        getEnvironment();

    const cronSecret =
        environment.CRON_SECRET ??
        process.env.CRON_SECRET;

    if (!cronSecret) {
        return NextResponse.json(
            {
                success: false,

                error:
                    "CRON_SECRET no está configurado.",
            },
            {
                status: 500,
            },
        );
    }

    const providedSecret =
        request.headers.get(
            "X-Cron-Secret",
        );

    if (
        providedSecret !==
        cronSecret
    ) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "No autorizado.",
            },
            {
                status: 401,
            },
        );
    }

    try {
        const result =
            await processScheduledAutomationJobs();

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (
    processingError
    ) {
        console.error(
            "No fue posible procesar las automatizaciones programadas:",
            processingError,
        );

        return NextResponse.json(
            {
                success: false,

                error:
                    "No fue posible procesar las automatizaciones programadas.",
            },
            {
                status: 500,
            },
        );
    }
}