# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS application for audit management (ATR - Audit Template Repository) with support for templates, standards, maturity frameworks (COBIT 5, CMMI), and evaluation workflows. The codebase follows a modular architecture with a well-defined core layer (`@core`) providing reusable infrastructure.

## Common Commands

### Docker (PostgreSQL & Redis)
```bash
docker-compose up -d        # Start PostgreSQL & Redis in background
docker-compose down         # Stop services (keeps data)
docker-compose down -v      # Stop and remove data (⚠️ destructive)
docker-compose ps           # View service status
docker-compose logs -f      # View logs (follow mode)
docker-compose restart      # Restart all services
```

**See [DOCKER.md](./DOCKER.md) for detailed Docker documentation.**

### Development
```bash
npm install                 # Install dependencies
npm run start:dev          # Start in watch mode (development)
npm run start:debug        # Start with debugger
npm run start:prod         # Start in production mode
```

### Building & Formatting
```bash
npm run build              # Build the application
npm run format             # Format code with Prettier
npm run lint               # Lint and fix with ESLint
```

### Testing
```bash
npm test                   # Run all unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:debug         # Debug tests
npm run test:e2e           # Run end-to-end tests
```

### Database (TypeORM)
```bash
# Setup & Management
npm run db:create          # Create database if not exists
npm run db:drop            # Drop database (⚠️ CAUTION: deletes all data)
npm run db:setup           # Setup: create DB → run migrations → seed
npm run db:reset           # Soft reset: revert → run migrations → seed
npm run db:fresh           # Fresh start: drop → create → fresh migration → run → seed

# Migrations
npm run migration:generate -- src/@core/database/migrations/MigrationName  # Generate from entity changes
npm run migration:create -- src/@core/database/migrations/MigrationName    # Create empty migration
npm run migration:fresh    # Regenerate migrations from scratch (deletes old ones)
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
npm run migration:show     # Show migration status

# Seeds
npm run seed:run           # Run database seeds
```

**See [DATABASE_COMMANDS.md](./DATABASE_COMMANDS.md) for detailed command documentation.**

### Email Testing
```bash
npm run email:test:setup   # Generate Ethereal test credentials
npm run email:test         # Test all email templates
npm run email:test:welcome # Test welcome email
npm run email:test:verify  # Test verification email
npm run email:test:2fa     # Test 2FA code email
npm run email:test:reset   # Test password reset email
npm run email:template:create -- template-name  # Create new email template
```

### File Storage Testing
```bash
npm run files:verify                         # Verify system configuration (run first!)
npm run files:test                           # Test all file operations
npm run files:test upload                    # Upload test image
npm run files:test upload pdf                # Upload test PDF
npm run files:test upload text               # Upload test text file
npm run files:test delete test-uploads/file.jpg    # Delete file
npm run files:test exists test-uploads/file.jpg    # Check if file exists
npm run files:test url test-uploads/file.jpg       # Get file URL
npm run files:test replace                   # Test file replacement
```

### Git
```bash
npm run commit             # Commitizen for conventional commits
```

## Architecture

### Core Layer (`src/@core`)

The `@core` directory contains shared infrastructure modules used across the application. These modules are framework-independent and highly reusable:

- **`database/`** - TypeORM configuration with CLS-based transaction management and automatic auditing
- **`logger/`** - Winston-based logging system with specialized loggers (HTTP, Database, Exception, Startup)
- **`email/`** - Email service with Handlebars templates (welcome, verification, 2FA, password reset)
- **`files/`** - File upload/management with decorators and validators
- **`repositories/`** - Generic BaseRepository with CLS integration for transactions and auditing
- **`filters/`** - Global exception filters
- **`interceptors/`** - Request/response interceptors (Logging, Audit)
- **`entities/`** - Shared base entities
- **`config/`** - Configuration management
- **`examples/`** - Example implementations

### Application Modules (`src/modules`)

Business logic modules (e.g., `organizations/`) that use the core infrastructure.

### Path Aliases

The project uses TypeScript path aliases:
```typescript
@core       -> src/@core
@core/*     -> src/@core/*
@shared     -> src/@shared
@shared/*   -> src/@shared/*
```

These are configured in `tsconfig.json` and `jest` config. Always use these aliases instead of relative imports when importing from core or shared modules.

## Transaction Management with CLS

This project uses **CLS (Continuation Local Storage)** via `nestjs-cls` for automatic transaction management. This eliminates the need to manually pass `EntityManager` through function calls.

### How It Works

1. `TransactionService` stores the `EntityManager` in CLS context
2. `BaseRepository` automatically retrieves it via `getRepo()`
3. Use `@Transactional()` decorator or `TransactionService.runInTransaction()` to create transactions

### Using Transactions

**With decorator (recommended):**
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly transactionService: TransactionService,
  ) {}

  @Transactional()
  async createUserWithProfile(data: CreateUserDto) {
    // All repository calls within this method automatically use the same transaction
    const user = await this.userRepository.save(data)
    const profile = await this.profileRepository.save({ userId: user.id })
    // Automatic rollback on error
    return { user, profile }
  }
}
```

**With service method:**
```typescript
await this.transactionService.runInTransaction(async () => {
  await this.userRepository.save(data)
  await this.profileRepository.save(profile)
})
```

### Repository Implementation

All repositories should extend `BaseRepository`:
```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User) repository: Repository<User>,
    transactionService: TransactionService, // Required for transactions
    auditService: AuditService, // Required for automatic auditing
  ) {
    super(repository, transactionService, auditService)
  }

  // Custom methods
  async findByEmail(email: string) {
    return await this.getRepo().findOne({ where: { email } })
  }
}
```

### Important Notes

- Only use `@Transactional()` for operations that modify data, not simple queries
- The decorator requires `TransactionService` to be injected in the class constructor
- Nested `@Transactional()` calls reuse the parent transaction
- Always inject `TransactionService` and `AuditService` when extending `BaseRepository`

## Automatic Auditing with CLS

This project uses **CLS (Continuation Local Storage)** for automatic auditing. The system captures the authenticated user from HTTP requests and automatically applies `createdBy` and `updatedBy` fields without manual intervention.

**See [AUDIT_SYSTEM.md](./docs/AUDIT_SYSTEM.md) for complete documentation.**

### How It Works

1. `JwtAuthGuard` validates the JWT and adds user to `request.user`
2. `AuditInterceptor` captures `user.sub` (userId) and stores it in CLS
3. `BaseRepository` reads userId from CLS and applies it automatically in `save()`, `update()`, and `patch()`
4. All entities inherit `createdBy` and `updatedBy` from `BaseEntity`

### Automatic Usage (No Code Changes Needed)

Auditing happens automatically in all repository operations:

```typescript
@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(dto: CreateUserDto) {
    // ✅ createdBy is applied automatically from CLS
    const user = await this.userRepository.save(dto)
    return user // user.createdBy = current authenticated userId
  }
}
```

### Special Cases

**Seeds and Migrations:**
```typescript
// Run as "system" user
await this.auditService.runAsUser('system', async () => {
  await this.userRepository.save(defaultUsers)
  // createdBy = "system"
})

// Run without user (createdBy = null)
await this.auditService.runWithoutUser(async () => {
  await this.migrationRepository.save(data)
})
```

**Background Jobs:**
```typescript
@Cron('0 0 * * *')
async dailyJob() {
  await this.auditService.runAsUser('system:cron', async () => {
    // All operations have createdBy/updatedBy = "system:cron"
    await this.generateReports()
  })
}
```

### BaseEntity Fields

All entities automatically have these audit fields:

```typescript
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  createdBy?: string // ← Automatically filled on creation

  @Column({ nullable: true })
  updatedBy?: string // ← Automatically filled on updates

  @DeleteDateColumn()
  deletedAt?: Date
}
```

## Logger System

The application uses a comprehensive Winston-based logging system with visual formatting and specialized loggers.

### Log Levels

Levels are hierarchical (setting a level shows that level and all higher priority levels):
- `error` (0) - Critical errors
- `warn` (1) - Warnings
- `info` (2) - General information
- `http` (3) - HTTP requests (default)
- `verbose` (4) - Detailed information
- `debug` (5) - Debugging
- `silly` (6) - Very verbose

Set via `LOG_LEVEL` environment variable (default: `http`). Recommended: `debug` for development, `http` for staging, `info` for production.

### Specialized Loggers

- **HTTP Logger** - Logs all requests/responses with timing, status codes, User-Agent parsing
- **TypeORM Logger** - Formats SQL queries with syntax highlighting, detects slow queries
- **Exception Logger** - Captures unhandled exceptions with stack traces
- **Startup Logger** - ASCII banner with app info on startup

### Automatic Sanitization

The logger automatically redacts sensitive fields (password, token, apiKey, etc.) from logs.

### Log Files

Logs are automatically rotated daily and stored in `logs/`:
- `{logger-name}-%DATE%.log` - All logs
- `{logger-name}-error-%DATE%.log` - Errors only

Retention: 30 days, max 20MB per file, JSON format for easy parsing.

## Email System

Email module uses `@nestjs-modules/mailer` with Handlebars templates.

### Configuration

Set these environment variables:
```bash
MAIL_HOST=smtp.ethereal.email      # Use smtp.gmail.com for production
MAIL_PORT=587
MAIL_SECURE=false                   # false for port 587
MAIL_USER=your-email@ethereal.email
MAIL_PASSWORD=your-password
MAIL_FROM=noreply@audit-core.com
MAIL_FROM_NAME=Audit Core
APP_NAME=Audit Core
```

### Available Email Methods

- `sendWelcomeEmail({ to, userName, loginLink })` - Welcome new users
- `sendVerificationEmail({ to, userName, verificationLink })` - Email verification
- `sendTwoFactorCode({ to, userName, code, expiresInMinutes })` - 2FA codes
- `sendResetPasswordEmail({ to, userName, resetLink, expiresInMinutes })` - Password reset
- `sendCustomEmail(to, subject, templateName, context)` - Custom templates

### Template Structure

Templates are in `src/@core/email/templates/` and use a shared base layout (`layouts/base.hbs`). All templates are responsive and professionally styled.

## Security Tokens System

This project uses a **hybrid approach (JWT + Redis)** for all security-sensitive tokens (password reset, 2FA codes). This is the industry standard for processes that require maximum security.

### Why Hybrid (JWT + Redis)?

The hybrid approach combines the best of both worlds:

**JWT Benefits:**
- Stateless verification (can validate without database query)
- Contains all necessary data (userId, tokenId, expiration)
- Cryptographically signed (tamper-proof)
- Can be transmitted safely in URLs or headers

**Redis Benefits:**
- Revocable (can be invalidated immediately)
- One-time use (deleted after first use)
- Traceable (can list active tokens for auditing)
- Time-limited (TTL expires tokens automatically)

### How It Works

**Token Generation:**
1. Generate unique tokenId (UUID)
2. Store tokenId in Redis with TTL
3. Create JWT containing userId + tokenId
4. Return JWT to client

**Token Validation:**
1. Verify JWT signature (cryptographic validation)
2. Check JWT expiration (time validation)
3. Extract userId and tokenId from JWT
4. Verify tokenId exists in Redis (not revoked)
5. Delete from Redis after successful use (one-time use)

**Token Revocation:**
- Delete tokenId from Redis
- JWT becomes invalid even if not expired
- Useful when: password changed, suspicious activity, manual admin action

### Reset Password Tokens

Service: `ResetPasswordTokenService`

Environment variables:
```bash
RESET_PASSWORD_TOKEN_EXPIRES_IN=1h  # Token expiration time
RESET_PASSWORD_JWT_SECRET=your-secret-here  # REQUIRED for signing JWTs
```

Usage:
```typescript
// Generate token
const token = await this.resetPasswordTokenService.generateToken(userId)
// Returns JWT that should be sent in email link

// Validate token
const userId = await this.resetPasswordTokenService.validateToken(token)
if (userId) {
  // Token is valid, allow password change
}

// Revoke token (after successful password change)
await this.resetPasswordTokenService.revokeToken(token)
```

### Two-Factor Authentication (2FA) Tokens

Service: `TwoFactorTokenService`

Environment variables:
```bash
TWO_FACTOR_CODE_LENGTH=6              # Number of digits in code
TWO_FACTOR_CODE_EXPIRES_IN=5m         # Code expiration time
TWO_FACTOR_JWT_SECRET=your-secret-here  # REQUIRED for signing JWTs
```

Usage:
```typescript
// Generate 2FA code
const { code, token } = await this.twoFactorTokenService.generateCode(userId)
// `code`: numeric code to send to user (e.g., "123456")
// `token`: JWT to store in session/client for validation

// Validate code
const isValid = await this.twoFactorTokenService.validateCode(userId, code, token)
if (isValid) {
  // Code is valid and has been consumed (can't be reused)
}

// Revoke all user codes (security measure)
await this.twoFactorTokenService.revokeAllUserCodes(userId)
```

### Security Best Practices

**DO:**
- Always revoke tokens after successful use
- Use short TTL for sensitive operations (5m for 2FA, 1h for password reset)
- Revoke all tokens when user changes password/email
- Log token generation and validation attempts for auditing

**DON'T:**
- Never allow token reuse (always delete from Redis after use)
- Never skip JWT signature verification
- Never extend token expiration (generate new token instead)
- Never store sensitive data in JWT payload (only IDs)

## Testing Guidelines

### Unit Tests

- Run with `npm test`
- Test files use `.spec.ts` suffix
- Located in `src/` directory alongside source files
- Jest configuration in `package.json`

### Repository Testing Strategy

**BaseRepository (test once):**
- Test all generic CRUD methods
- Test CLS integration
- Use a dummy entity for testing
- See `src/@core/repositories/__tests__/` for examples

**Child Repositories (test custom methods only):**
- Do NOT test inherited methods (save, findById, etc.)
- Only test custom methods you add
- Mock BaseRepository calls
- See `src/@core/repositories/TESTING.md` for detailed guidelines

### E2E Tests

- Run with `npm run test:e2e`
- Configuration in `test/jest-e2e.json`
- Test files use `.e2e-spec.ts` suffix

## File Upload System

The `@core/files` module provides file upload functionality with:
- Local storage support (configurable path)
- Custom decorators: `@FileUpload()`, `@FileUploads()`
- Validators for file type and size
- Sharp integration for image processing

## Exception Handling

Global exception filter (`HttpExceptionFilter`) automatically:
- Captures all exceptions
- Logs them via LoggerService
- Formats responses consistently
- Hides sensitive details in production
- Includes stack traces in development

No manual exception handling needed - it works automatically across the entire application.

## Swagger/OpenAPI

API documentation is auto-generated via Swagger:
- Configured in `src/main.ts`
- Access at `/api` when running (typically `http://localhost:3001/api`)
- Uses decorators from `@nestjs/swagger`

## Environment Variables

Key environment variables (create `.env` file):
```bash
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db_name

# Logging
LOG_LEVEL=debug

# Email (see Email System section above)
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
# ... etc
```

## Git Workflow

This project uses Commitizen for conventional commits:
```bash
npm run commit  # Use instead of git commit
```

Commitlint enforces conventional commit format.

## Development Notes

- The application uses TypeORM with PostgreSQL
- Winston for structured logging with daily rotation
- CLS (nestjs-cls) for transaction context management
- All core modules are globally available once imported in AppModule
- The logger replaces NestJS default logger (`app.useLogger(logger)`)
- SQL queries are automatically formatted and logged by TypeORM logger
