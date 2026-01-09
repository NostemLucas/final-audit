import 'reflect-metadata'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { PaginationDto } from './pagination.dto'

describe('PaginationDto', () => {
  const transformOptions = {
    enableImplicitConversion: true,
  }
  it('debe validar con valores por defecto correctos', async () => {
    const target = {}
    const dto = plainToInstance(PaginationDto, target, transformOptions)
    const errors = await validate(dto)

    expect(errors.length).toBe(0)
    expect(dto.page).toBe(1)
    expect(dto.limit).toBe(10)
    expect(dto.all).toBe(false)
    expect(dto.sortOrder).toBe('DESC')
  })

  it('debe transformar strings numéricos de la URL a numbers', () => {
    const target = { page: '5', limit: '20' }
    const dto = plainToInstance(PaginationDto, target)

    expect(typeof dto.page).toBe('number')
    expect(dto.page).toBe(5)
    expect(dto.limit).toBe(20)
  })

  it('debe fallar si el limit excede el máximo permitido (100)', async () => {
    const target = { limit: '101' }
    const dto = plainToInstance(PaginationDto, target)
    const errors = await validate(dto)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('limit')
  })

  it('debe transformar correctamente el string "true" a booleano', async () => {
    const target = { all: 'true' }
    const dto = plainToInstance(PaginationDto, target)

    expect(dto.all).toBe(true)
    const errors = await validate(dto)
    expect(errors.length).toBe(0)
  })

  it('debe fallar si page es menor a 1', async () => {
    const target = { page: '0' }
    const dto = plainToInstance(PaginationDto, target)
    const errors = await validate(dto)

    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('page')
  })
})
