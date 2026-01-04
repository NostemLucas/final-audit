import { Entity, Column } from 'typeorm'
import { BaseEntity } from '@core/entities'

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string

  @Column()
  name: string

  @Column({ nullable: true })
  profileId?: string
}
