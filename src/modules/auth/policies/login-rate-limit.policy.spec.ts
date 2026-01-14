import { Test, TestingModule } from '@nestjs/testing'
import { LoginRateLimitPolicy } from './login-rate-limit.policy'
import { RateLimitService } from '@core/security'
import { CACHE_KEYS } from '@core/cache'
import { TooManyAttemptsException } from '../exceptions'

/**
 * UNIT TESTS - LoginRateLimitPolicy (Rate Limiting Logic)
 *
 * Enfoque:
 * - RateLimitService está mockeado
 * - Solo se prueba la lógica de la policy
 *
 * Escenarios cubiertos:
 * 1. Verificación de límites por IP
 * 2. Verificación de límites por usuario
 * 3. Incremento de contadores en intentos fallidos
 * 4. Reset de contadores en login exitoso
 * 5. Normalización de usernames/emails
 * 6. Manejo de tiempo restante hasta reset
 */
describe('LoginRateLimitPolicy - Unit Tests (Rate Limiting Logic)', () => {
  let policy: LoginRateLimitPolicy
  let rateLimitService: jest.Mocked<RateLimitService>

  const mockIp = '192.168.1.100'
  const mockEmail = 'test@example.com'
  const mockUsername = 'testuser'

  beforeEach(async () => {
    // Create mock
    const mockRateLimitService = {
      checkLimit: jest.fn(),
      incrementAttempts: jest.fn(),
      resetAttempts: jest.fn(),
      getTimeUntilReset: jest.fn(),
    }

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginRateLimitPolicy,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile()

    policy = module.get<LoginRateLimitPolicy>(LoginRateLimitPolicy)
    rateLimitService = module.get(RateLimitService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('checkLimits() - Combined IP and User Limits', () => {
    it('should pass when both IP and user limits are not exceeded', async () => {
      // Arrange - Both limits OK
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act & Assert - Should not throw
      await expect(
        policy.checkLimits(mockIp, mockEmail),
      ).resolves.toBeUndefined()

      // Verify both limits were checked
      expect(rateLimitService.checkLimit).toHaveBeenCalledTimes(2)

      // Verify IP limit check
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_IP(mockIp),
        10, // maxAttemptsByIp
        15, // windowMinutes
      )

      // Verify user limit check
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(mockEmail.toLowerCase()),
        5, // maxAttemptsByUser
        15, // windowMinutes
      )
    })

    it('should check IP limit BEFORE user limit', async () => {
      // Arrange
      const checkIpSpy = jest.spyOn(policy, 'checkIpLimit')
      const checkUserSpy = jest.spyOn(policy, 'checkUserLimit')

      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkLimits(mockIp, mockEmail)

      // Assert - Both limits should be checked
      expect(checkIpSpy).toHaveBeenCalledWith(mockIp)
      expect(checkUserSpy).toHaveBeenCalledWith(mockEmail)

      // Verify IP check happens first by checking call order
      const ipCallOrder = checkIpSpy.mock.invocationCallOrder[0]
      const userCallOrder = checkUserSpy.mock.invocationCallOrder[0]
      expect(ipCallOrder).toBeLessThan(userCallOrder)

      checkIpSpy.mockRestore()
      checkUserSpy.mockRestore()
    })
  })

  describe('checkIpLimit() - IP Rate Limiting', () => {
    it('should pass when IP limit is not exceeded', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act & Assert
      await expect(policy.checkIpLimit(mockIp)).resolves.toBeUndefined()

      // Verify correct parameters
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_IP(mockIp),
        10,
        15,
      )
    })

    it('should throw TooManyAttemptsException when IP limit is exceeded', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(false) // Limit exceeded
      rateLimitService.getTimeUntilReset.mockResolvedValue(300) // 5 minutes in seconds

      // Act & Assert
      await expect(policy.checkIpLimit(mockIp)).rejects.toThrow(
        TooManyAttemptsException,
      )

      // Verify error message includes time remaining
      await expect(policy.checkIpLimit(mockIp)).rejects.toThrow(
        /Intenta de nuevo en \d+ minutos/,
      )
    })

    it('should calculate minutes correctly from seconds', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(false)
      rateLimitService.getTimeUntilReset.mockResolvedValue(660) // 11 minutes

      // Act
      try {
        await policy.checkIpLimit(mockIp)
        fail('Should have thrown')
      } catch (error) {
        // Assert - 660 seconds = 11 minutes
        expect(error.message).toContain('11 minutos')
      }
    })

    it('should round up partial minutes', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(false)
      rateLimitService.getTimeUntilReset.mockResolvedValue(90) // 1.5 minutes

      // Act
      try {
        await policy.checkIpLimit(mockIp)
        fail('Should have thrown')
      } catch (error) {
        // Assert - 90 seconds should round up to 2 minutes
        expect(error.message).toContain('2 minutos')
      }
    })
  })

  describe('checkUserLimit() - User Rate Limiting', () => {
    it('should pass when user limit is not exceeded', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act & Assert
      await expect(policy.checkUserLimit(mockEmail)).resolves.toBeUndefined()

      // Verify correct parameters
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(mockEmail.toLowerCase()),
        5,
        15,
      )
    })

    it('should throw TooManyAttemptsException when user limit is exceeded', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(false)
      rateLimitService.getTimeUntilReset.mockResolvedValue(600) // 10 minutes

      // Act & Assert
      await expect(policy.checkUserLimit(mockEmail)).rejects.toThrow(
        TooManyAttemptsException,
      )

      // Verify error message is user-specific
      await expect(policy.checkUserLimit(mockEmail)).rejects.toThrow(
        /Demasiados intentos fallidos para este usuario/,
      )
    })

    it('should normalize email to lowercase', async () => {
      // Arrange
      const mixedCaseEmail = 'Test@EXAMPLE.COM'
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkUserLimit(mixedCaseEmail)

      // Assert - Email should be normalized to lowercase
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER('test@example.com'),
        5,
        15,
      )
    })

    it('should normalize username to lowercase', async () => {
      // Arrange
      const mixedCaseUsername = 'TestUser'
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkUserLimit(mixedCaseUsername)

      // Assert - Username should be normalized to lowercase
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER('testuser'),
        5,
        15,
      )
    })
  })

  describe('incrementAttempts() - Increment Failed Login Counters', () => {
    it('should increment both IP and user counters', async () => {
      // Arrange
      rateLimitService.incrementAttempts.mockResolvedValue(undefined)

      // Act
      await policy.incrementAttempts(mockIp, mockEmail)

      // Assert - Both counters should be incremented
      expect(rateLimitService.incrementAttempts).toHaveBeenCalledTimes(2)

      // Verify IP counter
      expect(rateLimitService.incrementAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_IP(mockIp),
        15,
      )

      // Verify user counter
      expect(rateLimitService.incrementAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(mockEmail.toLowerCase()),
        15,
      )
    })

    it('should increment counters in parallel', async () => {
      // Arrange
      const incrementSpy = jest.spyOn(Promise, 'all')
      rateLimitService.incrementAttempts.mockResolvedValue(undefined)

      // Act
      await policy.incrementAttempts(mockIp, mockEmail)

      // Assert - Promise.all should be called (parallel execution)
      expect(incrementSpy).toHaveBeenCalled()

      incrementSpy.mockRestore()
    })

    it('should normalize user identifier when incrementing', async () => {
      // Arrange
      const mixedCaseEmail = 'Test@EXAMPLE.COM'
      rateLimitService.incrementAttempts.mockResolvedValue(undefined)

      // Act
      await policy.incrementAttempts(mockIp, mixedCaseEmail)

      // Assert - Email should be normalized
      expect(rateLimitService.incrementAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER('test@example.com'),
        15,
      )
    })

    it('should handle username (not email) correctly', async () => {
      // Arrange
      rateLimitService.incrementAttempts.mockResolvedValue(undefined)

      // Act
      await policy.incrementAttempts(mockIp, mockUsername)

      // Assert
      expect(rateLimitService.incrementAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(mockUsername.toLowerCase()),
        15,
      )
    })
  })

  describe('resetAttempts() - Reset Counters on Success', () => {
    it('should reset both IP and user counters', async () => {
      // Arrange
      rateLimitService.resetAttempts.mockResolvedValue(undefined)

      // Act
      await policy.resetAttempts(mockIp, mockEmail)

      // Assert - Both counters should be reset
      expect(rateLimitService.resetAttempts).toHaveBeenCalledTimes(2)

      // Verify IP counter reset
      expect(rateLimitService.resetAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_IP(mockIp),
      )

      // Verify user counter reset
      expect(rateLimitService.resetAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(mockEmail.toLowerCase()),
      )
    })

    it('should reset counters in parallel', async () => {
      // Arrange
      const resetSpy = jest.spyOn(Promise, 'all')
      rateLimitService.resetAttempts.mockResolvedValue(undefined)

      // Act
      await policy.resetAttempts(mockIp, mockEmail)

      // Assert - Promise.all should be called
      expect(resetSpy).toHaveBeenCalled()

      resetSpy.mockRestore()
    })

    it('should normalize user identifier when resetting', async () => {
      // Arrange
      const mixedCaseEmail = 'Test@EXAMPLE.COM'
      rateLimitService.resetAttempts.mockResolvedValue(undefined)

      // Act
      await policy.resetAttempts(mockIp, mixedCaseEmail)

      // Assert - Email should be normalized
      expect(rateLimitService.resetAttempts).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER('test@example.com'),
      )
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle Redis errors gracefully', async () => {
      // Arrange
      rateLimitService.checkLimit.mockRejectedValue(
        new Error('Redis connection failed'),
      )

      // Act & Assert - Error should propagate
      await expect(policy.checkIpLimit(mockIp)).rejects.toThrow(
        'Redis connection failed',
      )
    })

    it('should handle empty email/username', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkUserLimit('')

      // Assert - Should still normalize (empty string)
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(''),
        5,
        15,
      )
    })

    it('should handle special characters in email', async () => {
      // Arrange
      const specialEmail = 'test+special@example.com'
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkUserLimit(specialEmail)

      // Assert - Should normalize correctly
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_USER(specialEmail.toLowerCase()),
        5,
        15,
      )
    })

    it('should handle IPv6 addresses', async () => {
      // Arrange
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkIpLimit(ipv6)

      // Assert
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        CACHE_KEYS.LOGIN_ATTEMPTS_IP(ipv6),
        10,
        15,
      )
    })
  })

  describe('Integration with Configuration', () => {
    it('should use correct max attempts configuration', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkLimits(mockIp, mockEmail)

      // Assert - Verify configuration values
      const ipCall = rateLimitService.checkLimit.mock.calls.find((call) =>
        call[0].includes('ip'),
      )
      const userCall = rateLimitService.checkLimit.mock.calls.find((call) =>
        call[0].includes('user'),
      )

      expect(ipCall?.[1]).toBe(10) // maxAttemptsByIp
      expect(userCall?.[1]).toBe(5) // maxAttemptsByUser
    })

    it('should use correct window time configuration', async () => {
      // Arrange
      rateLimitService.checkLimit.mockResolvedValue(true)

      // Act
      await policy.checkLimits(mockIp, mockEmail)

      // Assert - Both should use 15 minute window
      expect(rateLimitService.checkLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        15, // windowMinutes
      )
    })
  })
})
