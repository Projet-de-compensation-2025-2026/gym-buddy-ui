/**
 * Contract types come from the orval client generated in `./generated`.
 * Source: gym-buddy-openapi develop SHA dc3488158a302de9475153f124f7f98a6e4dba9b
 * (`openapi/openapi.yaml` $ref tree).
 */
export type {
  AccessTokenResponse,
  ChangePasswordRequest,
  CloseAccountRequest,
  ErrorDetail,
  ErrorResponse,
  GetProfilesHandle200,
  GetProfilesMe200,
  HealthStatus,
  LoginRequest,
  PatchProfilesMeBody,
  Profile,
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
