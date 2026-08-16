// @ts-ignore OpenNext genera este módulo durante el build.
import handler from "./.open-next/worker.js";

type DataraCloudflareEnv =
    CloudflareEnv & {
        CRON_SECRET: string;

        WORKER_SELF_REFERENCE: {
            fetch(
                request: Request,
            ): Promise<Response>;
        };
    };

export default {
    fetch:
        handler.fetch,

    async scheduled(
        _controller,
        env,
    ) {
        const dataraEnvironment =
            env as DataraCloudflareEnv;

        const response =
            await dataraEnvironment
                .WORKER_SELF_REFERENCE
                .fetch(
                    new Request(
                        "https://datara-lab.com/api/internal/trial-reminders",
                        {
                            method: "POST",

                            headers: {
                                "X-Cron-Secret":
                                    dataraEnvironment
                                        .CRON_SECRET,
                            },
                        },
                    ),
                );

        if (!response.ok) {
            const responseBody =
                await response.text();

            throw new Error(
                `No fue posible ejecutar los recordatorios: ${response.status} ${responseBody}`,
            );
        }
    },
} satisfies ExportedHandler<
    DataraCloudflareEnv
>;