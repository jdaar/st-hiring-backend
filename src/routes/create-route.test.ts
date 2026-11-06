import { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import { describe, expect, it, vi } from 'vitest';
import * as yup from 'yup';
import { defineContract } from '@st-hiring/shared';
import { validateRequest } from '../middleware/validate-request';
import { Route, createRoute, createRouter } from './create-route';

vi.mock('express', () => ({ Router: vi.fn() }));
vi.mock('../middleware/validate-request', () => ({ validateRequest: vi.fn() }));

const response = yup.object({ ok: yup.boolean().required() });

const requestStub = {} as Request;
const responseStub = {} as Response;

const runHandler = (handler: RequestHandler, next: NextFunction) =>
  handler(requestStub, responseStub, next) as unknown as Promise<void>;

describe('createRoute', () => {
  it('lowercases the method and keeps the path', () => {
    // Arrange
    const contract = defineContract({ method: 'PUT', path: '/v1/things/:id', response });

    // Act
    const route = createRoute(contract, vi.fn());

    // Assert
    expect(route.method).toBe('put');
    expect(route.path).toBe('/v1/things/:id');
  });

  it('validates the request first when the contract has request schemas', () => {
    // Arrange
    const validator = vi.fn();
    vi.mocked(validateRequest).mockReturnValue(validator);
    const request = { query: yup.object({ page: yup.number() }) };
    const contract = defineContract({ method: 'GET', path: '/v1/things', request, response });

    // Act
    const route = createRoute(contract, vi.fn());

    // Assert
    expect(validateRequest).toHaveBeenCalledWith(request);
    expect(route.handlers).toHaveLength(2);
    expect(route.handlers[0]).toBe(validator);
  });

  it('only runs the handler when the contract has no request schemas', () => {
    // Arrange
    const contract = defineContract({ method: 'GET', path: '/v1/things', response });

    // Act
    const route = createRoute(contract, vi.fn());

    // Assert
    expect(validateRequest).not.toHaveBeenCalled();
    expect(route.handlers).toHaveLength(1);
  });

  it('passes the request and response to the handler', async () => {
    // Arrange
    const handler = vi.fn().mockResolvedValue(undefined);
    const [routeHandler] = createRoute(defineContract({ method: 'GET', path: '/', response }), handler).handlers;
    const next = vi.fn();

    // Act
    await runHandler(routeHandler, next);

    // Assert
    expect(handler).toHaveBeenCalledWith(requestStub, responseStub);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards an error thrown by the handler', async () => {
    // Arrange
    const error = new Error('handler failed');
    const handler = vi.fn().mockRejectedValue(error);
    const [routeHandler] = createRoute(defineContract({ method: 'GET', path: '/', response }), handler).handlers;
    const next = vi.fn();

    // Act
    await runHandler(routeHandler, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('createRouter', () => {
  it('registers every route on a new router', () => {
    // Arrange
    const router = { get: vi.fn(), put: vi.fn() };
    router.get.mockReturnValue(router);
    router.put.mockReturnValue(router);
    vi.mocked(Router).mockReturnValue(router as unknown as Router);
    const first = vi.fn();
    const second = vi.fn();
    const routes: Route[] = [
      { method: 'get', path: '/a', handlers: [first] },
      { method: 'put', path: '/b', handlers: [first, second] },
    ];

    // Act
    const result = createRouter(routes);

    // Assert
    expect(result).toBe(router);
    expect(router.get).toHaveBeenCalledWith('/a', first);
    expect(router.put).toHaveBeenCalledWith('/b', first, second);
  });
});
