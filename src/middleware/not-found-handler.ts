import { RequestHandler } from 'express';
import { RouteNotFoundError } from '@st-hiring/shared';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new RouteNotFoundError(req.method, req.path));
};
