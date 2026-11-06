import { ErrorRequestHandler } from 'express';
import { createFailureResponse } from '@st-hiring/shared';
import { InternalError, isApplicationError } from '../errors/application-errors';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const applicationError = isApplicationError(error) ? error : new InternalError({ cause: error });
  if (!isApplicationError(error)) console.error(error);

  res.status(applicationError.httpCode ?? 500).json(createFailureResponse(applicationError));
};
