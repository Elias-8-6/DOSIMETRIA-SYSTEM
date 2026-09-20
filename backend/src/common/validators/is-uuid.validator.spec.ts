import { validate } from 'class-validator';
import { IsUUID, PG_UUID_REGEX } from './is-uuid.validator';

class TestDto {
  @IsUUID()
  id!: string;
}

describe('IsUUID Validator (PG and Seed compatible)', () => {
  it('accepts standard RFC 4122 v4 UUIDs', async () => {
    const dto = new TestDto();
    dto.id = 'a35a1ff0-6df2-42ca-8632-6ab218ed91ef';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts sequential seed UUIDs (nil/custom version nibbles)', async () => {
    const dto = new TestDto();
    dto.id = '00000000-0000-0000-0000-000000000050';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);

    const dto2 = new TestDto();
    dto2.id = '00000000-0000-0000-0000-000000000070';
    const errors2 = await validate(dto2);
    expect(errors2).toHaveLength(0);
  });

  it('rejects non-UUID strings', async () => {
    const dto = new TestDto();
    dto.id = 'not-a-uuid-123';
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isUUID).toBe('id must be a UUID');
  });

  it('PG_UUID_REGEX matches correctly', () => {
    expect(PG_UUID_REGEX.test('00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(PG_UUID_REGEX.test('invalid')).toBe(false);
  });
});
