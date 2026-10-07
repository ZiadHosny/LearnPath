import { AppError, Errors } from '../../src/common/http/app-error.js';
import { ERROR_CATALOG, type ErrorCode } from '../../src/common/http/error-catalog.js';
import {
  configureResponseFormat,
  RESPONSE_FORMAT,
  toErrorBody,
  toSuccessBody,
} from '../../src/common/http/response-format.js';

describe('TS-04 US1 error catalog', () => {
  it.each(Object.keys(ERROR_CATALOG) as ErrorCode[])('%s takes its status and message from the catalog', (code) => {
    const error = new AppError(code);
    expect(error.code).toBe(code);
    expect(error.status).toBe(ERROR_CATALOG[code].status);
    expect(error.message).toBe(ERROR_CATALOG[code].message);
  });

  it('lets a call site override only the message (and details)', () => {
    const error = new AppError('VALIDATION_ERROR', {
      message: 'Choose a photo to upload',
      details: [{ field: 'photo', message: 'Choose a photo to upload' }],
    });
    expect(error.status).toBe(400);
    expect(error.message).toBe('Choose a photo to upload');
    expect(error.details).toHaveLength(1);
  });

  it('keeps the Errors.* shortcuts tied to the catalog', () => {
    expect(Errors.emailTaken()).toMatchObject({ status: 409, code: 'EMAIL_TAKEN', message: ERROR_CATALOG.EMAIL_TAKEN.message });
    expect(Errors.notFound()).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('TS-04 US1 response format', () => {
  afterEach(() => configureResponseFormat({ envelope: false }));

  it('builds the error body in the 001 shape', () => {
    expect(toErrorBody(new AppError('EMAIL_TAKEN'))).toEqual({
      error: { code: 'EMAIL_TAKEN', message: 'Email already registered' },
    });
    const withDetails = new AppError('VALIDATION_ERROR', { details: [{ field: 'email', message: 'Enter a valid email' }] });
    expect(toErrorBody(withDetails)).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid', details: [{ field: 'email', message: 'Enter a valid email' }] },
    });
  });

  it('returns success data unchanged by default', () => {
    expect(RESPONSE_FORMAT.envelope).toBe(false);
    expect(toSuccessBody({ id: 1 })).toEqual({ id: 1 });
  });

  it('wraps success data in { data } when the envelope is on, but leaves empty bodies empty', () => {
    configureResponseFormat({ envelope: true });
    expect(toSuccessBody({ id: 1 })).toEqual({ data: { id: 1 } });
    expect(toSuccessBody(undefined)).toBeUndefined();
  });
});
