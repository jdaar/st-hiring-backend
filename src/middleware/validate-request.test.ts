import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import * as yup from 'yup';
import { ValidationFailedError, validateRequestSources } from '@st-hiring/shared';
import { validateRequest } from './validate-request';

vi.mock('@st-hiring/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@st-hiring/shared')>()),
  validateRequestSources: vi.fn(),
}));

const schemas = { query: yup.object({ page: yup.number() }) };

describe('validateRequest', () => {
  it('forwards a ValidationFailedError when a source is invalid', async () => {
    // Arrange
    const details = [{ path: 'page', message: 'page must be a number' }];
    vi.mocked(validateRequestSources).mockResolvedValue({ values: {}, details });
    const req = { query: { page: 'x' } } as unknown as Request;
    const next = vi.fn();

    // Act
    await validateRequest(schemas)(req, {} as Response, next);

    // Assert
    expect(validateRequestSources).toHaveBeenCalledWith(schemas, req);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationFailedError));
    expect(next.mock.calls[0][0].details).toEqual(details);
    expect(req.query).toEqual({ page: 'x' });
  });

  it('replaces the request sources with the cast values and continues', async () => {
    // Arrange
    vi.mocked(validateRequestSources).mockResolvedValue({ values: { query: { page: 2 } }, details: [] });
    const req = { query: { page: '2' } } as unknown as Request;
    const next = vi.fn();

    // Act
    await validateRequest(schemas)(req, {} as Response, next);

    // Assert
    expect(req.query).toEqual({ page: 2 });
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards an unexpected validation failure', async () => {
    // Arrange
    const error = new Error('schema exploded');
    vi.mocked(validateRequestSources).mockRejectedValue(error);
    const next = vi.fn();

    // Act
    await validateRequest(schemas)({} as Request, {} as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith(error);
  });
});
