/**
 * Contract types come from the orval client generated in `./generated`.
 * Source: gym-buddy-openapi consumer bundle at SHA 7fa510874e8ebb7d424f01629f3085705d569139.
 */
export type {
  AccessTokenResponse,
  ErrorDetail,
  ErrorResponse,
  HealthStatus,
  LoginRequest,
  RegisterRequest,
  RegisteredUser,
} from './generated/model';
export type { ErrorResponseErrorCode as ErrorCode } from './generated/model';
export type { RegisteredUserRole as MemberRole } from './generated/model';

import type { ErrorResponse } from './generated/model';

export function readApiError(err: unknown): string {
  if (isHttpError(err) && isErrorResponse(err.error)) {
    return err.error.error.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Request failed';
}

function isHttpError(err: unknown): err is { error: unknown } {
  return typeof err === 'object' && err !== null && 'error' in err;
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}
