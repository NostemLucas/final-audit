import { Entity, Column } from 'typeorm'
import { BaseEntity } from '@core/entities'

@Entity('organizations')
export class OrganizationEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 200, unique: true })
  name: string

  @Column({ type: 'varchar', length: 50, unique: true })
  nit: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null

  @Column({ type: 'boolean', default: true })
  isActive: boolean
}
