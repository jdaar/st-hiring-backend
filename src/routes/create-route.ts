import { Request, RequestHandler, Response, Router } from 'express';
import * as yup from 'yup';
import { RequestSchemas, validateRequest } from '../middleware/validate-request';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type Infer<S> = S extends yup.ISchema<infer T> ? T : never;

export type TypedRequest<R extends RequestSchemas> = Request<
  R['params'] extends yup.ISchema<unknown> ? Infer<R['params']> : Record<string, never>,
  unknown,
  R['body'] extends yup.ISchema<unknown> ? Infer<R['body']> : unknown,
  R['query'] extends yup.ISchema<unknown> ? Infer<R['query']> : Record<string, never>
>;

export type TypedResponse<S extends yup.ISchema<unknown>> = Response<Infer<S>>;

export interface RouteDefinition<R extends RequestSchemas, S extends yup.ISchema<unknown>> {
  method: HttpMethod;
  path: string;
  // shared request DTO schema per request source, validated by the validateRequest middleware
  request?: R;
  // shared response DTO schema, types res.json
  response: S;
  handler: (req: TypedRequest<R>, res: TypedResponse<S>) => Promise<void> | void;
}

export interface Route {
  method: HttpMethod;
  path: string;
  handlers: RequestHandler[];
}

export const createRoute = <S extends yup.ISchema<unknown>, R extends RequestSchemas = Record<never, never>>({
  method,
  path,
  request,
  handler,
}: RouteDefinition<R, S>): Route => ({
  method,
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
