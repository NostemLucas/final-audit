/**
 * Acciones de políticas
 *
 * Para FRONTEND:
 * - read: Ver/acceder a una ruta
 * - create: Crear nuevos recursos desde esa ruta
 * - update: Editar recursos desde esa ruta
 * - delete: Eliminar recursos desde esa ruta
 *
 * Para BACKEND (HTTP methods):
 * - GET: Leer recursos
 * - POST: Crear recursos
 * - PATCH: Actualizar recursos parcialmente
 * - PUT: Actualizar recursos completamente
 * - DELETE: Eliminar recursos
 */
export enum PolicyAction {
  // Frontend actions (CRUD)
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',

  // Backend actions (HTTP methods)
  GET = 'GET',
  POST = 'POST',
  PATCH = 'PATCH',
  PUT = 'PUT',
  HTTP_DELETE = 'DELETE',
}
