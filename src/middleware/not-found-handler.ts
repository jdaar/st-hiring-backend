import { RequestHandler } from 'express';
import { RouteNotFoundError } from '../errors/application-errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new RouteNotFoundError(req.method, req.path));
};
