import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { DataSource } from 'typeorm'

/**
 * ✅ E2E TESTS - Organizations Controller
 *
 * Testing approach:
 * - Prueba el flujo HTTP completo (request → controller → service → repository → DB)
 * - Valida DTOs con class-validator
 * - Verifica guards, pipes, interceptors, filters
 * - Usa base de datos real (configurable para test DB)
 *
 * Setup:
 * - Antes de los tests: Limpia y prepara la DB
 * - Después de los tests: Limpia la DB
 * - Cada test es independiente
 */
describe('OrganizationsController (E2E)', () => {
  let app: INestApplication
  let dataSource: DataSource

  // IDs creados durante los tests (para cleanup)
  const createdIds: string[] = []

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    // Aplicar el mismo ValidationPipe que en la app real
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()

    // Get DataSource para cleanup
    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    // Cleanup: Eliminar organizaciones creadas durante los tests
    if (createdIds.length > 0) {
      await dataSource.query(`DELETE FROM organizations WHERE id = ANY($1)`, [
        createdIds,
      ])
    }

    await app.close()
  })

  describe('POST /organizations', () => {
    it('should create a new organization with valid data', async () => {
      // Arrange
      const createDto = {
        name: 'Test Organization E2E',
        nit: '9999999999',
        description: 'E2E Test Description',
        address: 'Test Address 123',
        phone: '71234567',
        email: 'test-e2e@organization.com',
      }

      // Act
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Test Organization E2E',
        nit: '9999999999',
        email: 'test-e2e@organization.com',
        isActive: true,
      })
      expect(response.body.createdAt).toBeDefined()
      expect(response.body.updatedAt).toBeDefined()

      // Guardar ID para cleanup
      createdIds.push(response.body.id)
    })

    it('should normalize name and email with factory', async () => {
      // Arrange - Datos con formato incorrecto
      const createDto = {
        name: 'test organization lowercase', // lowercase
        nit: '8888888888',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'TEST-UPPERCASE@TEST.COM', // UPPERCASE
      }

      // Act
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      // Assert - Factory normalizó correctamente
      expect(response.body.name).toBe('Test Organization Lowercase') // Title Case
      expect(response.body.email).toBe('test-uppercase@test.com') // lowercase

      createdIds.push(response.body.id)
    })

    it('should return 400 when required fields are missing', async () => {
      // Arrange - Sin campos requeridos
      const invalidDto = {
        description: 'Test',
      }

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(invalidDto)
        .expect(400)

      expect(response.body.message).toContain('name')
      expect(response.body.message).toContain('nit')
    })

    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const invalidDto = {
        name: 'Test Org',
        nit: '7777777777',
        email: 'invalid-email', // ❌ Email inválido
      }

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(invalidDto)
        .expect(400)

      expect(response.body.message).toContain('email')
    })

    it('should return 409 when organization name already exists', async () => {
      // Arrange - Crear primera organización
      const createDto = {
        name: 'Duplicate Name Organization',
        nit: '6666666666',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'unique1@test.com',
      }

      const firstResponse = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      createdIds.push(firstResponse.body.id)

      // Act - Intentar crear con el mismo nombre
      const duplicateDto = {
        ...createDto,
        nit: '5555555555', // NIT diferente
        email: 'unique2@test.com', // Email diferente
      }

      // Assert
      await request(app.getHttpServer())
        .post('/organizations')
        .send(duplicateDto)
        .expect(409)
    })

    it('should return 409 when organization NIT already exists', async () => {
      // Arrange - Crear primera organización
      const createDto = {
        name: 'Organization With Unique NIT',
        nit: '4444444444',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'unique-nit@test.com',
      }

      const firstResponse = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      createdIds.push(firstResponse.body.id)

      // Act - Intentar crear con el mismo NIT
      const duplicateDto = {
        name: 'Different Name',
        nit: '4444444444', // ❌ NIT duplicado
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'different@test.com',
      }

      // Assert
      await request(app.getHttpServer())
        .post('/organizations')
        .send(duplicateDto)
        .expect(409)
    })
  })

  describe('GET /organizations', () => {
    let testOrgId: string

    beforeAll(async () => {
      // Crear organización para tests de GET
      const createDto = {
        name: 'Organization For GET Tests',
        nit: '3333333333',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'get-test@test.com',
      }

      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      testOrgId = response.body.id
      createdIds.push(testOrgId)
    })

    it('should return paginated organizations', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/organizations')
        .query({ page: 1, limit: 10 })
        .expect(200)

      // Assert
      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('meta')
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
        hasNextPage: expect.any(Boolean),
        hasPrevPage: false,
      })
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('should return all organizations when all=true', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get('/organizations')
        .query({ all: true })
        .expect(200)

      // Assert
      expect(response.body).toHaveProperty('data')
      expect(Array.isArray(response.body.data)).toBe(true)
      // No debe tener meta de paginación cuando all=true
      expect(response.body.meta).toMatchObject({
        all: true,
        total: expect.any(Number),
      })
    })

    it('should filter organizations by search query', async () => {
      // Act - Buscar por nombre
      const response = await request(app.getHttpServer())
        .get('/organizations')
        .query({ search: 'Organization For GET Tests' })
        .expect(200)

      // Assert
      expect(response.body.data.length).toBeGreaterThan(0)
      expect(response.body.data[0].name).toContain('Organization For GET Tests')
    })
  })

  describe('GET /organizations/:id', () => {
    let testOrgId: string

    beforeAll(async () => {
      // Crear organización para test de GET by ID
      const createDto = {
        name: 'Organization For GET By ID',
        nit: '2222222222',
        description: 'Test',
        address: 'Test',
        phone: '71111111',
        email: 'get-by-id@test.com',
      }

      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      testOrgId = response.body.id
      createdIds.push(testOrgId)
    })

    it('should return organization by id', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .get(`/organizations/${testOrgId}`)
        .expect(200)

      // Assert
      expect(response.body).toMatchObject({
        id: testOrgId,
        name: 'Organization For GET By ID',
        nit: '2222222222',
      })
    })

    it('should return 404 when organization not found', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .get('/organizations/nonexistent-id-12345')
        .expect(404)
    })
  })

  describe('PATCH /organizations/:id', () => {
    let testOrgId: string

    beforeAll(async () => {
      // Crear organización para test de PATCH
      const createDto = {
        name: 'Organization For PATCH',
        nit: '1111111111',
        description: 'Original Description',
        address: 'Original Address',
        phone: '71111111',
        email: 'patch@test.com',
      }

      const response = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      testOrgId = response.body.id
      createdIds.push(testOrgId)
    })

    it('should update organization successfully', async () => {
      // Arrange
      const updateDto = {
        name: 'Updated Organization Name',
        description: 'Updated Description',
      }

      // Act
      const response = await request(app.getHttpServer())
        .patch(`/organizations/${testOrgId}`)
        .send(updateDto)
        .expect(200)

      // Assert
      expect(response.body).toMatchObject({
        id: testOrgId,
        name: 'Updated Organization Name',
        description: 'Updated Description',
        nit: '1111111111', // No cambió
      })
    })

    it('should return 404 when updating nonexistent organization', async () => {
      // Arrange
      const updateDto = {
        name: 'Updated Name',
      }

      // Act & Assert
      await request(app.getHttpServer())
        .patch('/organizations/nonexistent-id-99999')
        .send(updateDto)
        .expect(404)
    })
  })

  describe('DELETE /organizations/:id', () => {
    it('should soft delete organization when no active users', async () => {
      // Arrange - Crear organización para eliminar
      const createDto = {
        name: 'Organization To Delete',
        nit: '0000000000',
        description: 'Will be deleted',
        address: 'Test',
        phone: '71111111',
        email: 'to-delete@test.com',
      }

      const createResponse = await request(app.getHttpServer())
        .post('/organizations')
        .send(createDto)
        .expect(201)

      const orgId = createResponse.body.id
      createdIds.push(orgId)

      // Act - Eliminar
      await request(app.getHttpServer())
        .delete(`/organizations/${orgId}`)
        .expect(204)

      // Assert - Verificar que ya no se puede obtener (soft deleted)
      await request(app.getHttpServer())
        .get(`/organizations/${orgId}`)
        .expect(404)
    })

    it('should return 404 when deleting nonexistent organization', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .delete('/organizations/nonexistent-id-88888')
        .expect(404)
    })
  })
})
