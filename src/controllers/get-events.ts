import { NextFunction, Request, Response } from 'express';
import * as yup from 'yup';
import { ApplicationErrorDetail, EventsRepository, GetPaginatedEventsResponse, createSuccessResponse } from '@st-hiring/shared';
import { ValidationFailedError } from '../errors/application-errors';

const MAX_PAGE_SIZE = 100;

const QueryParamSchemas = {
  page: yup.number().integer().min(1).required(),
  pageSize: yup.number().integer().min(1).max(MAX_PAGE_SIZE).required(),
};

type ParseResult = { value: number; error?: undefined } | { value?: undefined; error: ApplicationErrorDetail };

const parseInteger = (path: keyof typeof QueryParamSchemas, raw: unknown): ParseResult => {
  try {
    return { value: QueryParamSchemas[path].label(path).validateSync(raw) };
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) throw error;
    return { error: { path, message: error.message } };
  }
};

export const createGetEventsController =
  ({ eventsRepository }: { eventsRepository: EventsRepository }) =>
  async (req: Request, res: Response<GetPaginatedEventsResponse>, next: NextFunction) => {
    try {
      const { value: page, error: pageError } = parseInteger('page', req.query.page);
      const { value: pageSize, error: pageSizeError } = parseInteger('pageSize', req.query.pageSize);
      if (pageError || pageSizeError) {
        throw new ValidationFailedError([pageError, pageSizeError].filter((error) => error !== undefined));
      }

      const { events, total } = await eventsRepository.getPaginatedEvents(page, pageSize);

      res.json(
        createSuccessResponse({
          events,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        }),
      );
    } catch (error) {
      next(error);
    }
  };
