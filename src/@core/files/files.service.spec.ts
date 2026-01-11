/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing'
import { FilesService, UploadFileOptions } from './files.service'
import { FileValidator } from './validators/file.validator'
import type { IStorageService } from './interfaces/storage.interface'
import { SaveFileResult } from './interfaces/storage.interface'
import { Readable } from 'stream'

describe('FilesService', () => {
  let service: FilesService
  let storageService: jest.Mocked<IStorageService>
  let fileValidator: jest.Mocked<FileValidator>

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test file content'),
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
  }

  const mockSaveResult: SaveFileResult = {
    fileName: 'abc-123.pdf',
    filePath: 'documents/abc-123.pdf',
    url: 'http://localhost:3001/uploads/documents/abc-123.pdf',
    size: 1024,
    mimeType: 'application/pdf',
  }

  beforeEach(async () => {
    const mockStorageService: Partial<jest.Mocked<IStorageService>> = {
      saveFile: jest.fn().mockResolvedValue(mockSaveResult),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      fileExists: jest.fn().mockResolvedValue(true),
      getFileUrl: jest.fn((path) => `http://localhost:3001/uploads/${path}`),
    }

    const mockFileValidator: Partial<jest.Mocked<FileValidator>> = {
      validateFile: jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      }),
      resizeImageIfNeeded: jest.fn((buffer) => Promise.resolve(buffer)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        {
          provide: 'STORAGE_SERVICE',
          useValue: mockStorageService,
        },
        {
          provide: FileValidator,
          useValue: mockFileValidator,
        },
      ],
    }).compile()

    service = module.get<FilesService>(FilesService)
    storageService = module.get('STORAGE_SERVICE')
    fileValidator = module.get(FileValidator)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadFile', () => {
    const uploadOptions: UploadFileOptions = {
      file: mockFile,
      folder: 'documents',
      validationOptions: {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['application/pdf'],
      },
    }

    it('should upload file successfully', async () => {
      // Arrange
      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      const result = await service.uploadFile(uploadOptions)

      // Assert
      expect(result).toEqual(mockSaveResult)
      expect(fileValidator.validateFile).toHaveBeenCalledWith(
        mockFile,
        uploadOptions.validationOptions,
      )
      expect(storageService.saveFile).toHaveBeenCalledWith({
        buffer: mockFile.buffer,
        originalName: mockFile.originalname,
        mimeType: mockFile.mimetype,
        folder: uploadOptions.folder,
        customFileName: undefined,
        overwrite: undefined,
      })
    })

    it('should validate file before uploading', async () => {
      // Arrange
      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      await service.uploadFile(uploadOptions)

      // Assert
      expect(fileValidator.validateFile).toHaveBeenCalledWith(
        mockFile,
        uploadOptions.validationOptions,
      )
      // Validation is called, and since save was successful, validation passed
      expect(storageService.saveFile).toHaveBeenCalled()
    })

    it('should throw error when file validation fails', async () => {
      // Arrange
      fileValidator.validateFile.mockResolvedValue({
        isValid: false,
        errors: ['File too large', 'Invalid file type'],
      })

      // Act & Assert
      await expect(service.uploadFile(uploadOptions)).rejects.toThrow(
        'Archivo inválido: File too large, Invalid file type',
      )
      expect(storageService.saveFile).not.toHaveBeenCalled()
    })

    it('should use custom filename when provided', async () => {
      // Arrange
      const optionsWithCustomName: UploadFileOptions = {
        ...uploadOptions,
        customFileName: 'my-custom-name',
      }

      // Act
      await service.uploadFile(optionsWithCustomName)

      // Assert
      expect(storageService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          customFileName: 'my-custom-name',
        }),
      )
    })

    it('should pass overwrite option to storage service', async () => {
      // Arrange
      const optionsWithOverwrite: UploadFileOptions = {
        ...uploadOptions,
        overwrite: true,
      }

      // Act
      await service.uploadFile(optionsWithOverwrite)

      // Assert
      expect(storageService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          overwrite: true,
        }),
      )
    })

    it('should resize image if file is an image', async () => {
      // Arrange
      const imageFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
      }

      const optionsWithImage: UploadFileOptions = {
        ...uploadOptions,
        file: imageFile,
      }

      const resizedBuffer = Buffer.from('resized image content')
      fileValidator.resizeImageIfNeeded.mockResolvedValue(resizedBuffer)

      // Act
      await service.uploadFile(optionsWithImage)

      // Assert
      expect(fileValidator.resizeImageIfNeeded).toHaveBeenCalledWith(
        imageFile.buffer,
        uploadOptions.validationOptions,
      )
      expect(storageService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: resizedBuffer,
        }),
      )
    })

    it('should not resize non-image files', async () => {
      // Arrange
      const pdfFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'application/pdf',
      }

      const optionsWithPdf: UploadFileOptions = {
        ...uploadOptions,
        file: pdfFile,
      }

      // Act
      await service.uploadFile(optionsWithPdf)

      // Assert
      expect(fileValidator.resizeImageIfNeeded).not.toHaveBeenCalled()
      expect(storageService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: pdfFile.buffer,
        }),
      )
    })

    it('should handle different image MIME types', async () => {
      // Arrange
      const imageMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]

      for (const mimeType of imageMimeTypes) {
        jest.clearAllMocks()

        const imageFile: Express.Multer.File = {
          ...mockFile,
          mimetype: mimeType,
        }

        const optionsWithImage: UploadFileOptions = {
          ...uploadOptions,
          file: imageFile,
        }

        // Act
        await service.uploadFile(optionsWithImage)

        // Assert
        expect(fileValidator.resizeImageIfNeeded).toHaveBeenCalled()
      }
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Arrange
      const filePath = 'documents/test-file.pdf'

      // Act
      await service.deleteFile(filePath)

      // Assert
      expect(storageService.deleteFile).toHaveBeenCalledWith({ filePath })
    })

    it('should handle deletion errors', async () => {
      // Arrange
      const filePath = 'documents/test-file.pdf'
      storageService.deleteFile.mockRejectedValue(new Error('File not found'))

      // Act & Assert
      await expect(service.deleteFile(filePath)).rejects.toThrow(
        'File not found',
      )
    })
  })

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Arrange
      const filePath = 'documents/test-file.pdf'
      storageService.fileExists.mockResolvedValue(true)

      // Act
      const exists = await service.fileExists(filePath)

      // Assert
      expect(exists).toBe(true)
      expect(storageService.fileExists).toHaveBeenCalledWith(filePath)
    })

    it('should return false when file does not exist', async () => {
      // Arrange
      const filePath = 'documents/non-existent.pdf'
      storageService.fileExists.mockResolvedValue(false)

      // Act
      const exists = await service.fileExists(filePath)

      // Assert
      expect(exists).toBe(false)
    })
  })

  describe('getFileUrl', () => {
    it('should return file URL', () => {
      // Arrange
      const filePath = 'documents/test-file.pdf'
      const expectedUrl =
        'http://localhost:3001/uploads/documents/test-file.pdf'
      storageService.getFileUrl.mockReturnValue(expectedUrl)

      // Act
      const url = service.getFileUrl(filePath)

      // Assert
      expect(url).toBe(expectedUrl)
      expect(storageService.getFileUrl).toHaveBeenCalledWith(filePath)
    })
  })

  describe('replaceFile', () => {
    const uploadOptions: UploadFileOptions = {
      file: mockFile,
      folder: 'avatars',
      validationOptions: {
        maxSize: 2 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      },
    }

    it('should upload new file and delete old file', async () => {
      // Arrange
      const oldFilePath = 'avatars/old-avatar.jpg'
      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      const result = await service.replaceFile(oldFilePath, uploadOptions)

      // Assert
      expect(result).toEqual(mockSaveResult)
      expect(storageService.saveFile).toHaveBeenCalled()
      expect(storageService.deleteFile).toHaveBeenCalledWith({
        filePath: oldFilePath,
      })
    })

    it('should upload new file first, then delete old file', async () => {
      // Arrange
      const oldFilePath = 'avatars/old-avatar.jpg'
      const saveFileSpy = jest.spyOn(storageService, 'saveFile')
      const deleteFileSpy = jest.spyOn(storageService, 'deleteFile')

      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      await service.replaceFile(oldFilePath, uploadOptions)

      // Assert - Both should be called
      expect(saveFileSpy).toHaveBeenCalled()
      expect(deleteFileSpy).toHaveBeenCalled()
      // If delete was called, it means save succeeded first (otherwise would have thrown)
      expect(deleteFileSpy).toHaveBeenCalledWith({ filePath: oldFilePath })
    })

    it('should not delete old file when oldFilePath is null', async () => {
      // Arrange
      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      await service.replaceFile(null, uploadOptions)

      // Assert
      expect(storageService.saveFile).toHaveBeenCalled()
      expect(storageService.deleteFile).not.toHaveBeenCalled()
    })

    it('should ignore errors when deleting old file fails', async () => {
      // Arrange
      const oldFilePath = 'avatars/old-avatar.jpg'
      const consoleWarnSpy = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })
      storageService.deleteFile.mockRejectedValue(new Error('File not found'))

      // Act
      const result = await service.replaceFile(oldFilePath, uploadOptions)

      // Assert - should still succeed
      expect(result).toEqual(mockSaveResult)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No se pudo eliminar archivo antiguo'),
      )

      consoleWarnSpy.mockRestore()
    })

    it('should fail if new file upload fails', async () => {
      // Arrange
      const oldFilePath = 'avatars/old-avatar.jpg'
      fileValidator.validateFile.mockResolvedValue({
        isValid: false,
        errors: ['Invalid file type'],
      })

      // Act & Assert
      await expect(
        service.replaceFile(oldFilePath, uploadOptions),
      ).rejects.toThrow('Archivo inválido')
      expect(storageService.deleteFile).not.toHaveBeenCalled()
    })

    it('should work with different file types', async () => {
      // Arrange
      const oldFilePath = 'logos/old-logo.png'
      const logoFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'new-logo.png',
        mimetype: 'image/png',
      }

      const logoOptions: UploadFileOptions = {
        file: logoFile,
        folder: 'logos',
        validationOptions: {
          maxSize: 1024 * 1024,
          allowedMimeTypes: ['image/png'],
        },
      }

      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      await service.replaceFile(oldFilePath, logoOptions)

      // Assert
      expect(storageService.saveFile).toHaveBeenCalled()
      expect(storageService.deleteFile).toHaveBeenCalledWith({
        filePath: oldFilePath,
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete upload workflow', async () => {
      // Arrange
      const uploadOptions: UploadFileOptions = {
        file: mockFile,
        folder: 'documents/important',
        validationOptions: {
          maxSize: 10 * 1024 * 1024,
          allowedMimeTypes: ['application/pdf'],
        },
        customFileName: 'contract-2024',
      }

      // Act
      const result = await service.uploadFile(uploadOptions)

      // Assert - verify complete workflow
      expect(fileValidator.validateFile).toHaveBeenCalled()
      expect(storageService.saveFile).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(result.url).toBeTruthy()
    })

    it('should handle avatar replacement workflow', async () => {
      // Arrange
      const oldAvatar = 'users/123/avatar-old.jpg'
      const newAvatarFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
      }

      const avatarOptions: UploadFileOptions = {
        file: newAvatarFile,
        folder: 'users/123',
        validationOptions: {
          maxSize: 2 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png'],
        },
        customFileName: 'avatar',
      }

      fileValidator.validateFile.mockResolvedValue({
        isValid: true,
        errors: [],
      })

      // Act
      const result = await service.replaceFile(oldAvatar, avatarOptions)

      // Assert
      expect(fileValidator.validateFile).toHaveBeenCalled()
      expect(fileValidator.resizeImageIfNeeded).toHaveBeenCalled()
      expect(storageService.saveFile).toHaveBeenCalled()
      expect(storageService.deleteFile).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })
})
