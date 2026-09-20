import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Expresión regular que valida formato UUID estándar de PostgreSQL (32 dígitos hexadecimales con guiones 8-4-4-4-12).
 * A diferencia del IsUUID por defecto de class-validator (que restringe estrictamente a versiones RFC 4122 v1-v5),
 * esta expresión es compatible con UUIDs nil y deterministas usados en seeds y pruebas (ej. 00000000-0000-0000-0000-000000000050).
 */
export const PG_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function IsUUID(versionOrOptions?: any, validationOptions?: ValidationOptions) {
  const options =
    typeof versionOrOptions === 'object' ? versionOrOptions : validationOptions;

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: options,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && PG_UUID_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a UUID`;
        },
      },
    });
  };
}
