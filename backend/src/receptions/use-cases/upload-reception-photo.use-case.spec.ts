import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadReceptionPhotoUseCase } from './upload-reception-photo.use-case';

describe('UploadReceptionPhotoUseCase', () => {
  let useCase: UploadReceptionPhotoUseCase;
  let supabase: any;
  let orgScope: any;

  const validFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'damage.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake image content'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(() => {
    orgScope = {
      getOrganizationType: jest.fn().mockResolvedValue('laboratory'),
    };

    supabase = {
      getClient: jest.fn().mockReturnValue({
        storage: {
          listBuckets: jest.fn().mockResolvedValue({ data: [{ name: 'receptions' }] }),
          createBucket: jest.fn().mockResolvedValue({ error: null }),
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ data: { path: 'evidence/123.jpg' }, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: 'https://example.com/storage/receptions/evidence/123.jpg' },
            }),
          }),
        },
      }),
    };

    useCase = new UploadReceptionPhotoUseCase(supabase, orgScope);
  });

  it('throws ForbiddenException if organization is not laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute(validFile, 'client-org')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws BadRequestException if no file is provided', async () => {
    await expect(useCase.execute(null as any, 'lab-org')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException if file is not an allowed image format', async () => {
    const invalidFile = { ...validFile, mimetype: 'application/pdf' };
    await expect(useCase.execute(invalidFile, 'lab-org')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('successfully uploads photo and returns public URL', async () => {
    const result = await useCase.execute(validFile, 'lab-org');
    expect(result).toHaveProperty('url');
    expect(result.url).toBe('https://example.com/storage/receptions/evidence/123.jpg');
  });
});
