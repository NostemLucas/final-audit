# ⚖️ Comparación Detallada: Query Directa vs PersistenceModule

## 📊 Resumen Ejecutivo

| Criterio | Query Directa (A) | PersistenceModule (B) |
|----------|-------------------|----------------------|
| **Complejidad** | ⭐⭐ Baja | ⭐⭐⭐ Media |
| **Mantenibilidad** | ⭐⭐⭐ Buena | ⭐⭐⭐⭐ Muy Buena |
| **Escalabilidad** | ⭐⭐⭐ Hasta 10 módulos | ⭐⭐⭐⭐⭐ Ilimitada |
| **Testing** | ⭐⭐⭐⭐ Simple | ⭐⭐⭐⭐ Simple |
| **Para tu proyecto** | ✅ **RECOMENDADO** | ✅ Si planeas crecer |

---

## 🎯 Casos de Uso Específicos

### 1️⃣ Validar existencia de un registro

**Escenario**: Validar que una organización existe antes de crear un usuario.

#### Opción A: Query Directa

```typescript
// users.repository.ts
async isOrganizationActive(organizationId: string): Promise<boolean> {
  const count = await this.getRepo()
    .createQueryBuilder()
    .from(OrganizationEntity, 'organization')
    .where('organization.id = :id', { id: organizationId })
    .andWhere('organization.isActive = :isActive', { isActive: true })
    .getCount()

  return count > 0
}

// user.validator.ts
async validateOrganizationExists(organizationId: string): Promise<void> {
  const exists = await this.usersRepository.isOrganizationActive(organizationId)
  if (!exists) {
    throw new OrganizationNotFoundForUserException(organizationId)
  }
}
```

**✅ Ventajas:**
- Query eficiente (solo COUNT)
- Sin dependencias entre módulos
- Código auto-contenido

**❌ Desventajas:**
- Si 3 módulos validan lo mismo, duplicas la query 3 veces

---

#### Opción B: PersistenceModule

```typescript
// organization.repository.ts (sin cambios, método ya existe)
async existsActiveById(organizationId: string): Promise<boolean> {
  const count = await this.getRepo()
    .createQueryBuilder('organization')
    .where('organization.id = :id', { id: organizationId })
    .andWhere('organization.isActive = :isActive', { isActive: true })
    .getCount()

  return count > 0
}

// user.validator.ts
async validateOrganizationExists(organizationId: string): Promise<void> {
  // ✅ Usa el método original del repositorio
  const exists = await this.organizationRepository.existsActiveById(organizationId)
  if (!exists) {
    throw new OrganizationNotFoundForUserException(organizationId)
  }
}
```

**✅ Ventajas:**
- Método centralizado (1 sola implementación)
- Reutilizable en todos los módulos
- Lógica natural (validador usa repositorio)

**❌ Desventajas:**
- Necesitas PersistenceModule configurado

---

### 2️⃣ GET complejo con relaciones

**Escenario**: Obtener usuarios con su organización y foto de perfil.

#### Opción A: Query Directa

```typescript
// users.repository.ts
async findUsersWithOrganization(): Promise<UserEntity[]> {
  return await this.getRepo()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.organization', 'organization') // ✅ Usa la relación de la entity
    .leftJoinAndSelect('user.profileImage', 'profileImage')
    .where('user.isActive = :isActive', { isActive: true })
    .orderBy('user.createdAt', 'DESC')
    .getMany()
}
```

**✅ NO pierdes las entities**:
- Sigues usando relaciones TypeORM (`user.organization`)
- El ORM mapea automáticamente
- Tienes acceso a métodos de la entity

**❌ No hay desventajas** en este caso.

---

#### Opción B: PersistenceModule

```typescript
// users.repository.ts (MISMO CÓDIGO)
async findUsersWithOrganization(): Promise<UserEntity[]> {
  return await this.getRepo()
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.organization', 'organization')
    .leftJoinAndSelect('user.profileImage', 'profileImage')
    .where('user.isActive = :isActive', { isActive: true })
    .orderBy('user.createdAt', 'DESC')
    .getMany()
}
```

**Resultado**: **Idéntico** en ambas opciones. 🟰

---

### 3️⃣ Validación de regla de negocio compleja

**Escenario**: No permitir desactivar una organización si tiene usuarios activos.

#### Opción A: Query Directa

```typescript
// organization.repository.ts
async hasActiveUsers(organizationId: string): Promise<boolean> {
  // ✅ Query directa a la tabla users (sin inyectar UsersRepository)
  const count = await this.getRepo()
    .createQueryBuilder()
    .from(UserEntity, 'user')
    .where('user.organizationId = :organizationId', { organizationId })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .getCount()

  return count > 0
}

// organization.validator.ts
async validateCanDeactivate(organizationId: string): Promise<void> {
  const hasUsers = await this.organizationRepository.hasActiveUsers(organizationId)
  if (hasUsers) {
    throw new OrganizationHasActiveUsersException(organizationId)
  }
}
```

**✅ Ventajas:**
- Sin dependencias circulares
- Query eficiente (solo COUNT)

**❌ Desventajas:**
- `OrganizationRepository` conoce `UserEntity`
- Si la regla cambia, modificas el repositorio

---

#### Opción B: PersistenceModule

**Opción 2.1: Método en OrganizationRepository (igual que Opción A)**

```typescript
// organization.repository.ts
async hasActiveUsers(organizationId: string): Promise<boolean> {
  const count = await this.getRepo()
    .createQueryBuilder()
    .from(UserEntity, 'user')
    .where('user.organizationId = :organizationId', { organizationId })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .getCount()

  return count > 0
}
```

**Opción 2.2: Inyectar UsersRepository (más limpio)**

```typescript
// organization.validator.ts
import { USERS_REPOSITORY } from '../../users'
import type { IUsersRepository } from '../../users'

@Injectable()
export class OrganizationValidator {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(USERS_REPOSITORY) // ✅ Sin circular dependency
    private readonly usersRepository: IUsersRepository,
  ) {}

  async validateCanDeactivate(organizationId: string): Promise<void> {
    // ✅ Llama al método del repositorio correspondiente
    const count = await this.usersRepository.countActiveByOrganization(organizationId)
    if (count > 0) {
      throw new OrganizationHasActiveUsersException(organizationId, count)
    }
  }
}

// users.repository.ts
async countActiveByOrganization(organizationId: string): Promise<number> {
  return await this.getRepo()
    .createQueryBuilder('user')
    .where('user.organizationId = :organizationId', { organizationId })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .getCount()
}
```

**✅ Ventajas:**
- Cada repositorio maneja SU propia entidad
- Lógica centralizada en el repositorio correcto
- Validador orquesta (no ejecuta queries)

**❌ Desventajas:**
- Validador inyecta 2 repositorios

---

### 4️⃣ Validación ultra-específica

**Escenario**: Validar que un NIT no esté duplicado (solo en Organizations).

#### Ambas Opciones: **IDÉNTICAS**

```typescript
// organization.repository.ts
async existsByNit(nit: string, excludeId?: string): Promise<boolean> {
  const query = this.getRepo()
    .createQueryBuilder('organization')
    .where('organization.nit = :nit', { nit })

  if (excludeId) {
    query.andWhere('organization.id != :excludeId', { excludeId })
  }

  const count = await query.getCount()
  return count > 0
}

// organization.validator.ts
async validateUniqueNit(nit: string, excludeId?: string): Promise<void> {
  const exists = await this.organizationRepository.existsByNit(nit, excludeId)
  if (exists) {
    throw new NitAlreadyExistsException(nit)
  }
}
```

**Resultado**: **No hay diferencia**. ✅

---

## 🧪 Comparación en Testing

### Test de UserValidator

#### Opción A: Query Directa

```typescript
describe('UserValidator', () => {
  let validator: UserValidator
  let usersRepository: jest.Mocked<IUsersRepository>

  beforeEach(async () => {
    const mockRepository: Partial<jest.Mocked<IUsersRepository>> = {
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      existsByCI: jest.fn(),
      isOrganizationActive: jest.fn(), // ⚠️ Mock adicional
    }

    const module = await Test.createTestingModule({
      providers: [
        UserValidator,
        { provide: USERS_REPOSITORY, useValue: mockRepository },
      ],
    }).compile()

    validator = module.get<UserValidator>(UserValidator)
    usersRepository = module.get(USERS_REPOSITORY)
  })

  it('should validate organization exists', async () => {
    usersRepository.isOrganizationActive.mockResolvedValue(true)

    await expect(
      validator.validateOrganizationExists('org-123'),
    ).resolves.not.toThrow()
  })
})
```

**Mocks necesarios:** 1 (UsersRepository)

---

#### Opción B: PersistenceModule

```typescript
describe('UserValidator', () => {
  let validator: UserValidator
  let usersRepository: jest.Mocked<IUsersRepository>
  let organizationRepository: jest.Mocked<IOrganizationRepository>

  beforeEach(async () => {
    const mockUsersRepo: Partial<jest.Mocked<IUsersRepository>> = {
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      existsByCI: jest.fn(),
    }

    const mockOrgRepo: Partial<jest.Mocked<IOrganizationRepository>> = {
      existsActiveById: jest.fn(),
    }

    const module = await Test.createTestingModule({
      providers: [
        UserValidator,
        { provide: USERS_REPOSITORY, useValue: mockUsersRepo },
        { provide: ORGANIZATION_REPOSITORY, useValue: mockOrgRepo }, // ⚠️ Mock adicional
      ],
    }).compile()

    validator = module.get<UserValidator>(UserValidator)
    usersRepository = module.get(USERS_REPOSITORY)
    organizationRepository = module.get(ORGANIZATION_REPOSITORY)
  })

  it('should validate organization exists', async () => {
    organizationRepository.existsActiveById.mockResolvedValue(true)

    await expect(
      validator.validateOrganizationExists('org-123'),
    ).resolves.not.toThrow()
  })
})
```

**Mocks necesarios:** 2 (UsersRepository + OrganizationRepository)

**Resultado**: Opción A tiene 1 mock menos. ⚡

---

## 📏 Matriz de Decisión

### ¿Cuándo usar Query Directa (Opción A)?

| Situación | Usar Opción A |
|-----------|---------------|
| Proyecto tiene < 10 módulos | ✅ Sí |
| Validaciones simples (EXISTS, COUNT) | ✅ Sí |
| GETs complejos con JOINs | ✅ Sí (funciona igual) |
| Cada módulo es independiente | ✅ Sí |
| Quieres menos boilerplate | ✅ Sí |
| Testing más simple | ✅ Sí |

### ¿Cuándo usar PersistenceModule (Opción B)?

| Situación | Usar Opción B |
|-----------|---------------|
| Proyecto tiene 10+ módulos | ✅ Sí |
| Muchas validaciones cruzadas | ✅ Sí |
| Validadores necesitan 3+ repositorios | ✅ Sí |
| Quieres centralización enterprise | ✅ Sí |
| Reglas de negocio complejas | ✅ Sí |
| Planeas escalar a microservicios | ❌ No (cada uno tiene su BD) |

---

## 🎯 Recomendación Final para TU Proyecto

Basándome en tu arquitectura actual:

### ✅ **Opción A: Query Directa** (RECOMENDADO)

**Razones:**
1. Tienes ~5-6 módulos actualmente
2. Validaciones cruzadas son simples (existencia)
3. Módulos bien separados
4. Menos boilerplate
5. Testing más simple
6. Migración fácil si después necesitas cambiar

**Cuándo migrar a Opción B:**
- Cuando tengas 10+ módulos
- Cuando validadores necesiten 4+ repositorios
- Cuando copies queries 3+ veces

---

## 🚀 Plan de Acción

### Paso 1: Implementar Opción A (Query Directa)

1. Modificar `users.repository.ts`:
   - Agregar método `isOrganizationActive()`

2. Modificar `user.validator.ts`:
   - Eliminar inyección de `ORGANIZATION_REPOSITORY`
   - Usar `this.usersRepository.isOrganizationActive()`

3. Modificar `users.module.ts`:
   - Eliminar import de `OrganizationsModule`

4. Ejecutar tests:
   ```bash
   npm test -- user.validator.spec
   ```

**Tiempo estimado:** 30 minutos

---

### Paso 2: (Opcional) Migrar a Opción B en el futuro

Si después decides cambiar:

1. Crear `src/@core/persistence/persistence.module.ts`
2. Mover todos los repositorios allí
3. Simplificar feature modules
4. Actualizar AppModule

**Tiempo estimado:** 2 horas

---

## 📝 Resumen de Diferencias Clave

| Aspecto | Query Directa (A) | PersistenceModule (B) |
|---------|-------------------|----------------------|
| **Entities** | ✅ NO las pierdes | ✅ NO las pierdes |
| **JOINs** | ✅ Funcionan igual | ✅ Funcionan igual |
| **Validaciones** | Query custom en repo | Método del repo correspondiente |
| **Deps circulares** | ✅ Ninguna | ✅ Ninguna |
| **Testing** | 1 mock | 2+ mocks |
| **Código duplicado** | Posible si 3+ módulos usan lo mismo | Centralizado |
| **Complejidad** | Baja | Media |
| **Mantenibilidad** | Buena | Muy buena |

---

## 💡 Conclusión

**Para validaciones y reglas de negocio específicas:**
- ✅ Ambas opciones funcionan perfectamente
- ✅ NO pierdes entities en ninguna
- ✅ NO pierdes capacidades de TypeORM

**Para GETs complejos:**
- ✅ Exactamente igual en ambas opciones
- ✅ Usas relaciones, JOINs, eager loading sin problemas

**La diferencia real:**
- Opción A: Queries custom dentro del repositorio (más simple)
- Opción B: Inyectas repositorios (más profesional, más setup)

**Mi recomendación:** Empieza con **Opción A** y migra a **Opción B** si creces. 🚀
