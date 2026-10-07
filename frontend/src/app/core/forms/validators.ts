import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Same rule and message as the server (backend/src/lib/password.ts).
export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters with a letter and a number';

export const passwordRule: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '');
  if (!value) return null;
  const ok = value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
  return ok ? null : { passwordRule: true };
};

// Group validator: sets `mismatch` on the confirm control when it differs from the password.
export function matchFields(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const confirm = group.get(confirmField);
    if (!confirm) return null;
    const mismatch = !!confirm.value && group.get(field)?.value !== confirm.value;
    const errors = { ...confirm.errors };
    delete errors['mismatch'];
    if (mismatch) errors['mismatch'] = true;
    confirm.setErrors(Object.keys(errors).length ? errors : null);
    return null;
  };
}
