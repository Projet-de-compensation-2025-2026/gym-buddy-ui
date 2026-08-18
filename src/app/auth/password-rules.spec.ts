import { FormBuilder } from '@angular/forms';
import { fsAcct03PasswordValidator, passwordMeetsFsAcct03 } from './password-rules';

describe('password-rules', () => {
  it('FS-ACCT-03 accepts a password of at least 10 characters that is not the email or handle', () => {
    expect(passwordMeetsFsAcct03('longenough1', 'alex@example.com', 'alex')).toBeTrue();
  });

  it('FS-ACCT-03 rejects a short password or one equal to email or handle', () => {
    expect(passwordMeetsFsAcct03('short', 'alex@example.com', 'alex')).toBeFalse();
    expect(passwordMeetsFsAcct03('alex@example.com', 'alex@example.com', 'alex')).toBeFalse();
    expect(passwordMeetsFsAcct03('alex', 'alex@example.com', 'alex')).toBeFalse();
  });

  it('FS-ACCT-03 form validator flags a password that matches the handle', () => {
    const fb = new FormBuilder();
    const group = fb.nonNullable.group(
      {
        email: ['alex@example.com'],
        handle: ['alex'],
        password: ['alex'],
      },
      { validators: fsAcct03PasswordValidator('email', 'handle', 'password') },
    );
    expect(group.errors).toEqual({ fsAcct03: true });
  });
});
