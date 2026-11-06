import { ErrorRequestHandler } from 'express';
import { ApplicationError, InternalError, createFailureResponse } from '@st-hiring/shared';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const applicationError = error instanceof ApplicationError ? error : new InternalError({ cause: error });
  if (!(error instanceof ApplicationError)) console.error(error);

  res.status(applicationError.httpCode ?? 500).json(createFailureResponse(applicationError));
};
