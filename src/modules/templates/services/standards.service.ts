import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, IsNull } from 'typeorm'
import { StandardEntity } from '../entities/standard.entity'
import { CreateStandardDto, UpdateStandardDto } from '../dtos'

@Injectable()
export class StandardsService {
  constructor(
    @InjectRepository(StandardEntity)
    private readonly standardRepository: Repository<StandardEntity>,
  ) {}

  async create(createStandardDto: CreateStandardDto): Promise<StandardEntity> {
    // Calcular el nivel automáticamente si tiene padre
    if (createStandardDto.parentId) {
      const parent = await this.findOne(createStandardDto.parentId)
      createStandardDto.level = parent.level + 1
    } else {
      createStandardDto.level = 1
    }

    const standard = this.standardRepository.create(createStandardDto)
    return await this.standardRepository.save(standard)
  }

  async findAll(): Promise<StandardEntity[]> {
    return await this.standardRepository.find({
      relations: ['template', 'parent', 'children'],
      order: { order: 'ASC' },
    })
  }

  async findByTemplate(templateId: string): Promise<StandardEntity[]> {
    return await this.standardRepository.find({
      where: { templateId },
      relations: ['parent', 'children'],
      order: { order: 'ASC' },
    })
  }

  async findByTemplateTree(templateId: string): Promise<StandardEntity[]> {
    // Obtener solo los nodos raíz (sin padre) de la plantilla
    const rootStandards = await this.standardRepository.find({
      where: {
        templateId,
        parentId: IsNull(),
      },
      relations: ['children'],
      order: { order: 'ASC' },
    })

    // Cargar recursivamente todos los hijos
    for (const root of rootStandards) {
      await this.loadChildren(root)
    }

    return rootStandards
  }

  private async loadChildren(standard: StandardEntity): Promise<void> {
    if (standard.children && standard.children.length > 0) {
      // Ordenar hijos
      standard.children.sort((a, b) => a.order - b.order)

      // Cargar hijos de forma recursiva
      for (const child of standard.children) {
        const fullChild = await this.standardRepository.findOne({
          where: { id: child.id },
          relations: ['children'],
        })
        if (fullChild) {
          child.children = fullChild.children
          await this.loadChildren(child)
        }
      }
    }
  }

  async findOne(id: string): Promise<StandardEntity> {
    const standard = await this.standardRepository.findOne({
      where: { id },
      relations: ['template', 'parent', 'children'],
    })

    if (!standard) {
      throw new NotFoundException(`Standard con ID ${id} no encontrado`)
    }

    return standard
  }

  async findChildren(parentId: string): Promise<StandardEntity[]> {
    return await this.standardRepository.find({
      where: { parentId },
      relations: ['children'],
      order: { order: 'ASC' },
    })
  }

  async findAuditableByTemplate(templateId: string): Promise<StandardEntity[]> {
    return await this.standardRepository.find({
      where: {
        templateId,
        isAuditable: true,
        isActive: true,
      },
      order: { order: 'ASC' },
    })
  }

  async update(
    id: string,
    updateStandardDto: UpdateStandardDto,
  ): Promise<StandardEntity> {
    const standard = await this.findOne(id)

    // Validar que no se establezca a sí mismo como padre
    if (
      updateStandardDto.parentId &&
      updateStandardDto.parentId === standard.id
    ) {
      throw new BadRequestException('Un standard no puede ser su propio padre')
    }

    // Recalcular nivel si cambia el padre
    if (
      updateStandardDto.parentId !== undefined &&
      updateStandardDto.parentId !== standard.parentId
    ) {
      if (updateStandardDto.parentId) {
        const parent = await this.findOne(updateStandardDto.parentId)
        updateStandardDto.level = parent.level + 1
      } else {
        updateStandardDto.level = 1
      }
    }

    Object.assign(standard, updateStandardDto)
    return await this.standardRepository.save(standard)
  }

  async remove(id: string): Promise<void> {
    const standard = await this.findOne(id)

    // Verificar si tiene hijos
    if (standard.children && standard.children.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar un standard que tiene hijos. Elimine primero los hijos o muévalos a otro padre.',
      )
    }

    await this.standardRepository.remove(standard)
  }

  async deactivate(id: string): Promise<StandardEntity> {
    const standard = await this.findOne(id)
    standard.isActive = false
    return await this.standardRepository.save(standard)
  }

  async activate(id: string): Promise<StandardEntity> {
    const standard = await this.findOne(id)
    standard.isActive = true
    return await this.standardRepository.save(standard)
  }
}
