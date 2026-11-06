import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { RouteNotFoundError } from '@st-hiring/shared';
import { notFoundHandler } from './not-found-handler';

describe('notFoundHandler', () => {
  it('forwards a RouteNotFoundError for the request method and path', () => {
    // Arrange
    const req = { method: 'DELETE', path: '/v1/missing' } as Request;
    const next = vi.fn();

    // Act
    notFoundHandler(req, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.any(RouteNotFoundError));
    expect(next.mock.calls[0][0].message).toBe('Route DELETE /v1/missing does not exist');
  });
});
