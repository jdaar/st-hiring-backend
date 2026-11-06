import { RequestHandler } from 'express';
import * as yup from 'yup';
import { ApplicationErrorDetail } from '@st-hiring/shared';
import { ValidationFailedError } from '../errors/application-errors';

export const REQUEST_SOURCES = ['params', 'query', 'body'] as const;

export type RequestSource = (typeof REQUEST_SOURCES)[number];

export type RequestSchemas = Partial<Record<RequestSource, yup.ISchema<unknown>>>;

const toDetails = (source: RequestSource, error: yup.ValidationError): ApplicationErrorDetail[] =>
  (error.inner.length ? error.inner : [error]).map(({ path, message }) => ({ path: path || source, message }));

// validates every request source that has a schema and replaces it with the cast value
export const validateRequest =
  (schemas: RequestSchemas): RequestHandler =>
  async (req, _res, next) => {
    const details: ApplicationErrorDetail[] = [];

    for (const source of REQUEST_SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      try {
        // stripUnknown: false so noUnknown() schemas reject extra keys instead of silently dropping them
        req[source] = await schema.validate(req[source], { abortEarly: false, stripUnknown: false });
      } catch (error) {
        if (!(error instanceof yup.ValidationError)) return next(error);
        details.push(...toDetails(source, error));
      }
    }

    next(details.length ? new ValidationFailedError(details) : undefined);
  };
