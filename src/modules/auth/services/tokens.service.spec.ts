import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { TokensService } from './tokens.service'
import { TokenStorageService, REDIS_PREFIXES, CACHE_KEYS } from '@core/cache'
import { JwtTokenHelper } from '../helpers'
import type { UserEntity } from '../../users/entities/user.entity'
import { UserStatus } from '../../users/entities/user.entity'

/**
 * UNIT TESTS - TokensService (Token Management Logic)
 *
 * Enfoque:
 * - Todos los servicios externos están mockeados
 * - Solo se prueba la lógica del TokensService
 *
 * Escenarios cubiertos:
 * 1. Generación de pares de tokens (access + refresh)
 * 2. Validación de refresh tokens
 * 3. Revocación de tokens
 * 4. Blacklist de access tokens
 * 5. Verificación de tokens en blacklist
 * 6. Decodificación de tokens
 */
describe('TokensService - Unit Tests (Token Management)', () => {
  let service: TokensService
  let jwtService: jest.Mocked<JwtService>
  let configService: jest.Mocked<ConfigService>
  let tokenStorage: jest.Mocked<TokenStorageService>
  let jwtTokenHelper: jest.Mocked<JwtTokenHelper>

  // Test data
  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User',
    roles: ['user'],
    organizationId: 'org-123',
    status: UserStatus.ACTIVE,
    names: 'Test',
    lastNames: 'User',
    ci: '12345678',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity

  const mockAccessToken = 'mock.access.token'
  const mockRefreshToken = 'mock.refresh.token'
  const mockTokenId = 'token-id-123'

  beforeEach(async () => {
    // Create mocks
    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    }

    // ConfigService mock MUST be configured BEFORE creating the module
    // because TokensService constructor reads config values
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          JWT_REFRESH_SECRET: 'refresh-secret-key',
        }
        return config[key] ?? defaultValue
      }),
    }

    const mockTokenStorage = {
      generateTokenId: jest.fn(),
      storeToken: jest.fn(),
      validateToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      storeSimple: jest.fn(),
      exists: jest.fn(),
    }

    const mockJwtTokenHelper = {
      generateSignedToken: jest.fn(),
      getExpirySeconds: jest.fn(),
      decodeToken: jest.fn(),
    }

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TokenStorageService,
          useValue: mockTokenStorage,
        },
        {
          provide: JwtTokenHelper,
          useValue: mockJwtTokenHelper,
        },
      ],
    }).compile()

    service = module.get<TokensService>(TokensService)
    jwtService = module.get(JwtService)
    configService = module.get(ConfigService)
    tokenStorage = module.get(TokenStorageService)
    jwtTokenHelper = module.get(JwtTokenHelper)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor - Configuration Validation', () => {
    it('should throw error if JWT_REFRESH_SECRET is missing', () => {
      // Arrange - Create a separate config service that returns undefined
      const badConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'JWT_REFRESH_SECRET') return undefined
          return '15m'
        }),
      } as any

      // Act & Assert
      expect(() => {
        new TokensService(
          jwtService,
          badConfigService,
          tokenStorage,
          jwtTokenHelper,
        )
      }).toThrow('JWT_REFRESH_SECRET is required')
    })
  })

  describe('generateTokenPair() - Token Generation', () => {
    beforeEach(() => {
      tokenStorage.generateTokenId.mockReturnValue(mockTokenId)
      jwtService.sign.mockReturnValue(mockAccessToken)
      jwtTokenHelper.generateSignedToken.mockReturnValue(mockRefreshToken)
      jwtTokenHelper.getExpirySeconds.mockReturnValue(604800) // 7 days
      tokenStorage.storeToken.mockResolvedValue(undefined)
    })

    it('should generate both access and refresh tokens', async () => {
      // Act
      const result = await service.generateTokenPair(mockUser)

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      })
    })

    it('should generate unique tokenId for each pair', async () => {
      // Act
      await service.generateTokenPair(mockUser)

      // Assert
      expect(tokenStorage.generateTokenId).toHaveBeenCalledTimes(1)
    })

    it('should create access token with correct payload', async () => {
      // Act
      await service.generateTokenPair(mockUser)

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          roles: mockUser.roles,
          organizationId: mockUser.organizationId,
        },
        { expiresIn: '15m' },
      )
    })

    it('should create refresh token with userId and tokenId', async () => {
      // Act
      await service.generateTokenPair(mockUser)

      // Assert
      expect(jwtTokenHelper.generateSignedToken).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          tokenId: mockTokenId,
        },
        'refresh-secret-key',
        '7d',
      )
    })

    it('should store refresh token in Redis with TTL', async () => {
      // Act
      await service.generateTokenPair(mockUser)

      // Assert
      expect(tokenStorage.storeToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokenId,
        {
          prefix: REDIS_PREFIXES.REFRESH_TOKEN,
          ttlSeconds: 604800, // 7 days
        },
      )
    })

    it('should use configured expiry times', async () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '30m'
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d'
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret-key'
        return undefined
      })

      // Re-create service with new config
      const newService = new TokensService(
        jwtService,
        configService,
        tokenStorage,
        jwtTokenHelper,
      )

      // Act
      await newService.generateTokenPair(mockUser)

      // Assert - Access token expiry
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        { expiresIn: '30m' },
      )

      // Assert - Refresh token expiry
      expect(jwtTokenHelper.generateSignedToken).toHaveBeenCalledWith(
        expect.any(Object),
        'refresh-secret-key',
        '30d',
      )
    })
  })

  describe('validateRefreshToken() - Token Validation', () => {
    it('should validate token exists in Redis', async () => {
      // Arrange
      tokenStorage.validateToken.mockResolvedValue(true)

      // Act
      const result = await service.validateRefreshToken(
        mockUser.id,
        mockTokenId,
      )

      // Assert
      expect(result).toBe(true)
      expect(tokenStorage.validateToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokenId,
        REDIS_PREFIXES.REFRESH_TOKEN,
      )
    })

    it('should return false for revoked token', async () => {
      // Arrange
      tokenStorage.validateToken.mockResolvedValue(false)

      // Act
      const result = await service.validateRefreshToken(
        mockUser.id,
        mockTokenId,
      )

      // Assert
      expect(result).toBe(false)
    })

    it('should return false for non-existent token', async () => {
      // Arrange
      tokenStorage.validateToken.mockResolvedValue(false)

      // Act
      const result = await service.validateRefreshToken(
        mockUser.id,
        'non-existent-token',
      )

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('revokeRefreshToken() - Token Revocation', () => {
    it('should revoke refresh token from Redis', async () => {
      // Arrange
      tokenStorage.revokeToken.mockResolvedValue(undefined)

      // Act
      await service.revokeRefreshToken(mockUser.id, mockTokenId)

      // Assert
      expect(tokenStorage.revokeToken).toHaveBeenCalledWith(
        mockUser.id,
        mockTokenId,
        REDIS_PREFIXES.REFRESH_TOKEN,
      )
    })

    it('should handle revocation of already revoked token', async () => {
      // Arrange
      tokenStorage.revokeToken.mockResolvedValue(undefined)

      // Act & Assert - Should not throw
      await expect(
        service.revokeRefreshToken(mockUser.id, mockTokenId),
      ).resolves.toBeUndefined()
    })
  })

  describe('blacklistAccessToken() - Access Token Blacklisting', () => {
    it('should blacklist valid access token with remaining TTL', async () => {
      // Arrange
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        exp: futureExp,
      })
      tokenStorage.storeSimple.mockResolvedValue(undefined)

      // Act
      await service.blacklistAccessToken(mockAccessToken, mockUser.id)

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith(mockAccessToken)
      expect(tokenStorage.storeSimple).toHaveBeenCalledWith(
        CACHE_KEYS.BLACKLIST(mockAccessToken),
        mockUser.id,
        expect.any(Number), // TTL in seconds
      )
    })

    it('should not blacklist expired token', async () => {
      // Arrange
      const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        exp: pastExp,
      })

      // Act
      await service.blacklistAccessToken(mockAccessToken, mockUser.id)

      // Assert - Should not store in Redis
      expect(tokenStorage.storeSimple).not.toHaveBeenCalled()
    })

    it('should not blacklist token without expiration', async () => {
      // Arrange
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        // No exp field
      })

      // Act
      await service.blacklistAccessToken(mockAccessToken, mockUser.id)

      // Assert
      expect(tokenStorage.storeSimple).not.toHaveBeenCalled()
    })

    it('should handle invalid token gracefully', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // Act & Assert - Should not throw
      await expect(
        service.blacklistAccessToken('invalid.token', mockUser.id),
      ).resolves.toBeUndefined()

      expect(tokenStorage.storeSimple).not.toHaveBeenCalled()
    })

    it('should calculate correct TTL for blacklist', async () => {
      // Arrange
      const now = Date.now()
      const expiryTime = Math.floor(now / 1000) + 900 // 15 minutes from now
      jwtService.verify.mockReturnValue({
        sub: mockUser.id,
        exp: expiryTime,
      })

      // Act
      await service.blacklistAccessToken(mockAccessToken, mockUser.id)

      // Assert - TTL should be approximately 15 minutes (900 seconds)
      const ttlCall = tokenStorage.storeSimple.mock.calls[0]
      const ttl = ttlCall[2] as number
      expect(ttl).toBeGreaterThan(890) // Allow some variance
      expect(ttl).toBeLessThanOrEqual(900)
    })
  })

  describe('isTokenBlacklisted() - Blacklist Check', () => {
    it('should return true for blacklisted token', async () => {
      // Arrange
      tokenStorage.exists.mockResolvedValue(true)

      // Act
      const result = await service.isTokenBlacklisted(mockAccessToken)

      // Assert
      expect(result).toBe(true)
      expect(tokenStorage.exists).toHaveBeenCalledWith(
        CACHE_KEYS.BLACKLIST(mockAccessToken),
      )
    })

    it('should return false for non-blacklisted token', async () => {
      // Arrange
      tokenStorage.exists.mockResolvedValue(false)

      // Act
      const result = await service.isTokenBlacklisted(mockAccessToken)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('revokeAllUserTokens() - Revoke All User Sessions', () => {
    it('should revoke all refresh tokens for a user', async () => {
      // Arrange
      tokenStorage.revokeAllUserTokens.mockResolvedValue(undefined)

      // Act
      await service.revokeAllUserTokens(mockUser.id)

      // Assert
      expect(tokenStorage.revokeAllUserTokens).toHaveBeenCalledWith(
        mockUser.id,
        REDIS_PREFIXES.REFRESH_TOKEN,
      )
    })

    it('should handle user with no active tokens', async () => {
      // Arrange
      tokenStorage.revokeAllUserTokens.mockResolvedValue(undefined)

      // Act & Assert
      await expect(
        service.revokeAllUserTokens(mockUser.id),
      ).resolves.toBeUndefined()
    })
  })

  describe('decodeRefreshToken() - Token Decoding', () => {
    it('should decode valid refresh token', () => {
      // Arrange
      const mockPayload = {
        sub: mockUser.id,
        tokenId: mockTokenId,
      }
      jwtTokenHelper.decodeToken.mockReturnValue(mockPayload)

      // Act
      const result = service.decodeRefreshToken(mockRefreshToken)

      // Assert
      expect(result).toEqual(mockPayload)
      expect(jwtTokenHelper.decodeToken).toHaveBeenCalledWith(mockRefreshToken)
    })

    it('should throw error for invalid token', () => {
      // Arrange
      jwtTokenHelper.decodeToken.mockReturnValue(null)

      // Act & Assert
      expect(() => service.decodeRefreshToken('invalid.token')).toThrow(
        'Token inválido',
      )
    })

    it('should throw error for malformed token', () => {
      // Arrange
      jwtTokenHelper.decodeToken.mockReturnValue(undefined)

      // Act & Assert
      expect(() => service.decodeRefreshToken('malformed')).toThrow(
        'Token inválido',
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      // Arrange
      tokenStorage.storeToken.mockRejectedValue(
        new Error('Redis connection failed'),
      )

      // Act & Assert
      await expect(service.generateTokenPair(mockUser)).rejects.toThrow(
        'Redis connection failed',
      )
    })

    it('should handle user with missing fields', async () => {
      // Arrange
      const partialUser = {
        id: 'user-123',
        email: 'test@example.com',
      } as UserEntity

      tokenStorage.generateTokenId.mockReturnValue(mockTokenId)
      jwtService.sign.mockReturnValue(mockAccessToken)
      jwtTokenHelper.generateSignedToken.mockReturnValue(mockRefreshToken)
      jwtTokenHelper.getExpirySeconds.mockReturnValue(604800)

      // Act
      const result = await service.generateTokenPair(partialUser)

      // Assert - Should still generate tokens
      expect(result.accessToken).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })
  })
})
