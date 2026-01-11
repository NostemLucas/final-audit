# 📚 Documentación del Proyecto

Índice completo de la documentación del sistema de gestión de auditorías.

---

## 🏗️ Arquitectura

Documentación sobre decisiones arquitectónicas y patrones de diseño.

### [Soluciones Arquitectónicas](architecture/ARCHITECTURAL_SOLUTIONS.md)
Soluciones a problemas comunes de arquitectura, especialmente dependencias circulares entre módulos. Incluye 3 opciones detalladas con ejemplos de código.

**Contenido:**
- Problema de dependencias circulares
- Solución 1: PersistenceModule (recomendada)
- Solución 2: Query Directa en repositorios
- Solución 3: forwardRef() (no recomendada)

### [PersistenceModule Implementado](architecture/PERSISTENCE_MODULE_IMPLEMENTADO.md)
Documentación de la implementación del módulo de persistencia centralizado que elimina dependencias circulares.

**Contenido:**
- Archivos creados y modificados
- Estructura final de módulos
- Cómo agregar nuevos módulos
- Tests y verificaciones

### [Comparación de Opciones](architecture/COMPARACION_OPCIONES.md)
Análisis detallado comparando Query Directa vs PersistenceModule con ejemplos reales del proyecto.

**Contenido:**
- Comparación técnica detallada
- Ejemplos de código para cada caso
- Matriz de decisión
- Recomendaciones según el tamaño del proyecto

### [OrganizationId Required](architecture/ORGANIZATION_ID_REQUIRED.md)
Documentación del cambio de `organizationId` de campo opcional a requerido en la entidad User.

**Contenido:**
- Razones del cambio
- Archivos afectados
- Migración de base de datos
- Tests actualizados

---

## 💾 Base de Datos

Guías para trabajar con PostgreSQL, TypeORM, migraciones y seeds.

### [Comandos de Base de Datos](database/DATABASE_COMMANDS.md)
Guía completa de todos los comandos disponibles para gestionar la base de datos.

**Contenido:**
- Setup y gestión de BD
- Comandos de migraciones
- Comandos de seeds
- Comandos avanzados (fresh, reset)
- Troubleshooting

### [Configuración de Base de Datos](database/DATABASE_CONFIG.md)
Configuración de PostgreSQL y TypeORM.

**Contenido:**
- Setup de PostgreSQL
- Configuración de TypeORM
- Variables de entorno
- Conexiones y pools
- Configuración de producción

---

## 🛠️ Desarrollo

Guías y estándares para desarrolladores.

### [Configuración de Entorno](development/ENV_SETUP_GUIDE.md)
Setup de variables de entorno y configuración inicial del proyecto.

**Contenido:**
- Variables de entorno requeridas
- Configuración de desarrollo
- Configuración de producción
- Configuración de email (Ethereal para testing)

### [Estándar de Barrel Files](development/BARREL_FILES_STANDARD.md)
Convenciones para usar barrel files (index.ts) en el proyecto.

**Contenido:**
- Qué son los barrel files
- Cuándo usarlos
- Estructura recomendada
- Ejemplos por tipo de módulo
- Anti-patrones a evitar

### [Factory Pattern](development/FACTORY_PATTERN.md)
Implementación del patrón Factory para crear entidades en tests.

**Contenido:**
- Concepto del patrón Factory
- Implementación en el proyecto
- Ejemplos de uso
- Factories vs Fixtures
- Best practices

### [Implementación de Paginación](development/PAGINATION_IMPLEMENTATION.md)
Sistema de paginación implementado en el proyecto.

**Contenido:**
- DTOs de paginación
- Implementación en repositorios
- Uso en controllers
- Response format
- Ejemplos completos

---

## 🧪 Testing

Estrategias y guías para testing del proyecto.

### [Estrategia de Testing](testing/TESTING_STRATEGY.md)
Enfoque general de testing: unitarios, integración y E2E.

**Contenido:**
- Pirámide de testing
- Tests unitarios (services, validators, factories)
- Tests de repositorios
- Qué testear y qué no
- Estructura de tests
- Mocking y fakes

### [Testing E2E](testing/E2E_TESTING.md)
Guía completa de tests end-to-end.

**Contenido:**
- Setup de tests E2E
- Estructura de archivos
- Database setup para E2E
- Ejemplos de tests E2E completos
- Best practices

### [Fake Repositories Guide](testing/FAKE_REPOSITORIES_GUIDE.md)
Guía para crear y usar repositorios fake en tests.

**Contenido:**
- Por qué usar fake repositories
- Implementación de FakeRepository
- Ejemplos de uso
- Ventajas vs mocks
- Cuándo usar cada uno

---

## 📖 Guías Rápidas

### Quickstart para nuevos desarrolladores

1. Lee [development/ENV_SETUP_GUIDE.md](development/ENV_SETUP_GUIDE.md)
2. Configura la BD con [database/DATABASE_COMMANDS.md](database/DATABASE_COMMANDS.md)
3. Revisa [development/BARREL_FILES_STANDARD.md](development/BARREL_FILES_STANDARD.md)
4. Aprende testing con [testing/TESTING_STRATEGY.md](testing/TESTING_STRATEGY.md)

### Para decisiones de arquitectura

1. Revisa [architecture/ARCHITECTURAL_SOLUTIONS.md](architecture/ARCHITECTURAL_SOLUTIONS.md)
2. Entiende [architecture/PERSISTENCE_MODULE_IMPLEMENTADO.md](architecture/PERSISTENCE_MODULE_IMPLEMENTADO.md)
3. Consulta [architecture/COMPARACION_OPCIONES.md](architecture/COMPARACION_OPCIONES.md) para análisis detallado

---

## 🔍 Buscar Documentación

| Si necesitas... | Ve a... |
|-----------------|---------|
| Setup inicial del proyecto | [development/ENV_SETUP_GUIDE.md](development/ENV_SETUP_GUIDE.md) |
| Comandos de BD | [database/DATABASE_COMMANDS.md](database/DATABASE_COMMANDS.md) |
| Crear un nuevo módulo | [architecture/PERSISTENCE_MODULE_IMPLEMENTADO.md](architecture/PERSISTENCE_MODULE_IMPLEMENTADO.md) |
| Escribir tests | [testing/TESTING_STRATEGY.md](testing/TESTING_STRATEGY.md) |
| Implementar paginación | [development/PAGINATION_IMPLEMENTATION.md](development/PAGINATION_IMPLEMENTATION.md) |
| Resolver dependencias circulares | [architecture/ARCHITECTURAL_SOLUTIONS.md](architecture/ARCHITECTURAL_SOLUTIONS.md) |
| Crear factories para tests | [development/FACTORY_PATTERN.md](development/FACTORY_PATTERN.md) |
| Tests E2E | [testing/E2E_TESTING.md](testing/E2E_TESTING.md) |

---

## 📝 Contribuir a la Documentación

Al agregar nueva documentación:

1. **Ubicación:**
   - `architecture/` - Decisiones arquitectónicas, patrones
   - `database/` - Todo sobre BD, migraciones, TypeORM
   - `development/` - Guías de desarrollo, estándares
   - `testing/` - Estrategias y guías de testing

2. **Formato:**
   - Usar títulos descriptivos
   - Incluir ejemplos de código
   - Agregar tabla de contenidos para documentos largos
   - Usar emojis para mejor navegación visual

3. **Actualizar índices:**
   - Actualizar este README.md con link al nuevo documento
   - Actualizar [../README.md](../README.md) si es documentación importante

---

**Última actualización:** 2026-01-11
