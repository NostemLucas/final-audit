import { PaginatedResponseBuilder } from './paginated-response.dto'

describe('PaginatedResponseBuilder', () => {
  it('debe crear una respuesta paginada correctamente', () => {
    const data = [{ id: 1 }, { id: 2 }]
    const total = 2
    const page = 1
    const limit = 10

    const response = PaginatedResponseBuilder.create(data, total, page, limit)

    expect(response.data).toEqual(data)
    expect(response.meta.totalPages).toBe(1)
    expect(response.meta.total).toBe(total)
    expect(response.meta.hasNextPage).toBe(false)
    expect(response.meta.hasPrevPage).toBe(false)
    expect(response.meta.page).toBe(page)
    expect(response.meta.limit).toBe(limit)
  })

  it('debe crear una repuesta correcta para cuando se solicitan todos los registros', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const response = PaginatedResponseBuilder.createAll(data)

    expect(response.data).toEqual(data)
    expect(response.meta.total).toBe(3)
    expect(response.meta.page).toBe(1)
    expect(response.meta.limit).toBe(3)
    expect(response.meta.totalPages).toBe(1)
    expect(response.meta.hasNextPage).toBe(false)
    expect(response.meta.hasPrevPage).toBe(false)
  })

  it('debe calcular correctamente hasNextPage y hasPrevPage', () => {
    const data = [{ id: 1 }, { id: 2 }]
    const total = 25
    const limit = 10

    // Página 1
    let response = PaginatedResponseBuilder.create(data, total, 1, limit)
    expect(response.meta.hasNextPage).toBe(true)
    expect(response.meta.hasPrevPage).toBe(false)

    // Página 2
    response = PaginatedResponseBuilder.create(data, total, 2, limit)
    expect(response.meta.hasNextPage).toBe(true)
    expect(response.meta.hasPrevPage).toBe(true)

    // Página 3
    response = PaginatedResponseBuilder.create(data, total, 3, limit)
    expect(response.meta.hasNextPage).toBe(false)
    expect(response.meta.hasPrevPage).toBe(true)
  })
})
