import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const HTML_MARKUP_PATTERN = /[<>]/;

@ValidatorConstraint({ name: 'isPlainText', async: false })
export class IsPlainTextConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    return !HTML_MARKUP_PATTERN.test(value);
  }

  defaultMessage(): string {
    return 'HTML is not allowed in this field';
  }
}

export function IsPlainText(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPlainTextConstraint,
    });
  };
}
