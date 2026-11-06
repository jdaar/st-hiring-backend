import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IncomingMessage } from 'node:http';

const mocks = vi.hoisted(() => {
  const instance = (name: string) =>
    vi.fn(function (this: Record<string, unknown>, options?: unknown) {
      this.kind = name;
      this.options = options;
    });
  return {
    sdk: { start: vi.fn(), shutdown: vi.fn() },
    NodeSDK: vi.fn(),
    setLogger: vi.fn(),
    DiagConsoleLogger: instance('DiagConsoleLogger'),
    OTLPTraceExporter: instance('OTLPTraceExporter'),
    HttpInstrumentation: instance('HttpInstrumentation'),
    ExpressInstrumentation: instance('ExpressInstrumentation'),
    PgInstrumentation: instance('PgInstrumentation'),
    MongoDBInstrumentation: instance('MongoDBInstrumentation'),
  };
});

vi.mock('dotenv/config', () => ({}));
vi.mock('@opentelemetry/api', () => ({
  diag: { setLogger: mocks.setLogger },
  DiagConsoleLogger: mocks.DiagConsoleLogger,
  DiagLogLevel: { WARN: 'WARN' },
}));
vi.mock('@opentelemetry/sdk-node', () => ({ NodeSDK: mocks.NodeSDK }));
vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({ OTLPTraceExporter: mocks.OTLPTraceExporter }));
vi.mock('@opentelemetry/instrumentation-http', () => ({ HttpInstrumentation: mocks.HttpInstrumentation }));
vi.mock('@opentelemetry/instrumentation-express', () => ({
  ExpressInstrumentation: mocks.ExpressInstrumentation,
  ExpressLayerType: { ROUTER: 'router' },
}));
vi.mock('@opentelemetry/instrumentation-pg', () => ({ PgInstrumentation: mocks.PgInstrumentation }));
vi.mock('@opentelemetry/instrumentation-mongodb', () => ({ MongoDBInstrumentation: mocks.MongoDBInstrumentation }));

type SdkOptions = { serviceName: string; instrumentations: { kind: string; options: Record<string, unknown> }[] };

const loadTracing = async () => {
  const signalHandlers = new Map<string, () => void>();
  vi.spyOn(process, 'once').mockImplementation((signal, handler) => {
    signalHandlers.set(signal as string, handler as () => void);
    return process;
  });
  await import('./tracing');
  return { signalHandlers, options: mocks.NodeSDK.mock.calls[0][0] as SdkOptions };
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('tracing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('OTEL_SERVICE_NAME', undefined);
    mocks.NodeSDK.mockImplementation(() => mocks.sdk);
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('logs failed exports as warnings', async () => {
    // Arrange
    const expectedLogger = expect.objectContaining({ kind: 'DiagConsoleLogger' });

    // Act
    await loadTracing();

    // Assert
    expect(mocks.setLogger).toHaveBeenCalledWith(expectedLogger, 'WARN');
  });

  it('starts the sdk with the default service name and the otlp exporter', async () => {
    // Arrange
    const expectedExporter = expect.objectContaining({ kind: 'OTLPTraceExporter' });

    // Act
    const { options } = await loadTracing();

    // Assert
    expect(options).toMatchObject({ serviceName: 'st-hiring-backend', traceExporter: expectedExporter });
    expect(mocks.sdk.start).toHaveBeenCalledOnce();
  });

  it('takes the service name from the environment', async () => {
    // Arrange
    vi.stubEnv('OTEL_SERVICE_NAME', 'custom-service');

    // Act
    const { options } = await loadTracing();

    // Assert
    expect(options.serviceName).toBe('custom-service');
  });

  it('instruments http, express, pg and mongodb', async () => {
    // Arrange
    const expectedKinds = [
      'HttpInstrumentation',
      'ExpressInstrumentation',
      'PgInstrumentation',
      'MongoDBInstrumentation',
    ];

    // Act
    const { options } = await loadTracing();

    // Assert
    expect(options.instrumentations.map(({ kind }) => kind)).toEqual(expectedKinds);
    expect(options.instrumentations[0].options).toMatchObject({
      headersToSpanAttributes: { server: { requestHeaders: ['x-transaction-id'] } },
    });
    expect(options.instrumentations[1].options).toEqual({ ignoreLayersType: ['router'] });
    expect(options.instrumentations[2].options).toEqual({ requireParentSpan: true });
    expect(options.instrumentations[3].options).toEqual({ requireParentSpan: true });
  });

  it.each([
    ['/health', true],
    ['/v1/events', false],
  ])('ignores incoming requests to %s: %s', async (url, ignored) => {
    // Arrange
    const { options } = await loadTracing();
    const hook = options.instrumentations[0].options.ignoreIncomingRequestHook as (req: IncomingMessage) => boolean;

    // Act
    const result = hook({ url } as IncomingMessage);

    // Assert
    expect(result).toBe(ignored);
  });

  it.each(['SIGINT', 'SIGTERM'])('exits cleanly after flushing spans on %s', async (signal) => {
    // Arrange
    mocks.sdk.shutdown.mockResolvedValue(undefined);
    const { signalHandlers } = await loadTracing();

    // Act
    signalHandlers.get(signal)?.();
    await flushPromises();

    // Assert
    expect(mocks.sdk.shutdown).toHaveBeenCalledOnce();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits with an error when flushing spans fails', async () => {
    // Arrange
    const error = new Error('jaeger unreachable');
    mocks.sdk.shutdown.mockRejectedValue(error);
    const { signalHandlers } = await loadTracing();

    // Act
    signalHandlers.get('SIGTERM')?.();
    await flushPromises();

    // Assert
    expect(console.error).toHaveBeenCalledWith(error);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
