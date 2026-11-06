import { NextFunction, Request, Response } from 'express';
import { ApplicationError, InternalError, createFailureResponse } from '@st-hiring/shared';

// express types the error as any, it can be anything that was thrown
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const applicationError = error instanceof ApplicationError ? error : new InternalError({ cause: error });
  if (!(error instanceof ApplicationError)) console.error(error);

  res.status(applicationError.httpCode ?? 500).json(createFailureResponse(applicationError));
};
