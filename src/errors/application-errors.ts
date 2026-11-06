import { ApplicationError, ApplicationErrorDetail } from '@st-hiring/shared';

export class ValidationFailedError extends Error implements ApplicationError<1000> {
  readonly code = 1000;
  readonly httpCode = 400;

  constructor(readonly details: ApplicationErrorDetail[]) {
    super('Validation failed');
  }
}

export class SettingNotFoundError extends Error implements ApplicationError<1001> {
  readonly code = 1001;
  readonly httpCode = 404;

  constructor(id: string) {
    super(`Setting "${id}" does not exist`);
  }
}

export class SettingVersionConflictError extends Error implements ApplicationError<1002> {
  readonly code = 1002;
  readonly httpCode = 409;

  constructor(id: string, version: number) {
    super(`Setting "${id}" was modified; version ${version} is stale`);
  }
}

export class SettingAlreadyExistsError extends Error implements ApplicationError<1003> {
  readonly code = 1003;
  readonly httpCode = 409;

  constructor(id: string) {
    super(`Setting "${id}" already exists; send its version to update it`);
  }
}

export class RouteNotFoundError extends Error implements ApplicationError<1004> {
  readonly code = 1004;
  readonly httpCode = 404;

  constructor(method: string, path: string) {
    super(`Route ${method} ${path} does not exist`);
  }
}

export class InternalError extends Error implements ApplicationError<1999> {
  readonly code = 1999;
  readonly httpCode = 500;

  constructor(options?: ErrorOptions) {
    super('Internal server error', options);
  }
}

export const isApplicationError = (error: unknown): error is ApplicationError =>
  error instanceof Error && 'code' in error && typeof error.code === 'number';
