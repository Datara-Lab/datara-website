// @ts-ignore OpenNext genera este módulo durante el build.
import handler from "./.open-next/worker.js";

type DataraCloudflareEnv =
    CloudflareEnv & {
        CRON_SECRET: string;

        DATARA_PUBLIC_URL?: string;

        WORKER_SELF_REFERENCE: {
            fetch(
                request: Request,
            ): Promise<Response>;
        };
    };

async function callInternalEndpoint(
    env:
        DataraCloudflareEnv,
    pathname: string,
    taskName: string,
) {
    const publicUrl =
        (
            env
                .DATARA_PUBLIC_URL
                ?.trim() ||
            "https://datara-lab.com"
        ).replace(
            /\/+$/,
            "",
        );

    const response =
        await env
            .WORKER_SELF_REFERENCE
            .fetch(
                new Request(
                    `${publicUrl}${pathname}`,
                    {
                        method:
                            "POST",

                        headers: {
                            "X-Cron-Secret":
                                env.CRON_SECRET,
                        },
                    },
                ),
            );

    if (!response.ok) {
        const responseBody =
            await response.text();

        throw new Error(
            `No fue posible ejecutar ${taskName}: ${response.status} ${responseBody}`,
        );
    }
}

export default {
    fetch:
        handler.fetch,

    async scheduled(
        controller,
        env,
    ) {
        const dataraEnvironment =
            env as
                DataraCloudflareEnv;

        if (
            controller.cron ===
            "*/5 * * * *"
        ) {
            await callInternalEndpoint(
                dataraEnvironment,
                "/api/internal/automation-jobs",
                "las automatizaciones programadas",
            );

            return;
        }

        if (
            controller.cron ===
            "0 15 * * *"
        ) {
            await callInternalEndpoint(
                dataraEnvironment,
                "/api/internal/trial-reminders",
                "los recordatorios de pruebas",
            );
        }
    },
} satisfies ExportedHandler<
    DataraCloudflareEnv
>;
