import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationError, InternalError, SettingNotFoundError } from '@st-hiring/shared';
import { errorHandler } from './error-handler';

const createResponse = () => {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

class UntypedError extends ApplicationError<42> {
  readonly code = 42;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('answers an application error with its http code and failure envelope', () => {
    // Arrange
    const error = new SettingNotFoundError('theme');
    const res = createResponse();

    // Act
    errorHandler(error, {} as Request, res as unknown as Response, vi.fn());

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      isSuccess: false,
      error: { code: SettingNotFoundError.code, message: 'Setting "theme" does not exist' },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('answers an application error without http code with 500', () => {
    // Arrange
    const error = new UntypedError('untyped');
    const res = createResponse();

    // Act
    errorHandler(error, {} as Request, res as unknown as Response, vi.fn());

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ isSuccess: false, error: { code: 42, message: 'untyped' } });
  });

  it('wraps and logs anything else as an internal error', () => {
    // Arrange
    const error = new Error('boom');
    const res = createResponse();

    // Act
    errorHandler(error, {} as Request, res as unknown as Response, vi.fn());

    // Assert
    expect(console.error).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      isSuccess: false,
      error: { code: InternalError.code, message: 'Internal server error' },
    });
  });
});
