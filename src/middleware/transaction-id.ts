import { RequestHandler } from 'express';
import { TRANSACTION_ID_HEADER } from '@st-hiring/shared';
import { ValidationFailedError } from '../errors/application-errors';

// safe to echo back and to store as a span attribute
const VALID_TRANSACTION_ID = /^[\w-]{1,128}$/;

// every request must carry the caller's X-Transaction-Id, it is echoed back on the response
export const requireTransactionId: RequestHandler = (req, res, next) => {
  const id = req.get(TRANSACTION_ID_HEADER);

  if (!id || !VALID_TRANSACTION_ID.test(id)) {
    return next(
      new ValidationFailedError([
        {
          path: TRANSACTION_ID_HEADER,
          message: id
            ? `${TRANSACTION_ID_HEADER} must be 1-128 letters, digits, "_" or "-"`
            : `${TRANSACTION_ID_HEADER} header is required`,
        },
      ]),
    );
  }

  res.setHeader(TRANSACTION_ID_HEADER, id);
  next();
};
