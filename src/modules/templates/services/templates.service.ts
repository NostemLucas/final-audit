import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { TemplateEntity } from '../entities/template.entity'
import { CreateTemplateDto, UpdateTemplateDto } from '../dtos'

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TemplateEntity)
    private readonly templateRepository: Repository<TemplateEntity>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<TemplateEntity> {
    const template = this.templateRepository.create(createTemplateDto)
    return await this.templateRepository.save(template)
  }

  async findAll(): Promise<TemplateEntity[]> {
    return await this.templateRepository.find({
      order: { createdAt: 'DESC' },
    })
  }

  async findAllActive(): Promise<TemplateEntity[]> {
    return await this.templateRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    })
  }

  async findOne(id: string): Promise<TemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['standards'],
    })

    if (!template) {
      throw new NotFoundException(`Template con ID ${id} no encontrada`)
    }

    return template
  }

  async findByName(name: string): Promise<TemplateEntity | null> {
    return await this.templateRepository.findOne({
      where: { name },
    })
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateEntity> {
    const template = await this.findOne(id)
    Object.assign(template, updateTemplateDto)
    return await this.templateRepository.save(template)
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id)
    await this.templateRepository.remove(template)
  }

  async deactivate(id: string): Promise<TemplateEntity> {
    const template = await this.findOne(id)
    template.isActive = false
    return await this.templateRepository.save(template)
  }

  async activate(id: string): Promise<TemplateEntity> {
    const template = await this.findOne(id)
    template.isActive = true
    return await this.templateRepository.save(template)
  }
}
