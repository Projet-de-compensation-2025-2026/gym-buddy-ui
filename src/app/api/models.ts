/**
 * HTTP shapes from the canonical contract:
 * https://github.com/Projet-de-compensation-2025-2026/gym-buddy-openapi
 * (`openapi/openapi.yaml` on develop, 0.1.0).
 */

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

export type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'CONFLICT' | 'VALIDATION';

export interface ErrorDetail {
  path: string;
  issue: string;
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

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
