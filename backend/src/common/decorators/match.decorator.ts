import { registerDecorator, type ValidationArguments, type ValidationOptions } from 'class-validator';

// The field must equal another field of the same body, e.g. confirmPassword === password.
export function Match(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [other] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[other];
        },
      },
    });
  };
}
