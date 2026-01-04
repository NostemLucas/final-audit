import { Exclude } from 'class-transformer'
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Exclude()
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date

  @Exclude()
  @Column({ type: 'varchar', name: 'created_by', nullable: true })
  createdBy?: string

  @Exclude()
  @Column({ type: 'varchar', name: 'updated_by', nullable: true })
  updatedBy?: string

  @Exclude()
  @DeleteDateColumn()
  deletedAt?: Date
}
