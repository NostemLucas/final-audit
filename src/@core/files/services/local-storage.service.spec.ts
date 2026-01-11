/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@core/logger'
import { LocalStorageService } from './local-storage.service'
import * as path from 'path'

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
  rmdir: jest.fn(),
}))

const mockFsPromises = require('fs/promises')

describe('LocalStorageService', () => {
  let service: LocalStorageService
  let configService: jest.Mocked<ConfigService>
  let loggerService: jest.Mocked<LoggerService>

  const mockUploadsDir = '/test/uploads'
  const mockAppUrl = 'http://localhost:3001'

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks()

    const mockConfigService: Partial<jest.Mocked<ConfigService>> = {
      get: jest.fn((key: string) => {
        if (key === 'UPLOADS_DIR') return mockUploadsDir
        if (key === 'APP_URL') return mockAppUrl
        return undefined
      }),
    }

    const mockLoggerService: Partial<jest.Mocked<LoggerService>> = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }

    // Mock fs.access to simulate directory exists
    mockFsPromises.access.mockResolvedValue(undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile()

    service = module.get<LocalStorageService>(LocalStorageService)
    configService = module.get(ConfigService)
    loggerService = module.get(LoggerService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor & Initialization', () => {
    it('should initialize with default values when config is not provided', async () => {
      // Arrange
      configService.get = jest.fn().mockReturnValue(undefined)
      mockFsPromises.access = jest.fn().mockResolvedValue(undefined)

      // Act
      const module = await Test.createTestingModule({
        providers: [
          LocalStorageService,
          { provide: ConfigService, useValue: configService },
          { provide: LoggerService, useValue: loggerService },
        ],
      }).compile()

      const newService = module.get<LocalStorageService>(LocalStorageService)

      // Assert
      expect(newService).toBeDefined()
      expect(configService.get).toHaveBeenCalledWith('UPLOADS_DIR')
      expect(configService.get).toHaveBeenCalledWith('APP_URL')
    })

    it('should create uploads directory if it does not exist', async () => {
      // Arrange
      mockFsPromises.access = jest
        .fn()
        .mockRejectedValue(new Error('Not found'))
      mockFsPromises.mkdir = jest.fn().mockResolvedValue(undefined)

      // Act
      const module = await Test.createTestingModule({
        providers: [
          LocalStorageService,
          { provide: ConfigService, useValue: configService },
          { provide: LoggerService, useValue: loggerService },
        ],
      }).compile()

      const newService = module.get<LocalStorageService>(LocalStorageService)

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Assert
      expect(newService).toBeDefined()
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(mockUploadsDir, {
        recursive: true,
      })
    })
  })

  describe('saveFile', () => {
    const mockBuffer = Buffer.from('test file content')
    const mockOriginalName = 'test-file.pdf'
    const mockMimeType = 'application/pdf'

    beforeEach(() => {
      mockFsPromises.writeFile.mockResolvedValue(undefined)
      mockFsPromises.mkdir.mockResolvedValue(undefined)
      // Mock file doesn't exist by default (access throws error)
      mockFsPromises.access.mockRejectedValue(new Error('File not found'))
    })

    it('should save file successfully in simple folder', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert
      expect(result).toBeDefined()
      expect(result.fileName).toMatch(/\.pdf$/)
      expect(result.filePath).toContain('documents/')
      expect(result.size).toBe(mockBuffer.length)
      expect(result.mimeType).toBe(mockMimeType)
      expect(result.url).toContain(`${mockAppUrl}/uploads/`)
      expect(mockFsPromises.writeFile).toHaveBeenCalled()
      expect(loggerService.log).toHaveBeenCalled()
    })

    it('should save file in nested subdirectories', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'users/avatars/profile',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert
      expect(result.filePath).toContain('users/avatars/profile/')
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        path.join(mockUploadsDir, 'users/avatars/profile'),
        { recursive: true },
      )
    })

    it('should normalize folder path to prevent directory traversal', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'users/../../../etc/passwd',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert - '..' should be filtered out
      expect(result.filePath).not.toContain('..')
      expect(result.filePath).toContain('users/etc/passwd')
    })

    it('should handle Windows-style path separators', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'users\\avatars\\documents',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert - backslashes should be converted to forward slashes
      expect(result.filePath).toContain('users/avatars/documents')
      expect(result.filePath).not.toContain('\\')
    })

    it('should use custom filename when provided', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
        customFileName: 'my-custom-name',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert
      expect(result.fileName).toBe('my-custom-name.pdf')
    })

    it('should sanitize custom filename', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
        customFileName: 'My File Name @#$% With Special!!! Chars',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert - should be sanitized
      expect(result.fileName).toMatch(/^[a-z0-9-_.]+\.pdf$/)
      expect(result.fileName).not.toContain(' ')
      expect(result.fileName).not.toContain('@')
      expect(result.fileName).not.toContain('!')
    })

    it('should throw error when file exists and overwrite is false', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
        customFileName: 'existing-file',
        overwrite: false,
      }

      // Mock file exists
      mockFsPromises.access = jest.fn().mockResolvedValue(undefined)

      // Act & Assert
      await expect(service.saveFile(options)).rejects.toThrow(
        'ya existe en documents',
      )
    })

    it('should overwrite file when overwrite is true', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
        customFileName: 'existing-file',
        overwrite: true,
      }

      mockFsPromises.access = jest.fn().mockResolvedValue(undefined)

      // Act
      const result = await service.saveFile(options)

      // Assert
      expect(result).toBeDefined()
      expect(mockFsPromises.writeFile).toHaveBeenCalled()
    })

    it('should handle errors when creating directory fails', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
      }

      mockFsPromises.mkdir = jest
        .fn()
        .mockRejectedValue(new Error('Permission denied'))

      // Act & Assert
      await expect(service.saveFile(options)).rejects.toThrow(
        'Error al guardar archivo',
      )
      expect(loggerService.error).toHaveBeenCalled()
    })

    it('should handle errors when writing file fails', async () => {
      // Arrange
      const options = {
        buffer: mockBuffer,
        originalName: mockOriginalName,
        mimeType: mockMimeType,
        folder: 'documents',
      }

      mockFsPromises.writeFile = jest
        .fn()
        .mockRejectedValue(new Error('Disk full'))

      // Act & Assert
      await expect(service.saveFile(options)).rejects.toThrow(
        'Error al guardar archivo',
      )
      expect(loggerService.error).toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    beforeEach(() => {
      mockFsPromises.access = jest.fn().mockResolvedValue(undefined)
      mockFsPromises.unlink = jest.fn().mockResolvedValue(undefined)
      mockFsPromises.readdir = jest.fn().mockResolvedValue([])
      mockFsPromises.rmdir = jest.fn().mockResolvedValue(undefined)
    })

    it('should delete file successfully', async () => {
      // Arrange
      const filePath = 'documents/test-file.pdf'

      // Act
      await service.deleteFile({ filePath })

      // Assert
      expect(mockFsPromises.unlink).toHaveBeenCalledWith(
        path.join(mockUploadsDir, filePath),
      )
      expect(loggerService.log).toHaveBeenCalled()
    })

    it('should warn and return when file does not exist', async () => {
      // Arrange
      const filePath = 'documents/non-existent.pdf'
      mockFsPromises.access = jest
        .fn()
        .mockRejectedValue(new Error('Not found'))

      // Act
      await service.deleteFile({ filePath })

      // Assert
      expect(mockFsPromises.unlink).not.toHaveBeenCalled()
      expect(loggerService.warn).toHaveBeenCalled()
    })

    it('should remove empty folders after deleting file', async () => {
      // Arrange
      const filePath = 'documents/subfolder/test.pdf'
      mockFsPromises.readdir = jest.fn().mockResolvedValue([])

      // Act
      await service.deleteFile({ filePath })

      // Assert
      expect(mockFsPromises.unlink).toHaveBeenCalled()
      expect(mockFsPromises.readdir).toHaveBeenCalled()
      expect(mockFsPromises.rmdir).toHaveBeenCalled()
    })

    it('should not remove folder if it contains files', async () => {
      // Arrange
      const filePath = 'documents/subfolder/test.pdf'
      mockFsPromises.readdir = jest
        .fn()
        .mockResolvedValue(['other-file.pdf'] as any)

      // Act
      await service.deleteFile({ filePath })

      // Assert
      expect(mockFsPromises.unlink).toHaveBeenCalled()
      expect(mockFsPromises.readdir).toHaveBeenCalled()
      expect(mockFsPromises.rmdir).not.toHaveBeenCalled()
    })

    it('should not remove uploads root directory', async () => {
      // Arrange
      const filePath = 'test.pdf' // File directly in uploads
      mockFsPromises.readdir = jest.fn().mockResolvedValue([])

      // Act
      await service.deleteFile({ filePath })

      // Assert
      expect(mockFsPromises.unlink).toHaveBeenCalled()
      // Root directory should not be deleted even if empty
      const rmdirCalls = (mockFsPromises.rmdir as jest.Mock).mock.calls
      expect(rmdirCalls.every((call) => call[0] !== mockUploadsDir)).toBe(true)
    })

    it('should handle errors when deleting file fails', async () => {
      // Arrange
      const filePath = 'documents/test.pdf'
      mockFsPromises.unlink = jest
        .fn()
        .mockRejectedValue(new Error('Permission denied'))

      // Act & Assert
      await expect(service.deleteFile({ filePath })).rejects.toThrow(
        'Error al eliminar archivo',
      )
      expect(loggerService.error).toHaveBeenCalled()
    })
  })

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      // Arrange
      const filePath = 'documents/test.pdf'
      mockFsPromises.access = jest.fn().mockResolvedValue(undefined)

      // Act
      const exists = await service.fileExists(filePath)

      // Assert
      expect(exists).toBe(true)
      expect(mockFsPromises.access).toHaveBeenCalledWith(
        path.join(mockUploadsDir, filePath),
      )
    })

    it('should return false when file does not exist', async () => {
      // Arrange
      const filePath = 'documents/non-existent.pdf'
      mockFsPromises.access = jest
        .fn()
        .mockRejectedValue(new Error('Not found'))

      // Act
      const exists = await service.fileExists(filePath)

      // Assert
      expect(exists).toBe(false)
    })
  })

  describe('getFileUrl', () => {
    it('should return correct URL for file', () => {
      // Arrange
      const filePath = 'documents/test.pdf'

      // Act
      const url = service.getFileUrl(filePath)

      // Assert
      expect(url).toBe(`${mockAppUrl}/uploads/documents/test.pdf`)
    })

    it('should normalize Windows path separators in URL', () => {
      // Arrange
      const filePath = 'documents\\subfolder\\test.pdf'

      // Act
      const url = service.getFileUrl(filePath)

      // Assert
      expect(url).not.toContain('\\')
      expect(url).toContain('/')
    })

    it('should handle nested directories in URL', () => {
      // Arrange
      const filePath = 'users/avatars/profile/image.jpg'

      // Act
      const url = service.getFileUrl(filePath)

      // Assert
      expect(url).toBe(`${mockAppUrl}/uploads/users/avatars/profile/image.jpg`)
    })
  })

  describe('Path Security', () => {
    beforeEach(() => {
      mockFsPromises.writeFile.mockResolvedValue(undefined)
      mockFsPromises.mkdir.mockResolvedValue(undefined)
      mockFsPromises.access.mockRejectedValue(new Error('File not found'))
    })

    it('should prevent directory traversal attacks', async () => {
      // Arrange
      const maliciousOptions = {
        buffer: Buffer.from('test'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        folder: '../../../etc/passwd',
      }

      // Act
      const result = await service.saveFile(maliciousOptions)

      // Assert - should filter out '..'
      expect(result.filePath).not.toContain('..')
      expect(result.filePath).toBe('etc/passwd/' + result.fileName)
    })

    it('should filter out dot segments from path', async () => {
      // Arrange
      const options = {
        buffer: Buffer.from('test'),
        originalName: 'test.txt',
        mimeType: 'text/plain',
        folder: './users/./avatars/././documents',
      }

      // Act
      const result = await service.saveFile(options)

      // Assert - '.' should be filtered out
      expect(result.filePath).not.toContain('/.')
      expect(result.filePath).toBe('users/avatars/documents/' + result.fileName)
    })

    it('should prevent deletion outside uploads directory', async () => {
      // This is implicitly tested by the implementation
      // The removeEmptyFolders method has a check to prevent deletion outside uploadsDir
      // This test verifies that behavior indirectly

      // Arrange
      const filePath = 'documents/test.pdf'
      mockFsPromises.access = jest.fn().mockResolvedValue(undefined)
      mockFsPromises.unlink = jest.fn().mockResolvedValue(undefined)
      mockFsPromises.readdir = jest.fn().mockResolvedValue([])
      mockFsPromises.rmdir = jest.fn().mockResolvedValue(undefined)

      // Act
      await service.deleteFile({ filePath })

      // Assert - verify rmdir was called but never with a path outside uploadsDir
      const rmdirCalls = (mockFsPromises.rmdir as jest.Mock).mock.calls
      rmdirCalls.forEach((call) => {
        expect(call[0]).toContain(mockUploadsDir)
      })
    })
  })
})
