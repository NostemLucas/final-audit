# Audit Management System (ATR)

Sistema de gestión de auditorías construido con NestJS, TypeORM y PostgreSQL.

## 📋 Descripción

Sistema para gestión de auditorías con soporte para plantillas, estándares, frameworks de madurez (COBIT 5, CMMI) y flujos de evaluación. Implementa arquitectura modular con capa `@core` reutilizable.

---

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Configuración

1. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

2. Configura las variables en `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/audit_db
PORT=3001
NODE_ENV=development
```

Ver [docs/development/ENV_SETUP_GUIDE.md](docs/development/ENV_SETUP_GUIDE.md) para más detalles.

### Base de Datos

```bash
# Crear base de datos
npm run db:create

# Ejecutar migraciones
npm run migration:run

# Ejecutar seeds
npm run seed:run

# Setup completo (create + migrate + seed)
npm run db:setup
```

Ver [docs/database/DATABASE_COMMANDS.md](docs/database/DATABASE_COMMANDS.md) para más comandos.

---

## 🏃 Ejecución

```bash
# Desarrollo (watch mode)
npm run start:dev

# Producción
npm run start:prod

# Debug
npm run start:debug
```

---

## 🧪 Testing

```bash
# Tests unitarios
npm test

# Tests en watch mode
npm run test:watch

# Coverage
npm run test:cov

# Tests E2E
npm run test:e2e
```

Ver [docs/testing/TESTING_STRATEGY.md](docs/testing/TESTING_STRATEGY.md) para más información.

---

## 📁 Estructura del Proyecto

```
src/
├── @core/                    # Infraestructura reutilizable
│   ├── database/            # TypeORM + transacciones con CLS
│   ├── logger/              # Winston logging
│   ├── email/               # Envío de emails con templates
│   ├── files/               # Gestión de archivos
│   ├── persistence/         # Repositorios centralizados
│   └── repositories/        # BaseRepository
│
├── modules/                 # Módulos de negocio
│   ├── users/              # Gestión de usuarios
│   ├── organizations/      # Gestión de organizaciones
│   └── ...
│
└── app.module.ts           # Módulo principal
```

---

## 📚 Documentación

### 🏗️ Arquitectura

- [**Soluciones Arquitectónicas**](docs/architecture/ARCHITECTURAL_SOLUTIONS.md) - Soluciones a problemas de arquitectura (dependencias circulares)
- [**PersistenceModule**](docs/architecture/PERSISTENCE_MODULE_IMPLEMENTADO.md) - Implementación del módulo de persistencia centralizado
- [**Comparación de Opciones**](docs/architecture/COMPARACION_OPCIONES.md) - Análisis de diferentes enfoques arquitectónicos
- [**OrganizationId Required**](docs/architecture/ORGANIZATION_ID_REQUIRED.md) - Cambio de organizationId a campo requerido

### 💾 Base de Datos

- [**Comandos de Base de Datos**](docs/database/DATABASE_COMMANDS.md) - Guía completa de comandos de BD
- [**Configuración de Base de Datos**](docs/database/DATABASE_CONFIG.md) - Setup y configuración de PostgreSQL/TypeORM

### 🛠️ Desarrollo

- [**Configuración de Entorno**](docs/development/ENV_SETUP_GUIDE.md) - Variables de entorno y setup
- [**Estándar de Barrel Files**](docs/development/BARREL_FILES_STANDARD.md) - Convenciones de exports
- [**Factory Pattern**](docs/development/FACTORY_PATTERN.md) - Implementación de factories para testing
- [**Implementación de Paginación**](docs/development/PAGINATION_IMPLEMENTATION.md) - Sistema de paginación

### 🧪 Testing

- [**Estrategia de Testing**](docs/testing/TESTING_STRATEGY.md) - Enfoque general de testing
- [**Testing E2E**](docs/testing/E2E_TESTING.md) - Guía de tests end-to-end
- [**Fake Repositories**](docs/testing/FAKE_REPOSITORIES_GUIDE.md) - Guía de repositorios fake para testing

---

## 🔑 Características Principales

### Core Layer (`@core`)

- **Database**: TypeORM con gestión de transacciones usando CLS (Continuation Local Storage)
- **Logger**: Sistema de logging con Winston (HTTP, Database, Exception, Startup loggers)
- **Email**: Servicio de emails con templates Handlebars
- **Files**: Gestión de archivos con validación y almacenamiento local
- **Persistence**: Módulo centralizado de repositorios (elimina dependencias circulares)
- **Repositories**: BaseRepository genérico con integración CLS

### Módulos de Negocio

- **Users**: Gestión de usuarios con roles y permisos
- **Organizations**: Gestión de organizaciones multitenancy

### Patrones Implementados

- ✅ **Repository Pattern** con BaseRepository genérico
- ✅ **Factory Pattern** para creación de entidades en tests
- ✅ **Use Cases** (Clean Architecture)
- ✅ **Validators** separados de la lógica de negocio
- ✅ **CLS (Continuation Local Storage)** para transacciones
- ✅ **Global Exception Handling**
- ✅ **Request Logging** con interceptors
- ✅ **Barrel Exports** para imports limpios

---

## 🌐 API Documentation

La documentación de la API está disponible en Swagger cuando la aplicación está corriendo:

```
http://localhost:3001/api
```

---

## 🔧 Tecnologías

- **Framework**: NestJS 10
- **Database**: PostgreSQL + TypeORM
- **Authentication**: JWT (próximamente)
- **Validation**: class-validator + class-transformer
- **Testing**: Jest
- **Logging**: Winston
- **Email**: @nestjs-modules/mailer + Handlebars
- **File Upload**: Multer + Sharp
- **Transaction Management**: nestjs-cls

---

## 📝 Comandos Útiles

```bash
# Database
npm run db:setup          # Setup completo de BD
npm run migration:generate -- src/@core/database/migrations/MigrationName
npm run migration:run

# Testing
npm test                  # Run all tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage

# Email (testing)
npm run email:test       # Test all templates
npm run email:test:welcome

# Formatting & Linting
npm run format           # Format with Prettier
npm run lint            # Lint with ESLint

# Git
npm run commit          # Commitizen (conventional commits)
```

---

## 🤝 Contribución

Ver [CLAUDE.md](CLAUDE.md) para instrucciones específicas para Claude Code (AI assistant).

### Estándares de Código

- Conventional Commits (usar `npm run commit`)
- ESLint + Prettier configurados
- Tests requeridos para nuevas features
- Documentación en español

---

## 📜 Licencia

MIT

---

## 👥 Equipo

Desarrollado por el equipo de [Tu Organización]

---

## 📞 Soporte

Para preguntas y soporte:
- Crear un issue en el repositorio
- Consultar la documentación en `docs/`

---

**Última actualización**: 2026-01-11
