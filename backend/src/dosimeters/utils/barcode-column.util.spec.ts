import { isMissingBarcodeColumnError } from './barcode-column.util';

describe('isMissingBarcodeColumnError', () => {
  it('retorna true para código de error 42703 (undefined_column)', () => {
    expect(isMissingBarcodeColumnError({ code: '42703', message: 'column dosimeters.barcode does not exist' })).toBe(true);
  });

  it('retorna true para código PGRST204 (columna no en cache PostgREST)', () => {
    expect(isMissingBarcodeColumnError({ code: 'PGRST204', message: 'Could not find the column barcode' })).toBe(true);
  });

  it('retorna false para código 23505 (unique_violation), incluso si el mensaje menciona barcode', () => {
    const uniqueColisionError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "dosimeters_barcode_key"',
      detail: 'Key (barcode)=(DOS-001) already exists.',
    };
    expect(isMissingBarcodeColumnError(uniqueColisionError)).toBe(false);
  });

  it('retorna false para error nulo o indefinido', () => {
    expect(isMissingBarcodeColumnError(null)).toBe(false);
    expect(isMissingBarcodeColumnError(undefined)).toBe(false);
  });

  it('retorna true si el mensaje describe columna inexistente', () => {
    expect(isMissingBarcodeColumnError({ message: 'column "barcode" does not exist' })).toBe(true);
    expect(isMissingBarcodeColumnError({ message: 'could not find column barcode in schema' })).toBe(true);
  });

  it('retorna false para otros errores genéricos que mencionen barcode', () => {
    expect(isMissingBarcodeColumnError({ message: 'barcode is invalid format' })).toBe(false);
  });
});
