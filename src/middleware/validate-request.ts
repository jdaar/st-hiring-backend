import { RequestHandler } from 'express';
import { RequestSchemas, ValidationFailedError, validateRequestSources } from '@st-hiring/shared';

// validates every request source that has a schema and replaces it with the cast value
export const validateRequest =
  (schemas: RequestSchemas): RequestHandler =>
  async (req, _res, next) => {
    try {
      const { values, details } = await validateRequestSources(schemas, req);
      if (details.length) return next(new ValidationFailedError(details));

      Object.assign(req, values);
      next();
    } catch (error) {
      next(error);
    }
  };
