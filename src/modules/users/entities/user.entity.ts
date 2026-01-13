import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'
import { OrganizationEntity } from '../../organizations/entities/organization.entity'
import { USER_CONSTRAINTS } from '../constants/user-schema.constants'

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum Role {
  ADMIN = 'admin',
  GERENTE = 'gerente',
  AUDITOR = 'auditor',
  CLIENTE = 'cliente',
}

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: USER_CONSTRAINTS.NAMES.MAX })
  names: string

  @Column({ type: 'varchar', length: USER_CONSTRAINTS.LAST_NAMES.MAX })
  lastNames: string

  @Column({ type: 'varchar', length: USER_CONSTRAINTS.EMAIL.MAX, unique: true })
  email: string

  @Column({
    type: 'varchar',
    length: USER_CONSTRAINTS.USERNAME.MAX,
    unique: true,
  })
  username: string

  @Column({ type: 'varchar', length: USER_CONSTRAINTS.CI.MAX, unique: true })
  ci: string

  // Password hashada (bcrypt genera ~60 chars, usamos 255 para seguridad)
  @Column({ type: 'varchar', length: 255, select: false })
  password: string

  @Column({
    type: 'varchar',
    length: USER_CONSTRAINTS.PHONE.MAX,
    nullable: true,
  })
  phone: string | null

  @Column({
    type: 'varchar',
    length: USER_CONSTRAINTS.ADDRESS.MAX,
    nullable: true,
  })
  address: string | null

  @Column({
    type: 'varchar',
    length: USER_CONSTRAINTS.IMAGE.MAX,
    nullable: true,
  })
  image: string | null

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  // Requerido: Todo usuario debe pertenecer a una organización
  @Column({ type: 'uuid', nullable: false })
  organizationId: string

  @ManyToOne(() => OrganizationEntity, {
    nullable: false,
  })
  @JoinColumn({ name: 'organizationId' })
  organization: OrganizationEntity

  @Column({
    type: 'simple-array',
  })
  roles: Role[]

  // Computed properties
  get fullName(): string {
    return `${this.names} ${this.lastNames}`
  }
}
