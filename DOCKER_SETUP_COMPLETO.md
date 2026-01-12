# ✅ Docker Setup - Redis Configurado Exitosamente

## 🎉 ¡Todo Listo!

Se ha configurado exitosamente **PostgreSQL** y **Redis** con Docker Compose.

---

## 📦 Servicios Activos

### ✅ PostgreSQL 16
- **Estado:** ✅ Running (healthy)
- **Puerto:** 5432
- **Contenedor:** `atr_postgres`
- **Base de datos:** `audit_core_db`
- **Usuario:** postgres
- **Contraseña:** postgres

### ✅ Redis 7
- **Estado:** ✅ Running (healthy)
- **Puerto:** 6379
- **Contenedor:** `atr_redis`
- **Persistencia:** AOF habilitado
- **Sin contraseña** (desarrollo local)

---

## 🚀 Comandos Rápidos NPM

```bash
# Iniciar servicios
npm run docker:up

# Ver estado
npm run docker:ps

# Ver logs
npm run docker:logs

# Detener servicios (mantiene datos)
npm run docker:down
```

---

## 🔧 Verificar que Todo Funciona

### Opción 1: Script Automático
```bash
npm run docker:verify
```

### Opción 2: Verificación Manual

#### PostgreSQL
```bash
# Test de conexión
docker exec -it atr_postgres psql -U postgres -d audit_core_db -c "SELECT 1"

# Conectarse interactivamente
docker exec -it atr_postgres psql -U postgres -d audit_core_db
```

#### Redis
```bash
# Test de ping
docker exec -it atr_redis redis-cli ping
# Debería responder: PONG

# Test de set/get
docker exec -it atr_redis redis-cli
SET test "Hello Redis"
GET test
exit
```

---

## 📋 Variables de Entorno

Tu `.env` ya está configurado correctamente:

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audit_core_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

✅ **No necesitas cambiar nada**

---

## 🏃 Workflow de Desarrollo

### Primera Vez (Setup Inicial)
```bash
# 1. Iniciar Docker
npm run docker:up

# 2. Verificar servicios
npm run docker:ps

# 3. Instalar dependencias
npm install

# 4. Ejecutar migraciones
npm run migration:run

# 5. Ejecutar seeds
npm run seed:run

# 6. Iniciar la app
npm run start:dev
```

### Día a Día
```bash
# Iniciar servicios
npm run docker:up

# Iniciar app
npm run start:dev

# (Al terminar)
npm run docker:down
```

---

## 📊 Estado Actual

```
══════════════════════════════════════════════════════════════════════
Docker Compose v2 - Servicios Activos
══════════════════════════════════════════════════════════════════════

✅ PostgreSQL 16:
   • Container: atr_postgres
   • Status: Up (healthy)
   • Port: 5432
   • Database: audit_core_db

✅ Redis 7:
   • Container: atr_redis
   • Status: Up (healthy)
   • Port: 6379
   • Persistence: AOF enabled

✅ Network: atr_network (bridge)
✅ Volumes: postgres_data, redis_data

══════════════════════════════════════════════════════════════════════
```

---

## 🛠️ Comandos Docker Directos

Si prefieres usar Docker directamente:

```bash
# Iniciar
docker compose up -d

# Estado
docker compose ps

# Logs
docker compose logs -f

# Detener
docker compose down

# Detener y eliminar datos (⚠️ destructivo)
docker compose down -v
```

---

## 🔍 Troubleshooting

### Error: Redis connection ECONNREFUSED
**Causa:** Redis no está corriendo

**Solución:**
```bash
# Ver estado
npm run docker:ps

# Si no está corriendo
npm run docker:up

# Ver logs
npm run docker:logs
```

### Error: Puerto 6379 ya está en uso
**Causa:** Otro servicio está usando el puerto

**Solución:**
```bash
# Ver qué proceso usa el puerto
lsof -i :6379

# Detener el proceso o cambiar puerto en docker-compose.yml
ports:
  - '6380:6379'  # Cambiar 6379 a 6380 en el lado izquierdo
```

### Los datos se perdieron
**Causa:** Se usó `docker compose down -v`

**Solución:**
```bash
# Recrear base de datos
npm run docker:up
npm run migration:run
npm run seed:run
```

---

## 📚 Documentación

- **Guía Completa:** [DOCKER.md](./DOCKER.md)
- **Comandos Comunes:** [CLAUDE.md](./CLAUDE.md)
- **Script de Verificación:** `npm run docker:verify`

---

## ✨ Características Implementadas

### Healthchecks
- ✅ PostgreSQL: `pg_isready` cada 10s
- ✅ Redis: `redis-cli ping` cada 10s

### Persistencia
- ✅ PostgreSQL: Volumen `postgres_data`
- ✅ Redis: Volumen `redis_data` + AOF

### Networking
- ✅ Red aislada `atr_network`
- ✅ Contenedores pueden comunicarse
- ✅ Puertos expuestos al host

---

## 🎯 Próximos Pasos

1. ✅ **Docker configurado** - Redis y PostgreSQL corriendo
2. 🔄 **Ejecutar migraciones** - `npm run migration:run`
3. 🔄 **Ejecutar seeds** - `npm run seed:run`
4. 🚀 **Iniciar app** - `npm run start:dev`

---

## 📊 Checklist

```
✅ Docker Compose instalado (v2)
✅ docker-compose.yml configurado
✅ Redis agregado al compose
✅ PostgreSQL con healthcheck
✅ Redis con healthcheck y AOF
✅ Volúmenes persistentes
✅ Red aislada configurada
✅ Puertos mapeados (5432, 6379)
✅ Variables en .env correctas
✅ Comandos npm configurados
✅ Script de verificación creado
✅ Documentación completa
✅ Servicios corriendo y saludables
```

---

## 🎉 ¡Felicitaciones!

Redis y PostgreSQL están configurados y corriendo perfectamente.

Tu aplicación ahora puede:
- ✅ Conectarse a PostgreSQL en `localhost:5432`
- ✅ Conectarse a Redis en `localhost:6379`
- ✅ Usar Redis para blacklist de tokens JWT
- ✅ Usar Redis para almacenar refresh tokens
- ✅ Usar Redis para caché (si lo implementas)

**No deberías ver más errores de conexión a Redis.** 🚀

---

**Fecha de configuración:** 2026-01-11
**Docker Compose:** v5.0.1
**PostgreSQL:** 16-alpine
**Redis:** 7-alpine
