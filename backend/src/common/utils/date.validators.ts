import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Decorador custom de class-validator que rechaza fechas futuras.
 * Acepta strings en formato ISO (YYYY-MM-DD o ISO 8601 completo).
 * Permite undefined/null -- combinar con @IsOptional() si el campo es opcional.
 */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (value === undefined || value === null || value === '') return true;
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return date <= today;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} no puede ser una fecha futura`;
        },
      },
    });
  };
}
