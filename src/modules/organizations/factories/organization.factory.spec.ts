import { OrganizationFactory } from './organization.factory'
import { CreateOrganizationDto, UpdateOrganizationDto } from '../dtos'
import { OrganizationEntity } from '../entities/organization.entity'

/**
 * ✅ EJEMPLO DE TEST UNITARIO PURO (SIN MOCKS)
 *
 * Factory tiene lógica pura (transformaciones, normalizaciones)
 * No necesita mocks porque no tiene dependencias externas
 */
describe('OrganizationFactory', () => {
  let factory: OrganizationFactory

  beforeEach(() => {
    factory = new OrganizationFactory() // ✅ Instancia real, sin mocks
  })

  describe('createFromDto', () => {
    it('should create organization entity with normalized data', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: '  test   organization  ', // Espacios extra
        nit: '123 456 789',
        description: '  Test description  ',
        address: 'Test address',
        phone: '1234567',
        email: 'TEST@test.com', // Mayúsculas
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert - Verificar normalizaciones
      expect(result).toBeInstanceOf(OrganizationEntity)
      expect(result.name).toBe('Test Organization') // ✅ Capitalizado
      expect(result.nit).toBe('123456789') // ✅ Sin espacios
      expect(result.email).toBe('test@test.com') // ✅ Lowercase
      expect(result.description).toBe('Test description') // ✅ Trimmed
      expect(result.isActive).toBe(true) // ✅ Default value
      expect(result.logoUrl).toBeNull() // ✅ Default value
    })

    it('should normalize name by capitalizing each word', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'empresa de auditoría TEST',
        nit: '123456789',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.name).toBe('Empresa De Auditoría Test')
    })

    it('should normalize NIT by removing spaces and non-alphanumeric chars', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Test Org',
        nit: '123-456  789@#', // Espacios, guiones, caracteres especiales
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.nit).toBe('123-456789') // Mantiene guiones, elimina espacios y @#
    })

    it('should normalize NIT to uppercase', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Test Org',
        nit: '123abc-xyz',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.nit).toBe('123ABC-XYZ')
    })

    it('should handle empty optional fields', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Test Org',
        nit: '123456789',
        description: '',
        address: '',
        phone: '',
        email: '',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.description).toBeNull()
      expect(result.address).toBeNull()
      expect(result.phone).toBeNull()
      expect(result.email).toBeNull()
    })

    it('should trim all string fields', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: '  Test Org  ',
        nit: '  123456789  ',
        description: '  Test description  ',
        address: '  Test address  ',
        phone: '  1234567  ',
        email: '  test@test.com  ',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.name).toBe('Test Org')
      expect(result.nit).toBe('123456789')
      expect(result.description).toBe('Test description')
      expect(result.address).toBe('Test address')
      expect(result.phone).toBe('1234567')
      expect(result.email).toBe('test@test.com')
    })
  })

  describe('updateFromDto', () => {
    let existingOrg: OrganizationEntity

    beforeEach(() => {
      // Organización existente
      existingOrg = {
        id: '1',
        name: 'Original Name',
        nit: '123456789',
        description: 'Original description',
        address: 'Original address',
        phone: '1234567',
        email: 'original@test.com',
        logoUrl: 'logo.png',
        isActive: true,
      } as OrganizationEntity
    })

    it('should update only provided fields', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        name: 'Updated Name',
        description: 'Updated description',
      }

      // Act
      const result = factory.updateFromDto(existingOrg, dto)

      // Assert
      expect(result).toBe(existingOrg) // ✅ Misma referencia (mutación)
      expect(result.name).toBe('Updated Name')
      expect(result.description).toBe('Updated description')
      // Campos no proporcionados NO deben cambiar
      expect(result.nit).toBe('123456789')
      expect(result.address).toBe('Original address')
      expect(result.phone).toBe('1234567')
      expect(result.email).toBe('original@test.com')
    })

    it('should normalize updated name', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        name: '  updated   name  ',
      }

      // Act
      const result = factory.updateFromDto(existingOrg, dto)

      // Assert
      expect(result.name).toBe('Updated Name')
    })

    it('should normalize updated NIT', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        nit: '999-888  777',
      }

      // Act
      const result = factory.updateFromDto(existingOrg, dto)

      // Assert
      expect(result.nit).toBe('999-888777')
    })

    it('should normalize updated email to lowercase', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        email: 'UPDATED@TEST.COM',
      }

      // Act
      const result = factory.updateFromDto(existingOrg, dto)

      // Assert
      expect(result.email).toBe('updated@test.com')
    })

    it('should handle empty strings by setting to null', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        description: '',
        address: '',
      }

      // Act
      const result = factory.updateFromDto(existingOrg, dto)

      // Assert
      expect(result.description).toBeNull()
      expect(result.address).toBeNull()
    })

    it('should not modify fields not present in DTO', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        phone: '9999999',
      }

      // Act
      factory.updateFromDto(existingOrg, dto)

      // Assert - Otros campos deben mantenerse igual
      expect(existingOrg.name).toBe('Original Name')
      expect(existingOrg.nit).toBe('123456789')
      expect(existingOrg.description).toBe('Original description')
      expect(existingOrg.email).toBe('original@test.com')
      expect(existingOrg.phone).toBe('9999999') // Solo este cambió
    })

    it('should handle updating multiple fields at once', () => {
      // Arrange
      const dto: UpdateOrganizationDto = {
        name: 'new name',
        nit: '999-888-777',
        description: '  new description  ',
        email: 'NEW@TEST.COM',
      }

      // Act
      const result = factory.updateFromDto(existingOrg, dto)

      // Assert
      expect(result.name).toBe('New Name')
      expect(result.nit).toBe('999-888-777')
      expect(result.description).toBe('new description')
      expect(result.email).toBe('new@test.com')
    })
  })

  describe('Edge Cases', () => {
    it('should handle name with multiple consecutive spaces', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'empresa     de     auditoría',
        nit: '123',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.name).toBe('Empresa De Auditoría')
    })

    it('should handle NIT with only special characters', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Test',
        nit: '@#$%^&*()',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.nit).toBe('') // Todos los caracteres removidos
    })

    it('should handle email with spaces', () => {
      // Arrange
      const dto: CreateOrganizationDto = {
        name: 'Test',
        nit: '123',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: '  test@test.com  ',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.email).toBe('test@test.com')
    })

    it('should handle very long names', () => {
      // Arrange
      const longName = 'empresa '.repeat(50) + 'test'
      const dto: CreateOrganizationDto = {
        name: longName,
        nit: '123',
        description: 'Test',
        address: 'Test',
        phone: '123',
        email: 'test@test.com',
      }

      // Act
      const result = factory.createFromDto(dto)

      // Assert
      expect(result.name).toContain('Empresa')
      expect(result.name.split(' ').length).toBe(51) // 50 'empresa' + 1 'test'
    })
  })
})
