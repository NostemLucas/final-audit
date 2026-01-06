# 🏭 Factory Pattern - Guía de Implementación

Esta guía explica **por qué y cómo** usar el Factory Pattern en nuestros módulos.

---

## 🎯 ¿Por qué Factory devuelve la entidad en updateFromDto()?

### ❌ Enfoque Anterior (void)

```typescript
// ❌ Factory con void
updateFromDto(user: UserEntity, dto: UpdateUserDto): void {
  if (dto.names !== undefined) user.names = dto.names
  if (dto.email !== undefined) user.email = dto.email.toLowerCase()
  // ... modifica user internamente
}

// Service
async update(id: string, dto: UpdateUserDto) {
  const user = await this.findOne(id)

  this.userFactory.updateFromDto(user, dto)  // ⚠️ No es obvio que user cambió

  return await this.usersRepository.save(user)  // user fue modificado implícitamente
}
```

**Problemas:**
- ⚠️ **Mutación implícita**: No es obvio que `user` fue modificado
- ⚠️ **Inconsistente**: `createFromDto()` devuelve, pero `updateFromDto()` no
- ⚠️ **Menos claro**: El código no muestra explícitamente que algo cambió

---

### ✅ Enfoque Actual (devolver UserEntity)

```typescript
// ✅ Factory devuelve UserEntity
updateFromDto(user: UserEntity, dto: UpdateUserDto): UserEntity {
  if (dto.names !== undefined) user.names = dto.names
  if (dto.email !== undefined) user.email = dto.email.toLowerCase()
  // ... modifica user internamente

  return user  // ✅ Devuelve la referencia (mismo objeto)
}

// Service
async update(id: string, dto: UpdateUserDto) {
  const user = await this.findOne(id)

  const updatedUser = this.userFactory.updateFromDto(user, dto)  // ✅ Explícito

  return await this.usersRepository.save(updatedUser)  // ✅ Claro que fue modificado
}
```

**Ventajas:**
- ✅ **Explícito**: Se ve claramente que `user` fue modificado
- ✅ **Consistente**: Ambos métodos del factory devuelven `UserEntity`
- ✅ **Más claro**: El código muestra la intención
- ✅ **TypeORM compatible**: Modifica la entidad original (TypeORM trackea cambios)

---

## 🔍 ¿Es el MISMO objeto o uno NUEVO?

### Respuesta: Es el MISMO objeto (misma referencia)

```typescript
async update(id: string, dto: UpdateUserDto) {
  const user = await this.findOne(id)
  console.log('Antes:', user.names)  // "Juan"

  const updatedUser = this.userFactory.updateFromDto(user, { names: "Pedro" })

  console.log('Después:', user.names)        // "Pedro" ← ¡Cambió!
  console.log('Updated:', updatedUser.names) // "Pedro"
  console.log(user === updatedUser)          // true ← ¡Misma referencia!
}
```

**Explicación:**
- En JavaScript/TypeScript, los **objetos se pasan por referencia**
- Cuando haces `user.names = dto.names`, modificas el objeto original
- `return user` devuelve la misma referencia, no crea un nuevo objeto
- `user === updatedUser` es `true` porque apuntan al mismo objeto en memoria

---

## 🎨 Comparación de Enfoques

### Enfoque 1: Mutation con void (❌ Menos claro)

```typescript
updateFromDto(user: UserEntity, dto: UpdateUserDto): void {
  user.names = dto.names
}

// Uso
this.userFactory.updateFromDto(user, dto)  // ⚠️ Qué hace? No es obvio
```

### Enfoque 2: Mutation con return (✅ Recomendado - Lo que usamos)

```typescript
updateFromDto(user: UserEntity, dto: UpdateUserDto): UserEntity {
  user.names = dto.names
  return user  // ✅ Mismo objeto, pero más explícito
}

// Uso
const updated = this.userFactory.updateFromDto(user, dto)  // ✅ Claro
```

### Enfoque 3: Inmutabilidad pura (⚡ Avanzado - NO recomendado para TypeORM)

```typescript
updateFromDto(user: UserEntity, dto: UpdateUserDto): UserEntity {
  // Crea un NUEVO objeto
  const updated = Object.create(Object.getPrototypeOf(user))
  Object.assign(updated, user, dto)
  return updated  // ⚡ Objeto DIFERENTE
}

// Uso
const updated = this.userFactory.updateFromDto(user, dto)
console.log(user === updated)  // false ← Objetos diferentes
```

**Problemas del Enfoque 3:**
- ⚠️ TypeORM espera que modifiques la entidad original
- ⚠️ Puede romper el change tracking de TypeORM
- ⚠️ Más complejo sin beneficios claros en este contexto

---

## 📋 Patrón Completo en Acción

### UserFactory

```typescript
@Injectable()
export class UserFactory {
  private readonly SALT_ROUNDS = 10

  /**
   * Crea una nueva entidad UserEntity desde un CreateUserDto
   * @returns Nueva instancia de UserEntity (objeto nuevo)
   */
  createFromDto(dto: CreateUserDto): UserEntity {
    const user = new UserEntity()  // ← Crea NUEVO objeto

    user.names = dto.names
    user.email = dto.email.toLowerCase()
    user.password = this.hashPassword(dto.password)
    // ... etc

    return user  // ← Devuelve el nuevo objeto
  }

  /**
   * Actualiza una entidad UserEntity existente
   * @returns La entidad actualizada (misma referencia)
   */
  updateFromDto(user: UserEntity, dto: UpdateUserDto): UserEntity {
    if (dto.names !== undefined) user.names = dto.names
    if (dto.email !== undefined) user.email = dto.email.toLowerCase()
    // ... etc

    return user  // ← Devuelve la misma referencia modificada
  }

  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, this.SALT_ROUNDS)
  }

  verifyPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash)
  }
}
```

### UsersService

```typescript
@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly userFactory: UserFactory,
    private readonly validator: UserValidator,
  ) {}

  @Transactional()
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    await this.validator.validateUniqueConstraints(
      createUserDto.email,
      createUserDto.username,
      createUserDto.ci,
    )

    // ✅ Factory crea NUEVA entidad
    const user = this.userFactory.createFromDto(createUserDto)

    return await this.usersRepository.save(user)
  }

  @Transactional()
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id)

    // Validaciones...

    // ✅ Factory actualiza la entidad existente y la devuelve
    const updatedUser = this.userFactory.updateFromDto(user, updateUserDto)

    return await this.usersRepository.save(updatedUser)
  }
}
```

---

## 🤔 Preguntas Frecuentes

### 1. ¿Por qué no usar Object.assign() directamente en el Service?

```typescript
// ❌ Sin Factory
async update(id: string, dto: UpdateUserDto) {
  const user = await this.findOne(id)

  Object.assign(user, dto)  // ⚠️ No normaliza datos

  return await this.usersRepository.save(user)
}

// ✅ Con Factory
async update(id: string, dto: UpdateUserDto) {
  const user = await this.findOne(id)

  const updated = this.userFactory.updateFromDto(user, dto)  // ✅ Normaliza automáticamente

  return await this.usersRepository.save(updated)
}
```

**Razones para usar Factory:**
- ✅ **Normalización**: Email → lowercase, NIT → uppercase, etc.
- ✅ **Validación de formato**: Trim, regex, etc.
- ✅ **Encapsulación**: Lógica de transformación en un solo lugar
- ✅ **Reutilización**: Mismo código en create, update, seeds, tests

### 2. ¿Cuándo NO modificar user directamente?

Si tu proyecto requiere **inmutabilidad estricta** (ej: Redux, Event Sourcing), usa clonación:

```typescript
updateFromDto(user: UserEntity, dto: UpdateUserDto): UserEntity {
  // Clonar para no mutar el original
  const updated = { ...user }  // Spread operator (shallow copy)

  if (dto.names !== undefined) updated.names = dto.names
  if (dto.email !== undefined) updated.email = dto.email.toLowerCase()

  return updated
}
```

**PERO** esto puede causar problemas con TypeORM. Úsalo solo si realmente necesitas inmutabilidad.

### 3. ¿createFromDto también devuelve la entidad?

**SÍ**, siempre devuelve una **nueva** instancia:

```typescript
createFromDto(dto: CreateUserDto): UserEntity {
  const user = new UserEntity()  // ← Objeto NUEVO

  user.names = dto.names
  // ... etc

  return user  // ← Nueva instancia
}
```

En `create`, siempre se crea un objeto nuevo.
En `update`, se modifica el existente pero se devuelve para claridad.

---

## ✅ Beneficios del Patrón Actual

| Beneficio | Descripción |
|-----------|-------------|
| **Consistencia** | `createFromDto()` y `updateFromDto()` devuelven `UserEntity` |
| **Claridad** | El código muestra explícitamente que la entidad fue modificada |
| **TypeORM friendly** | Modifica la entidad original (el ORM trackea cambios) |
| **Normalización** | Email lowercase, NIT uppercase, etc. en un solo lugar |
| **Reutilizable** | Mismo Factory para Service, Seeders, Tests |
| **Testeable** | Fácil de testear la lógica de normalización aislada |

---

## 🎯 Resumen

```typescript
// ✅ Factory Pattern - Implementación Recomendada

// CREAR (devuelve nuevo objeto)
const user = this.userFactory.createFromDto(dto)

// ACTUALIZAR (modifica y devuelve mismo objeto)
const updated = this.userFactory.updateFromDto(user, dto)

// Ambos métodos DEVUELVEN UserEntity para:
// 1. Consistencia
// 2. Claridad en el código
// 3. Compatibilidad con TypeORM
```

---

## 📚 Referencias

- [Factory Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/factory-method)
- [TypeORM Entity Listeners](https://typeorm.io/listeners-and-subscribers)
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)

---

**Última actualización**: Enero 2026
**Mantenedor**: @limberg
