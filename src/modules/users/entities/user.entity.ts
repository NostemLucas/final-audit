import { OrganizationEntity } from '../../organizations'
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BaseEntity } from '@core/entities/base.entity'

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum Role {
  ADMIN = 'admin',
  GERENTE = 'gerente',
  AUDITOR = 'auditor',
  USUARIO = 'usuario',
}

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  names: string

  @Column({ type: 'varchar', length: 50 })
  lastNames: string

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string

  @Column({ type: 'varchar', length: 30, unique: true })
  username: string

  @Column({ type: 'varchar', length: 15, unique: true })
  ci: string

  @Column({ type: 'varchar', length: 255, select: false })
  password: string

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null

  @ManyToOne(() => OrganizationEntity, {
    nullable: true,
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
