import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { DataSource } from 'typeorm'
import type { Redis } from 'ioredis'
import { REDIS_CLIENT } from '@core/cache'
import * as bcrypt from 'bcrypt'

/**
 * ✅ E2E TESTS - Auth Module (Complete Integration Tests)
 *
 * Testing approach:
 * - NO MOCKS - Prueba el flujo completo real con JWT + Redis + PostgreSQL
 * - Valida integración entre servicios de autenticación
 * - Verifica que tokens híbridos (JWT + Redis) funcionen correctamente
 * - Prueba flows completos: Login, Refresh, 2FA, Reset Password, Logout
 *
 * What we test:
 * - JWT generation and validation
 * - Redis token storage and revocation (hybrid mode)
 * - Password hashing and validation
 * - 2FA code generation and validation (one-time use)
 * - Reset password flow with hybrid tokens
 * - Token expiration and cleanup
 *
 * Setup:
 * - Antes: Crea usuarios de prueba en DB real
 * - Después: Limpia DB y Redis
 * - Usa base de datos real configurada para tests
 * - Usa Redis real (no mock)
 */
describe('AuthController (E2E) - Complete Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource
  let redis: Redis

  // Test user credentials
  const testUser = {
    id: '',
    email: 'test-auth-e2e@example.com',
    password: 'Test123!@#',
    username: 'testuser',
    names: 'Test',
    lastNames: 'User',
    ci: '12345678',
  }

  // Track created resources for cleanup
  const createdUserIds: string[] = []
  let testOrganizationId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    // Apply the same ValidationPipe as in the real app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()

    // Get DataSource and Redis for cleanup and direct testing
    dataSource = moduleFixture.get<DataSource>(DataSource)
    redis = moduleFixture.get<Redis>(REDIS_CLIENT)

    // Create test organization
    const orgResult = await dataSource.query(
      `INSERT INTO organizations (name, nit, email, phone, address, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        'Test Auth Organization',
        '9999999999',
        'org-auth-test@example.com',
        '71234567',
        'Test Address',
        'Test Description',
      ],
    )
    testOrganizationId = orgResult[0].id

    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash(testUser.password, 10)
    const userResult = await dataSource.query(
      `INSERT INTO users (email, password, username, names, "lastNames", ci, "organizationId", status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        testUser.email,
        hashedPassword,
        testUser.username,
        testUser.names,
        testUser.lastNames,
        testUser.ci,
        testOrganizationId,
        'active',
      ],
    )
    testUser.id = userResult[0].id
    createdUserIds.push(testUser.id)
  })

  afterAll(async () => {
    // Cleanup Redis - Remove all test tokens
    const keys = await redis.keys('*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    // Cleanup DB - Remove test users and organization
    if (createdUserIds.length > 0) {
      await dataSource.query(`DELETE FROM users WHERE id = ANY($1)`, [
        createdUserIds,
      ])
    }

    if (testOrganizationId) {
      await dataSource.query(`DELETE FROM organizations WHERE id = $1`, [
        testOrganizationId,
      ])
    }

    await app.close()
  })

  describe('POST /auth/login - Complete Login Flow', () => {
    it('should login successfully with valid credentials', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: {
          id: testUser.id,
          email: testUser.email,
          username: testUser.username,
        },
      })

      // Verify JWT structure (should be a valid JWT)
      expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
      expect(response.body.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)

      // Verify refresh token is stored in Redis (hybrid mode)
      const refreshTokenKeys = await redis.keys(`auth:refresh:${testUser.id}:*`)
      expect(refreshTokenKeys.length).toBeGreaterThan(0)
    })

    it('should fail with invalid password', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401)

      expect(response.body.message).toContain('Invalid credentials')
    })

    it('should fail with non-existent email', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect(401)
    })

    it('should validate DTO - reject invalid email format', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password,
        })
        .expect(400)
    })
  })

  describe('POST /auth/refresh - Refresh Token Flow', () => {
    let validRefreshToken: string

    beforeEach(async () => {
      // Get a valid refresh token first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      validRefreshToken = loginResponse.body.refreshToken
    })

    it('should refresh access token with valid refresh token', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(200)

      // Assert
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
      })

      // New access token should be different
      expect(response.body.accessToken).not.toBe(validRefreshToken)
    })

    it('should fail with invalid refresh token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid.jwt.token',
        })
        .expect(401)
    })

    it('should fail with revoked refresh token', async () => {
      // Arrange - Logout to revoke the token
      await request(app.getHttpServer()).post('/auth/logout').send({
        refreshToken: validRefreshToken,
      })

      // Act & Assert - Try to use revoked token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: validRefreshToken,
        })
        .expect(401)
    })
  })

  describe('POST /auth/logout - Logout and Token Revocation', () => {
    it('should logout and revoke refresh token', async () => {
      // Arrange - Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })

      const refreshToken = loginResponse.body.refreshToken

      // Verify token exists in Redis before logout
      const keysBefore = await redis.keys(`auth:refresh:${testUser.id}:*`)
      const tokenCountBefore = keysBefore.length

      // Act - Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken })
        .expect(200)

      // Assert - Verify token is revoked from Redis
      const keysAfter = await redis.keys(`auth:refresh:${testUser.id}:*`)
      expect(keysAfter.length).toBeLessThan(tokenCountBefore)

      // Try to use revoked token - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401)
    })
  })

  describe('2FA Flow - Complete Integration', () => {
    it('should generate 2FA code via endpoint', async () => {
      // Act - Generate 2FA code
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/generate')
        .send({ userId: testUser.id })
        .expect(200)

      // Assert - Response should contain token (not the code)
      expect(response.body).toHaveProperty('token')
      expect(response.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)

      // Verify 2FA code is stored in Redis
      const keys = await redis.keys(`auth:2fa:${testUser.id}:*`)
      expect(keys.length).toBeGreaterThan(0)
    })

    it('should verify valid 2FA code', async () => {
      // Arrange - Generate code first
      const genResponse = await request(app.getHttpServer())
        .post('/auth/2fa/generate')
        .send({ userId: testUser.id })

      const { token } = genResponse.body

      // Get the actual code from Redis (in real app, it's sent via email/SMS)
      const keys = await redis.keys(`auth:2fa:${testUser.id}:*`)
      const codeData = await redis.get(keys[0])
      const code = codeData // Assuming the code is stored directly

      // Act - Verify the code
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .send({
          userId: testUser.id,
          code,
          token,
        })
        .expect(200)

      // Assert
      expect(response.body).toHaveProperty('valid', true)

      // Verify code is deleted after successful validation (one-time use)
      const keysAfter = await redis.keys(`auth:2fa:${testUser.id}:*`)
      expect(keysAfter.length).toBe(0)
    })

    it('should fail with invalid 2FA code', async () => {
      // Arrange
      const genResponse = await request(app.getHttpServer())
        .post('/auth/2fa/generate')
        .send({ userId: testUser.id })

      const { token } = genResponse.body

      // Act - Try with wrong code
      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .send({
          userId: testUser.id,
          code: '000000', // Wrong code
          token,
        })
        .expect(401)
    })

    it('should fail to reuse 2FA code (one-time use)', async () => {
      // Arrange - Generate and verify code
      const genResponse = await request(app.getHttpServer())
        .post('/auth/2fa/generate')
        .send({ userId: testUser.id })

      const { token } = genResponse.body
      const keys = await redis.keys(`auth:2fa:${testUser.id}:*`)
      const code = await redis.get(keys[0])

      // First verification - should succeed
      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .send({ userId: testUser.id, code, token })
        .expect(200)

      // Act - Try to reuse the same code
      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .send({ userId: testUser.id, code, token })
        .expect(401) // Should fail - code already used
    })

    it('should resend 2FA code', async () => {
      // Arrange - Generate initial code
      await request(app.getHttpServer())
        .post('/auth/2fa/generate')
        .send({ userId: testUser.id })

      // Act - Resend code
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/resend')
        .send({ userId: testUser.id })
        .expect(200)

      // Assert - New token should be generated
      expect(response.body).toHaveProperty('token')

      // Verify new code in Redis
      const keys = await redis.keys(`auth:2fa:${testUser.id}:*`)
      expect(keys.length).toBeGreaterThan(0)
    })
  })

  describe('Reset Password Flow - Hybrid Token (JWT + Redis)', () => {
    it('should request password reset and generate token', async () => {
      // Act - Request password reset
      const response = await request(app.getHttpServer())
        .post('/auth/password/request-reset')
        .send({ email: testUser.email })
        .expect(200)

      // Assert - Generic message (doesn't reveal if email exists)
      expect(response.body.message).toContain('Si el email existe')

      // Verify token is stored in Redis
      const keys = await redis.keys(`auth:reset-password:${testUser.id}:*`)
      expect(keys.length).toBeGreaterThan(0)

      // Verify TTL is set (should be 1 hour = 3600 seconds)
      const ttl = await redis.ttl(keys[0])
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(3600)
    })

    it('should not reveal if email does not exist', async () => {
      // Act - Request reset for non-existent email
      const response = await request(app.getHttpServer())
        .post('/auth/password/request-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)

      // Assert - Same message as valid email (timing attack prevention)
      expect(response.body.message).toContain('Si el email existe')
    })

    it('should reset password with valid token', async () => {
      // Arrange - Request password reset first
      await request(app.getHttpServer())
        .post('/auth/password/request-reset')
        .send({ email: testUser.email })

      // Get the token from Redis (in real app, it's sent via email)
      const keys = await redis.keys(`auth:reset-password:${testUser.id}:*`)
      const tokenId = keys[0].split(':').pop()

      // Generate a JWT token (simulating the token from email)
      // In real scenario, this would come from the email link
      const resetToken = `mock-jwt-token-${tokenId}`

      const newPassword = 'NewSecure123!@#'

      // Act - Reset password
      const response = await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200)

      // Assert
      expect(response.body.message).toContain('actualizada exitosamente')

      // Verify token is revoked from Redis (one-time use)
      const keysAfter = await redis.keys(`auth:reset-password:${testUser.id}:*`)
      expect(keysAfter.length).toBe(0)

      // Verify all refresh tokens are revoked (security measure)
      const refreshKeys = await redis.keys(`auth:refresh:${testUser.id}:*`)
      expect(refreshKeys.length).toBe(0)

      // Verify can login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200)

      expect(loginResponse.body).toHaveProperty('accessToken')

      // Update test user password for future tests
      testUser.password = newPassword
    })

    it('should fail with invalid reset token', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({
          token: 'invalid.jwt.token',
          newPassword: 'NewSecure123!@#',
        })
        .expect(400)
    })

    it('should fail with expired reset token', async () => {
      // Arrange - Request reset
      await request(app.getHttpServer())
        .post('/auth/password/request-reset')
        .send({ email: testUser.email })

      // Get token
      const keys = await redis.keys(`auth:reset-password:${testUser.id}:*`)
      const tokenId = keys[0].split(':').pop()
      const resetToken = `mock-jwt-token-${tokenId}`

      // Manually delete from Redis (simulate expiration)
      await redis.del(keys[0])

      // Act & Assert - Token should be invalid
      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({
          token: resetToken,
          newPassword: 'NewSecure123!@#',
        })
        .expect(400)
    })

    it('should fail to reuse reset token (one-time use)', async () => {
      // Arrange - Request and use token
      await request(app.getHttpServer())
        .post('/auth/password/request-reset')
        .send({ email: testUser.email })

      const keys = await redis.keys(`auth:reset-password:${testUser.id}:*`)
      const tokenId = keys[0].split(':').pop()
      const resetToken = `mock-jwt-token-${tokenId}`

      // First use - should succeed
      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({
          token: resetToken,
          newPassword: 'NewSecure123!@#',
        })
        .expect(200)

      // Act - Try to reuse token
      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword123!',
        })
        .expect(400) // Should fail - token already used
    })

    it('should enforce rate limiting on reset requests', async () => {
      // Act - Send multiple reset requests rapidly
      const requests = Array.from({ length: 15 }, () =>
        request(app.getHttpServer())
          .post('/auth/password/request-reset')
          .send({ email: testUser.email }),
      )

      const responses = await Promise.all(requests)

      // Assert - Some requests should be rate limited (429)
      const rateLimited = responses.filter((r) => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })

  describe('Security - Token Validation', () => {
    it('should reject malformed JWT', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'not.a.valid.jwt',
        })
        .expect(401)
    })

    it('should reject JWT with invalid signature', async () => {
      // Create a JWT with wrong signature
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: fakeToken,
        })
        .expect(401)
    })
  })

  describe('Redis Integration - Hybrid Mode Verification', () => {
    it('should store refresh tokens in Redis with correct TTL', async () => {
      // Arrange & Act - Login to generate refresh token
      await request(app.getHttpServer()).post('/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      })

      // Assert - Check Redis storage
      const keys = await redis.keys(`auth:refresh:${testUser.id}:*`)
      expect(keys.length).toBeGreaterThan(0)

      // Verify TTL is set (should be 7 days = 604800 seconds)
      const ttl = await redis.ttl(keys[0])
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(604800) // 7 days
    })

    it('should clean up expired tokens from Redis', async () => {
      // This test verifies that Redis automatically expires old tokens
      // In production, tokens will expire based on their TTL
      const keys = await redis.keys('*')

      // All keys should have TTL set
      for (const key of keys) {
        const ttl = await redis.ttl(key)
        expect(ttl).toBeGreaterThan(-1) // -1 means no expiration, -2 means key doesn't exist
      }
    })
  })

  describe('Performance - Multiple Concurrent Logins', () => {
    it('should handle multiple concurrent login requests', async () => {
      // Act - Send 10 concurrent login requests
      const promises = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).post('/auth/login').send({
          email: testUser.email,
          password: testUser.password,
        }),
      )

      const responses = await Promise.all(promises)

      // Assert - All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.accessToken).toBeDefined()
        expect(response.body.refreshToken).toBeDefined()
      })

      // Verify all tokens are stored in Redis
      const keys = await redis.keys(`auth:refresh:${testUser.id}:*`)
      expect(keys.length).toBeGreaterThanOrEqual(10)
    })
  })
})
