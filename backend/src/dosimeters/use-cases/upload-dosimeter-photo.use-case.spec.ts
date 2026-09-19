import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadDosimeterPhotoUseCase } from './upload-dosimeter-photo.use-case';

describe('UploadDosimeterPhotoUseCase', () => {
  let useCase: UploadDosimeterPhotoUseCase;
  let supabase: any;
  let orgScope: any;

  const validFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
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
          listBuckets: jest.fn().mockResolvedValue({ data: [{ name: 'dosimeters' }] }),
          createBucket: jest.fn().mockResolvedValue({ error: null }),
          from: jest.fn().mockReturnValue({
            upload: jest.fn().mockResolvedValue({ data: { path: 'photos/123.jpg' }, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({
              data: { publicUrl: 'https://example.com/storage/dosimeters/photos/123.jpg' },
            }),
          }),
        },
        from: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    };

    useCase = new UploadDosimeterPhotoUseCase(supabase, orgScope);
  });

  it('throws ForbiddenException if organization is not laboratory', async () => {
    orgScope.getOrganizationType.mockResolvedValue('client');
    await expect(useCase.execute(validFile, 'client-org')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws BadRequestException if no file is provided', async () => {
    await expect(useCase.execute(null as any, 'lab-org')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException if file is not an allowed image format', async () => {
    const invalidFile = { ...validFile, mimetype: 'application/pdf' };
    await expect(useCase.execute(invalidFile, 'lab-org')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequestException if file is larger than 5MB', async () => {
    const hugeFile = { ...validFile, size: 6 * 1024 * 1024 };
    await expect(useCase.execute(hugeFile, 'lab-org')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads file successfully and returns public url', async () => {
    const result = await useCase.execute(validFile, 'lab-org');
    expect(result).toHaveProperty('url', 'https://example.com/storage/dosimeters/photos/123.jpg');
  });

  it('updates dosimeter in DB if dosimeterId is provided', async () => {
    const result = await useCase.execute(validFile, 'lab-org', 'dosimeter-123');
    expect(result).toHaveProperty('url');
    expect(supabase.getClient().from).toHaveBeenCalledWith('dosimeters');
  });
});
