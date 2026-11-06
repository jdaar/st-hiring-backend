import { Request, RequestHandler, Response, Router } from 'express';
import * as yup from 'yup';
import { EndpointContract, HttpMethod, InferSchema, RequestSchemas } from '@st-hiring/shared';
import { validateRequest } from '../middleware/validate-request';

export type TypedRequest<R extends RequestSchemas> = Request<
  R['params'] extends yup.ISchema<unknown> ? InferSchema<R['params']> : Record<string, never>,
  unknown,
  R['body'] extends yup.ISchema<unknown> ? InferSchema<R['body']> : unknown,
  R['query'] extends yup.ISchema<unknown> ? InferSchema<R['query']> : Record<string, never>
>;

export type TypedResponse<S extends yup.ISchema<unknown>> = Response<InferSchema<S>>;

export type RouteHandler<R extends RequestSchemas, S extends yup.ISchema<unknown>> = (
  req: TypedRequest<R>,
  res: TypedResponse<S>,
) => Promise<void> | void;

export interface Route {
  method: Lowercase<HttpMethod>;
  path: string;
  handlers: RequestHandler[];
}

// serves a shared endpoint contract: its request DTOs are validated by the validateRequest middleware
// and type req, its response DTO types res.json
export const createRoute = <S extends yup.ISchema<unknown>, R extends RequestSchemas>(
  { method, path, request }: EndpointContract<R, S>,
  handler: RouteHandler<R, S>,
): Route => ({
  method: method.toLowerCase() as Lowercase<HttpMethod>,
  path,
  handlers: [
    ...(request ? [validateRequest(request)] : []),
    async (req, res, next) => {
      try {
        await handler(req as unknown as TypedRequest<R>, res);
      } catch (error) {
        next(error);
      }
    },
  ],
});

export const createRouter = (routes: Route[]) =>
  routes.reduce((router, { method, path, handlers }) => router[method](path, ...handlers), Router());
