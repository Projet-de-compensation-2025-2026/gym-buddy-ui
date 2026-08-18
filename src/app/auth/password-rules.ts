import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** FS-ACCT-03: password ≥ 10 characters and not equal to email or handle. */
export function passwordMeetsFsAcct03(password: string, email: string, handle: string): boolean {
  if (password.length < 10) {
    return false;
  }
  const lower = password.toLowerCase();
  return lower !== email.toLowerCase() && lower !== handle.toLowerCase();
}

export function fsAcct03PasswordValidator(
  emailKey: string,
  handleKey: string,
  passwordKey: string,
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const email = String(group.get(emailKey)?.value ?? '');
    const handle = String(group.get(handleKey)?.value ?? '');
    const password = String(group.get(passwordKey)?.value ?? '');
    if (!password) {
      return null;
    }
    return passwordMeetsFsAcct03(password, email, handle) ? null : { fsAcct03: true };
  };
}
