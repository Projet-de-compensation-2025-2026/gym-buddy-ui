import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { fsAcct03PasswordValidator } from './password-rules';
import {
  AUTH_COPY,
  clientLoginErrors,
  clientRegisterErrors,
  lastPathSegment,
  mapAuthApiError,
} from './auth-errors';

describe('auth-errors', () => {
  const fb = new FormBuilder();

  it('maps empty / invalid login fields to the failing control', () => {
    const form = fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    expect(clientLoginErrors(form)).toEqual({
      email: AUTH_COPY.emailRequired,
      password: AUTH_COPY.passwordRequired,
    });
    form.controls.email.setValue('not-an-email');
    expect(clientLoginErrors(form).email).toBe(AUTH_COPY.emailInvalid);
  });

  it('FS-ACCT-03 maps short password and identity match onto the password field', () => {
    const form = fb.nonNullable.group(
      {
        email: ['alex@example.com', [Validators.required, Validators.email]],
        handle: ['alex', Validators.required],
        password: ['short', [Validators.required, Validators.minLength(10)]],
        displayName: ['Alex', Validators.required],
      },
      { validators: fsAcct03PasswordValidator('email', 'handle', 'password') },
    );
    expect(clientRegisterErrors(form).password).toBe(AUTH_COPY.passwordMin);

    form.controls.password.setValue('alex@example.com');
    expect(clientRegisterErrors(form).password).toBe(AUTH_COPY.passwordEqualsEmail);

    form.controls.handle.setValue('alexhandle1');
    form.controls.password.setValue('alexhandle1');
    form.updateValueAndValidity();
    expect(clientRegisterErrors(form).password).toBe(AUTH_COPY.passwordEqualsHandle);
  });

  it('maps CONFLICT details[].path to visitor copy, not the raw API message', () => {
    const mapped = mapAuthApiError(
      new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: {
          error: {
            code: 'CONFLICT',
            message: 'email already registered',
            details: [{ path: 'email', issue: 'duplicate' }],
          },
        },
      }),
    );
    expect(mapped.formError).toBeNull();
    expect(mapped.fieldErrors.email).toBe(AUTH_COPY.emailTaken);
  });

  it('maps handle CONFLICT and password VALIDATION from details path', () => {
    expect(
      mapAuthApiError(
        new HttpErrorResponse({
          status: 409,
          error: {
            error: {
              code: 'CONFLICT',
              message: 'handle already taken',
              details: [{ path: 'handle', issue: 'duplicate' }],
            },
          },
        }),
      ).fieldErrors.handle,
    ).toBe(AUTH_COPY.handleTaken);

    const validation = mapAuthApiError(
      new HttpErrorResponse({
        status: 422,
        error: {
          error: {
            code: 'VALIDATION',
            message: 'password too short',
            details: [{ path: 'password', issue: 'size' }],
          },
        },
      }),
    );
    expect(validation.fieldErrors.password).toBe(AUTH_COPY.passwordMin);
    expect(validation.formError).toBeNull();
  });

  it('maps FORBIDDEN to generic invalid-credentials copy', () => {
    expect(
      mapAuthApiError(
        new HttpErrorResponse({
          status: 403,
          error: { error: { code: 'FORBIDDEN', message: 'invalid credentials' } },
        }),
      ).formError,
    ).toBe(AUTH_COPY.invalidCredentials);
    expect(
      mapAuthApiError(
        new HttpErrorResponse({
          status: 403,
          error: { error: { code: 'FORBIDDEN', message: 'account is locked' } },
        }),
      ).formError,
    ).toBe(AUTH_COPY.invalidCredentials);
  });

  it('reads the last segment of details path', () => {
    expect(lastPathSegment('email')).toBe('email');
    expect(lastPathSegment('/handle')).toBe('handle');
    expect(lastPathSegment('registerRequest.password')).toBe('password');
  });
});
