import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Transactional } from '@core/database'
import { EmailService } from '@core/email'
import { CreateUserDto } from '../../dtos'
import { UserEntity } from '../../entities/user.entity'
import { UserValidator } from '../../validators/user.validator'
import { UserFactory } from '../../factories/user.factory'
import { VerifyEmailUseCase } from '../verify-email/verify-email.use-case'
import { USERS_REPOSITORY } from '../../tokens'
import type { IUsersRepository } from '../../repositories'

/**
 * Caso de uso: Crear un nuevo usuario
 *
 * Responsabilidades:
 * - Validar constraints únicas (email, username, CI)
 * - Validar que la organización existe
 * - Validar roles exclusivos
 * - Crear entidad de usuario con datos normalizados
 * - Persistir el usuario en la base de datos
 * - Enviar email de verificación
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly validator: UserValidator,
    private readonly userFactory: UserFactory,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Transactional()
  async execute(dto: CreateUserDto): Promise<UserEntity> {
    // 1. Validaciones
    this.validator.validateRoles(dto.roles)
    await this.validator.validateUniqueConstraints(
      dto.email,
      dto.username,
      dto.ci,
    )
    await this.validator.validateOrganizationExists(dto.organizationId)

    // 2. Crear usuario (status = INACTIVE por defecto)
    const user = await this.userFactory.createFromDto(dto)
    const savedUser = await this.usersRepository.save(user)

    // 3. Generar token de verificación
    const verificationToken =
      await this.verifyEmailUseCase.generateVerificationToken(savedUser.id)

    // 4. Construir link de verificación
    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000')
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`

    // 5. Enviar email de verificación
    try {
      await this.emailService.sendVerificationEmail({
        to: savedUser.email,
        userName: savedUser.fullName,
        verificationLink,
      })
    } catch (error) {
      // Log error but don't fail user creation
      console.error('Error sending verification email:', error)
    }

    return savedUser
  }
}
