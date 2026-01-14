import { Test, TestingModule } from '@nestjs/testing'
import { LoginUseCase } from './login.use-case'
import { PasswordHashService } from '@core/security'
import { TokensService } from '../../services/tokens.service'
import { LoginRateLimitPolicy } from '../../policies'
import { USERS_REPOSITORY } from '../../../users/tokens'
import type { IUsersRepository } from '../../../users/repositories'
import {
  InvalidCredentialsException,
  UserNotActiveException,
} from '../../exceptions'
import { UserStatus, UserEntity } from '../../../users/entities/user.entity'
import type { LoginDto } from '../../dtos'

/**
 * UNIT TESTS - LoginUseCase (Business Logic)
 *
 * Enfoque:
 * - TODOS los servicios están mockeados
 * - NO hay llamadas reales a DB/Redis
 * - Solo se prueba la lógica de negocio del use case
 *
 * Escenarios cubiertos:
 * 1. Login exitoso con credenciales válidas
 * 2. Fallo por credenciales inválidas (usuario no existe)
 * 3. Fallo por contraseña incorrecta
 * 4. Fallo por usuario inactivo
 * 5. Fallo por rate limiting (demasiados intentos)
 * 6. Verificación de incremento de contadores en fallo
 * 7. Verificación de reset de contadores en éxito
 */
describe('LoginUseCase - Unit Tests (Business Logic)', () => {
  let useCase: LoginUseCase
  let usersRepository: jest.Mocked<IUsersRepository>
  let passwordHashService: jest.Mocked<PasswordHashService>
  let tokensService: jest.Mocked<TokensService>
  let loginRateLimitPolicy: jest.Mocked<LoginRateLimitPolicy>

  // Test data
  const mockUser: UserEntity = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed-password',
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

  const loginDto: LoginDto = {
    usernameOrEmail: 'test@example.com',
    password: 'Plain123!',
  }

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  }

  beforeEach(async () => {
    // Create mocks
    const mockUsersRepository = {
      findByUsernameOrEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    }

    const mockPasswordHashService = {
      hash: jest.fn(),
      verify: jest.fn(),
    }

    const mockTokensService = {
      generateTokenPair: jest.fn(),
      validateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    }

    const mockLoginRateLimitPolicy = {
      checkLimits: jest.fn(),
      incrementAttempts: jest.fn(),
      resetAttempts: jest.fn(),
    }

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: USERS_REPOSITORY,
          useValue: mockUsersRepository,
        },
        {
          provide: PasswordHashService,
          useValue: mockPasswordHashService,
        },
        {
          provide: TokensService,
          useValue: mockTokensService,
        },
        {
          provide: LoginRateLimitPolicy,
          useValue: mockLoginRateLimitPolicy,
        },
      ],
    }).compile()

    useCase = module.get<LoginUseCase>(LoginUseCase)
    usersRepository = module.get(USERS_REPOSITORY)
    passwordHashService = module.get(PasswordHashService)
    tokensService = module.get(TokensService)
    loginRateLimitPolicy = module.get(LoginRateLimitPolicy)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('execute() - Successful Login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      const result = await useCase.execute(loginDto, '127.0.0.1')

      // Assert
      expect(result).toEqual({
        response: {
          accessToken: mockTokens.accessToken,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            fullName: mockUser.fullName,
            roles: mockUser.roles,
            organizationId: mockUser.organizationId,
            status: mockUser.status,
          },
        },
        refreshToken: mockTokens.refreshToken,
      })

      // Verify rate limiting was checked
      expect(loginRateLimitPolicy.checkLimits).toHaveBeenCalledWith(
        '127.0.0.1',
        loginDto.usernameOrEmail,
      )

      // Verify user was searched
      expect(
        usersRepository.findByUsernameOrEmailWithPassword,
      ).toHaveBeenCalledWith(loginDto.usernameOrEmail)

      // Verify password was verified
      expect(passwordHashService.verify).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      )

      // Verify tokens were generated
      expect(tokensService.generateTokenPair).toHaveBeenCalledWith(mockUser)

      // Verify rate limit counters were reset on success
      expect(loginRateLimitPolicy.resetAttempts).toHaveBeenCalledWith(
        '127.0.0.1',
        loginDto.usernameOrEmail,
      )
    })

    it('should not include password in response', async () => {
      // Arrange
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      const result = await useCase.execute(loginDto, '127.0.0.1')

      // Assert - Password should NOT be in response
      expect(result.response.user).not.toHaveProperty('password')
    })
  })

  describe('execute() - Failed Login Scenarios', () => {
    it('should fail when user does not exist', async () => {
      // Arrange
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(null)

      // Act & Assert
      await expect(
        useCase.execute(loginDto, '127.0.0.1'),
      ).rejects.toThrow(InvalidCredentialsException)

      // Verify rate limit counter was incremented
      expect(loginRateLimitPolicy.incrementAttempts).toHaveBeenCalledWith(
        '127.0.0.1',
        loginDto.usernameOrEmail,
      )

      // Verify tokens were NOT generated
      expect(tokensService.generateTokenPair).not.toHaveBeenCalled()
    })

    it('should fail when password is incorrect', async () => {
      // Arrange
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(false) // Invalid password

      // Act & Assert
      await expect(
        useCase.execute(loginDto, '127.0.0.1'),
      ).rejects.toThrow(InvalidCredentialsException)

      // Verify rate limit counter was incremented
      expect(loginRateLimitPolicy.incrementAttempts).toHaveBeenCalledWith(
        '127.0.0.1',
        loginDto.usernameOrEmail,
      )

      // Verify tokens were NOT generated
      expect(tokensService.generateTokenPair).not.toHaveBeenCalled()
    })

    it('should fail when user is not active', async () => {
      // Arrange
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      }
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        inactiveUser,
      )
      passwordHashService.verify.mockResolvedValue(true)

      // Act & Assert
      await expect(
        useCase.execute(loginDto, '127.0.0.1'),
      ).rejects.toThrow(UserNotActiveException)

      // Verify tokens were NOT generated
      expect(tokensService.generateTokenPair).not.toHaveBeenCalled()

      // Verify counters were NOT incremented (user exists and password is valid)
      expect(loginRateLimitPolicy.incrementAttempts).not.toHaveBeenCalled()
    })

    it('should fail when user is suspended', async () => {
      // Arrange
      const suspendedUser = {
        ...mockUser,
        status: UserStatus.SUSPENDED,
      }
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        suspendedUser,
      )
      passwordHashService.verify.mockResolvedValue(true)

      // Act & Assert
      await expect(
        useCase.execute(loginDto, '127.0.0.1'),
      ).rejects.toThrow(UserNotActiveException)
    })
  })

  describe('execute() - Rate Limiting', () => {
    it('should fail when rate limit is exceeded', async () => {
      // Arrange - Rate limit policy throws error
      const rateLimitError = new Error('Too many attempts')
      loginRateLimitPolicy.checkLimits.mockRejectedValue(rateLimitError)

      // Act & Assert
      await expect(
        useCase.execute(loginDto, '127.0.0.1'),
      ).rejects.toThrow(rateLimitError)

      // Verify NO other operations were performed
      expect(
        usersRepository.findByUsernameOrEmailWithPassword,
      ).not.toHaveBeenCalled()
      expect(passwordHashService.verify).not.toHaveBeenCalled()
      expect(tokensService.generateTokenPair).not.toHaveBeenCalled()
    })

    it('should check rate limits BEFORE validating credentials', async () => {
      // Arrange
      const callOrder: string[] = []

      loginRateLimitPolicy.checkLimits.mockImplementation(async () => {
        callOrder.push('checkLimits')
      })

      usersRepository.findByUsernameOrEmailWithPassword.mockImplementation(
        async () => {
          callOrder.push('findUser')
          return mockUser
        },
      )

      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      await useCase.execute(loginDto, '127.0.0.1')

      // Assert - Rate limiting should be checked FIRST
      expect(callOrder).toEqual(['checkLimits', 'findUser'])
    })
  })

  describe('execute() - Edge Cases', () => {
    it('should handle login with username (not email)', async () => {
      // Arrange
      const dtoWithUsername: LoginDto = {
        usernameOrEmail: 'testuser',
        password: 'Plain123!',
      }

      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      const result = await useCase.execute(dtoWithUsername, '127.0.0.1')

      // Assert
      expect(result.response.accessToken).toBe(mockTokens.accessToken)
      expect(
        usersRepository.findByUsernameOrEmailWithPassword,
      ).toHaveBeenCalledWith('testuser')
    })

    it('should handle different IP addresses correctly', async () => {
      // Arrange
      const ipAddress = '192.168.1.100'
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      await useCase.execute(loginDto, ipAddress)

      // Assert - IP should be passed to rate limiting
      expect(loginRateLimitPolicy.checkLimits).toHaveBeenCalledWith(
        ipAddress,
        loginDto.usernameOrEmail,
      )
      expect(loginRateLimitPolicy.resetAttempts).toHaveBeenCalledWith(
        ipAddress,
        loginDto.usernameOrEmail,
      )
    })
  })

  describe('execute() - Token Generation', () => {
    it('should return both access and refresh tokens', async () => {
      // Arrange
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      const result = await useCase.execute(loginDto, '127.0.0.1')

      // Assert
      expect(result.response.accessToken).toBe(mockTokens.accessToken)
      expect(result.refreshToken).toBe(mockTokens.refreshToken)
    })

    it('should include user information in response', async () => {
      // Arrange
      loginRateLimitPolicy.checkLimits.mockResolvedValue(undefined)
      usersRepository.findByUsernameOrEmailWithPassword.mockResolvedValue(
        mockUser,
      )
      passwordHashService.verify.mockResolvedValue(true)
      tokensService.generateTokenPair.mockResolvedValue(mockTokens)

      // Act
      const result = await useCase.execute(loginDto, '127.0.0.1')

      // Assert - User info should match
      expect(result.response.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        fullName: mockUser.fullName,
        roles: mockUser.roles,
        organizationId: mockUser.organizationId,
        status: mockUser.status,
      })
    })
  })
})
