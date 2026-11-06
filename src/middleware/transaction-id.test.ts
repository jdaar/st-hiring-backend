import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { TRANSACTION_ID_HEADER, ValidationFailedError } from '@st-hiring/shared';
import { requireTransactionId } from './transaction-id';

const createRequest = (id?: string) => ({ get: vi.fn().mockReturnValue(id) }) as unknown as Request;
const createResponse = () => ({ setHeader: vi.fn() }) as unknown as Response;

describe('requireTransactionId', () => {
  it('rejects a request without the header', () => {
    // Arrange
    const req = createRequest();
    const res = createResponse();
    const next = vi.fn();

    // Act
    requireTransactionId(req, res, next);

    // Assert
    expect(req.get).toHaveBeenCalledWith(TRANSACTION_ID_HEADER);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationFailedError));
    expect(next.mock.calls[0][0].details).toEqual([
      { path: TRANSACTION_ID_HEADER, message: `${TRANSACTION_ID_HEADER} header is required` },
    ]);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it.each(['has spaces', 'semi;colon', 'a'.repeat(129)])('rejects the malformed id %s', (id) => {
    // Arrange
    const req = createRequest(id);
    const res = createResponse();
    const next = vi.fn();

    // Act
    requireTransactionId(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.any(ValidationFailedError));
    expect(next.mock.calls[0][0].details).toEqual([
      { path: TRANSACTION_ID_HEADER, message: `${TRANSACTION_ID_HEADER} must be 1-128 letters, digits, "_" or "-"` },
    ]);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('echoes a valid id back and continues', () => {
    // Arrange
    const id = 'abc_123-XYZ';
    const req = createRequest(id);
    const res = createResponse();
    const next = vi.fn();

    // Act
    requireTransactionId(req, res, next);

    // Assert
    expect(res.setHeader).toHaveBeenCalledWith(TRANSACTION_ID_HEADER, id);
    expect(next).toHaveBeenCalledWith();
  });
});
