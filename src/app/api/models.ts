/** HTTP shapes from openapi/openapi.yaml (gym-buddy-openapi auth contract). */

export interface RegisterRequest {
  email: string;
  handle: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type MemberRole = 'member' | 'moderator' | 'admin';

export interface RegisteredUser {
  id: string;
  email: string;
  handle: string;
  displayName: string;
  role: MemberRole;
}

export interface AccessTokenResponse {
  accessToken: string;
}

export interface ApiErrorDetail {
  path: string;
  issue: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export function readApiError(err: unknown): string {
  if (isHttpError(err) && isApiErrorBody(err.error)) {
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

function isApiErrorBody(value: unknown): value is ApiErrorBody {
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
