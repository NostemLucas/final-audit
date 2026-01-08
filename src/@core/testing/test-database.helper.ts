import { DataSource, DataSourceOptions, EntityTarget } from 'typeorm'

/**
 * Crea un DataSource de TypeORM con SQLite en memoria para tests
 *
 * @param entities - Array de entidades a registrar
 * @param options - Opciones adicionales (opcional)
 * @returns DataSource inicializado
 *
 * @example
 * ```typescript
 * const dataSource = await createInMemoryDataSource([
 *   OrganizationEntity,
 *   UserEntity,
 * ])
 *
 * // Usar en tests
 * const repository = dataSource.getRepository(OrganizationEntity)
 *
 * // Limpiar después
 * await dataSource.destroy()
 * ```
 */
export async function createInMemoryDataSource(
  entities: Function[],
  options?: Partial<DataSourceOptions>,
): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:', // ✅ En memoria - muy rápido
    entities,
    synchronize: true, // ✅ Crea tablas automáticamente
    logging: false, // Silencioso en tests
    dropSchema: false,
    ...options,
  })

  await dataSource.initialize()
  return dataSource
}

/**
 * Limpia todas las tablas del DataSource
 *
 * @param dataSource - DataSource a limpiar
 *
 * @example
 * ```typescript
 * afterEach(async () => {
 *   await cleanDatabase(dataSource)
 * })
 * ```
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas

  // Limpiar en orden inverso para respetar foreign keys
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i]
    const repository = dataSource.getRepository(entity.name)
    await repository.query(`DELETE FROM ${entity.tableName}`)
  }
}

/**
 * Limpia una tabla específica
 *
 * @param dataSource - DataSource
 * @param entity - Entidad a limpiar
 *
 * @example
 * ```typescript
 * await cleanTable(dataSource, OrganizationEntity)
 * ```
 */
export async function cleanTable<Entity>(
  dataSource: DataSource,
  entity: EntityTarget<Entity>,
): Promise<void> {
  const repository = dataSource.getRepository(entity)
  await repository.clear()
}

/**
 * Obtiene el count de una tabla
 *
 * @param dataSource - DataSource
 * @param entity - Entidad
 * @returns Número de registros
 */
export async function getTableCount<Entity>(
  dataSource: DataSource,
  entity: EntityTarget<Entity>,
): Promise<number> {
  const repository = dataSource.getRepository(entity)
  return await repository.count()
}
