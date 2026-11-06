// must be imported before anything else so the instrumentations can patch express, pg and mongodb when they are required
import 'dotenv/config';
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation, ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';

// without a logger, failed exports (e.g. jaeger unreachable) are dropped silently
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'st-hiring-backend',
  // sends to OTEL_EXPORTER_OTLP_ENDPOINT, http://localhost:4318 (jaeger in docker-compose) by default
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    new HttpInstrumentation({
      ignoreIncomingRequestHook: (req) => req.url === '/health',
      // recorded on the HTTP server span as http.request.header.x-transaction-id
      headersToSpanAttributes: { server: { requestHeaders: ['x-transaction-id'] } },
    }),
    new ExpressInstrumentation({
      // router spans are named after the router's first route by default (router - /events), use the mount path instead
      spanNameHook: ({ layerType, route }, defaultName) =>
        layerType === ExpressLayerType.ROUTER ? `router - ${route}` : defaultName,
    }),
    // knex runs its queries through pg; requireParentSpan drops queries made outside a request (pool setup, migrations)
    new PgInstrumentation({ requireParentSpan: true }),
    new MongoDBInstrumentation({ requireParentSpan: true }),
  ],
});

sdk.start();

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    sdk.shutdown().finally(() => process.exit(0));
  });
}
