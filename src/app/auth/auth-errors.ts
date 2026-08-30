import type { ErrorResponse } from '../api/generated/model';

/** Visitor-facing copy for auth VALIDATION / CONFLICT / FORBIDDEN. Never print API `error.message`. */
export const AUTH_COPY = {
  emailRequired: 'Enter your email.',
  emailInvalid: 'Enter a valid email address.',
  passwordRequired: 'Enter your password.',
  passwordMin: 'Password must be at least 10 characters.',
  passwordEqualsEmail: 'Password cannot be your email.',
  passwordEqualsHandle: 'Password cannot be your handle.',
  passwordEqualsIdentity: 'Password cannot be your email or handle.',
  displayNameRequired: 'Enter a display name.',
  handleRequired: 'Enter a handle.',
  emailTaken: 'That email is already registered.',
  handleTaken: 'That handle is already taken.',
  conflict: 'That email or handle is already registered.',
  invalidCredentials: 'Invalid email or password.',
  validation: 'Check the highlighted fields.',
  requestFailed: 'Could not complete the request. Try again.',
} as const;

export type AuthField = 'email' | 'password' | 'handle' | 'displayName';

export type MappedAuthError = {
  formError: string | null;
  fieldErrors: Partial<Record<AuthField, string>>;
};

const AUTH_FIELDS = new Set<AuthField>(['email', 'password', 'handle', 'displayName']);

export function lastPathSegment(path: string): string {
  const parts = path.replace(/^\//, '').split(/[./]/);
  return parts[parts.length - 1] ?? path;
}

export function passwordIdentityError(password: string, email: string, handle: string): string {
  const lower = password.toLowerCase();
  if (email && lower === email.toLowerCase()) {
    return AUTH_COPY.passwordEqualsEmail;
  }
  if (handle && lower === handle.toLowerCase()) {
    return AUTH_COPY.passwordEqualsHandle;
  }
  return AUTH_COPY.passwordEqualsIdentity;
}

export function clientLoginErrors(form: {
  controls: Record<string, { hasError: (name: string) => boolean }>;
}): Partial<Record<AuthField, string>> {
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  const email = form.controls['email'];
  const password = form.controls['password'];
  if (email?.hasError('required')) {
    fieldErrors.email = AUTH_COPY.emailRequired;
  } else if (email?.hasError('email')) {
    fieldErrors.email = AUTH_COPY.emailInvalid;
  }
  if (password?.hasError('required')) {
    fieldErrors.password = AUTH_COPY.passwordRequired;
  }
  return fieldErrors;
}

export function clientRegisterErrors(form: {
  hasError: (name: string) => boolean;
  controls: Record<string, { hasError: (name: string) => boolean; value?: unknown }>;
}): Partial<Record<AuthField, string>> {
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  const email = form.controls['email'];
  const handle = form.controls['handle'];
  const password = form.controls['password'];
  const displayName = form.controls['displayName'];
  if (displayName?.hasError('required')) {
    fieldErrors.displayName = AUTH_COPY.displayNameRequired;
  }
  if (handle?.hasError('required')) {
    fieldErrors.handle = AUTH_COPY.handleRequired;
  }
  if (email?.hasError('required')) {
    fieldErrors.email = AUTH_COPY.emailRequired;
  } else if (email?.hasError('email')) {
    fieldErrors.email = AUTH_COPY.emailInvalid;
  }
  if (password?.hasError('required')) {
    fieldErrors.password = AUTH_COPY.passwordRequired;
  } else if (password?.hasError('minlength')) {
    fieldErrors.password = AUTH_COPY.passwordMin;
  } else if (form.hasError('fsAcct03')) {
    fieldErrors.password = passwordIdentityError(
      String(password?.value ?? ''),
      String(email?.value ?? ''),
      String(handle?.value ?? ''),
    );
  }
  return fieldErrors;
}

export function mapAuthApiError(err: unknown): MappedAuthError {
  const body = readErrorResponse(err);
  if (!body) {
    return { formError: AUTH_COPY.requestFailed, fieldErrors: {} };
  }
  const code = body.error.code;
  const details = body.error.details ?? [];
  const message = body.error.message.toLowerCase();

  if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') {
    return { formError: AUTH_COPY.invalidCredentials, fieldErrors: {} };
  }

  if (code === 'CONFLICT') {
    const fieldErrors: Partial<Record<AuthField, string>> = {};
    for (const detail of details) {
      assignConflict(fieldErrors, lastPathSegment(detail.path));
    }
    if (!fieldErrors.email && !fieldErrors.handle) {
      const mentionsEmail = message.includes('email');
      const mentionsHandle = message.includes('handle');
      if (mentionsEmail && !mentionsHandle) {
        fieldErrors.email = AUTH_COPY.emailTaken;
      } else if (mentionsHandle && !mentionsEmail) {
        fieldErrors.handle = AUTH_COPY.handleTaken;
      } else {
        return { formError: AUTH_COPY.conflict, fieldErrors: {} };
      }
    }
    return { formError: null, fieldErrors };
  }

  if (code === 'VALIDATION') {
    const fieldErrors: Partial<Record<AuthField, string>> = {};
    for (const detail of details) {
      const path = lastPathSegment(detail.path);
      if (!isAuthField(path)) {
        continue;
      }
      fieldErrors[path] = validationCopy(path, detail.issue);
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { formError: null, fieldErrors };
    }
    return { formError: AUTH_COPY.validation, fieldErrors: {} };
  }

  return { formError: AUTH_COPY.requestFailed, fieldErrors: {} };
}

function assignConflict(fieldErrors: Partial<Record<AuthField, string>>, path: string): void {
  if (path === 'email') {
    fieldErrors.email = AUTH_COPY.emailTaken;
  }
  if (path === 'handle') {
    fieldErrors.handle = AUTH_COPY.handleTaken;
  }
}

function validationCopy(path: AuthField, issue: string): string {
  const key = issue.toLowerCase();
  if (path === 'email') {
    if (key.includes('required')) {
      return AUTH_COPY.emailRequired;
    }
    return AUTH_COPY.emailInvalid;
  }
  if (path === 'handle') {
    return AUTH_COPY.handleRequired;
  }
  if (path === 'displayName') {
    return AUTH_COPY.displayNameRequired;
  }
  if (key.includes('size') || key.includes('min') || key.includes('length')) {
    return AUTH_COPY.passwordMin;
  }
  if (key.includes('identity') || key.includes('match')) {
    return AUTH_COPY.passwordEqualsIdentity;
  }
  return AUTH_COPY.passwordMin;
}

function isAuthField(path: string): path is AuthField {
  return AUTH_FIELDS.has(path as AuthField);
}

function readErrorResponse(err: unknown): ErrorResponse | null {
  if (typeof err !== 'object' || err === null || !('error' in err)) {
    return null;
  }
  const payload = (err as { error: unknown }).error;
  if (typeof payload !== 'object' || payload === null || !('error' in payload)) {
    return null;
  }
  const inner = (payload as { error: unknown }).error;
  if (typeof inner !== 'object' || inner === null) {
    return null;
  }
  const code = (inner as { code?: unknown }).code;
  const message = (inner as { message?: unknown }).message;
  if (typeof code !== 'string' || typeof message !== 'string') {
    return null;
  }
  const details = (inner as { details?: unknown }).details;
  return {
    error: {
      code: code as ErrorResponse['error']['code'],
      message,
      details: Array.isArray(details) ? details.filter(isDetail) : undefined,
    },
  };
}

function isDetail(value: unknown): value is { path: string; issue: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { path?: unknown }).path === 'string' &&
    typeof (value as { issue?: unknown }).issue === 'string'
  );
}
