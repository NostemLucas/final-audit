# 🐳 Docker Setup - PostgreSQL & Redis

Configuración de servicios con Docker Compose para desarrollo local.

---

## 📦 Servicios Incluidos

### PostgreSQL 16
- **Puerto:** 5432
- **Usuario:** postgres
- **Contraseña:** postgres
- **Base de datos:** audit_core_db
- **Volumen persistente:** postgres_data

### Redis 7
- **Puerto:** 6379
- **Sin contraseña** (desarrollo local)
- **Persistencia:** AOF (Append Only File)
- **Volumen persistente:** redis_data

---

## 🚀 Comandos Rápidos

### Iniciar todos los servicios
```bash
docker-compose up -d
```

### Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Solo PostgreSQL
docker-compose logs -f postgres

# Solo Redis
docker-compose logs -f redis
```

### Ver estado
```bash
docker-compose ps
```

### Detener servicios
```bash
docker-compose down
```

### Detener y eliminar volúmenes (⚠️ BORRA TODOS LOS DATOS)
```bash
docker-compose down -v
```

### Reiniciar un servicio específico
```bash
# Solo PostgreSQL
docker-compose restart postgres

# Solo Redis
docker-compose restart redis
```

---

## 🔧 Verificar que Funciona

### Verificar PostgreSQL
```bash
# Conectarse a PostgreSQL desde el contenedor
docker exec -it atr_postgres psql -U postgres -d audit_core_db

# Salir del psql
\q

# O verificar desde tu máquina (si tienes psql instalado)
psql -h localhost -p 5432 -U postgres -d audit_core_db
```

### Verificar Redis
```bash
# Conectarse a Redis desde el contenedor
docker exec -it atr_redis redis-cli

# Probar comandos
PING
# Debería responder: PONG

SET test "Hello"
GET test
# Debería responder: "Hello"

# Salir
exit

# O verificar desde tu máquina (si tienes redis-cli instalado)
redis-cli -h localhost -p 6379 ping
```

---

## 🔄 Workflow de Desarrollo

### Primera vez (setup inicial)
```bash
# 1. Iniciar servicios
docker-compose up -d

# 2. Esperar que estén listos (healthcheck)
docker-compose ps

# 3. Instalar dependencias de Node
npm install

# 4. Ejecutar migraciones
npm run migration:run

# 5. Ejecutar seeds
npm run seed:run

# 6. Iniciar la aplicación
npm run start:dev
```

### Día a día
```bash
# 1. Iniciar servicios (si no están corriendo)
docker-compose up -d

# 2. Iniciar la aplicación
npm run start:dev
```

### Al terminar el día
```bash
# Detener servicios (los datos se mantienen)
docker-compose down
```

---

## 🔒 Variables de Entorno

Asegúrate de tener estas variables en tu `.env`:

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audit_core_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## 📊 Healthchecks

Ambos servicios tienen healthchecks configurados:

- **PostgreSQL:** `pg_isready` cada 10s
- **Redis:** `redis-cli ping` cada 10s

Ver estado de salud:
```bash
docker-compose ps
```

Debería mostrar:
```
NAME           IMAGE                 STATUS                   PORTS
atr_postgres   postgres:16-alpine    Up (healthy)             0.0.0.0:5432->5432/tcp
atr_redis      redis:7-alpine        Up (healthy)             0.0.0.0:6379->6379/tcp
```

---

## 🗄️ Gestión de Datos

### Backup de PostgreSQL
```bash
# Crear backup
docker exec atr_postgres pg_dump -U postgres audit_core_db > backup.sql

# Restaurar backup
docker exec -i atr_postgres psql -U postgres audit_core_db < backup.sql
```

### Backup de Redis
```bash
# Crear backup (copia el archivo AOF)
docker cp atr_redis:/data/appendonly.aof ./redis-backup.aof

# Restaurar backup
docker cp ./redis-backup.aof atr_redis:/data/appendonly.aof
docker-compose restart redis
```

### Limpiar todo y empezar de cero
```bash
# ⚠️ ESTO BORRA TODOS LOS DATOS
docker-compose down -v
docker-compose up -d
npm run migration:run
npm run seed:run
```

---

## 🐛 Troubleshooting

### Error: "port is already allocated"
Otro servicio está usando el puerto 5432 o 6379.

**Solución:**
```bash
# Ver qué proceso usa el puerto
lsof -i :5432
lsof -i :6379

# Detener el proceso o cambiar el puerto en docker-compose.yml
ports:
  - '5433:5432'  # Cambiar puerto local
```

### Error: "Cannot connect to database"
El contenedor puede no estar listo aún.

**Solución:**
```bash
# Ver logs
docker-compose logs postgres

# Esperar a que el healthcheck pase
docker-compose ps

# Verificar que está corriendo
docker exec -it atr_postgres pg_isready -U postgres
```

### Error: Redis connection refused
El contenedor puede no estar corriendo.

**Solución:**
```bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs redis

# Reiniciar
docker-compose restart redis
```

### Los datos se perdieron después de `docker-compose down`
Por defecto, los volúmenes se mantienen. Solo se borran con `-v`.

**Para recuperar:**
```bash
# Si usaste -v accidentalmente, no se puede recuperar
# Necesitarás recrear la base de datos:
docker-compose up -d
npm run migration:run
npm run seed:run
```

---

## 📝 Notas

### Persistencia
- Los datos de PostgreSQL se guardan en el volumen `postgres_data`
- Los datos de Redis se guardan en el volumen `redis_data`
- Los volúmenes persisten aunque los contenedores se detengan
- Solo se borran con `docker-compose down -v`

### Redis AOF (Append Only File)
Redis está configurado con `appendonly yes` para mayor durabilidad:
- Cada escritura se guarda en disco
- Mayor seguridad de datos vs solo snapshots
- Ligero impacto en rendimiento (aceptable para desarrollo)

### Red
- Ambos servicios están en la red `atr_network`
- Los contenedores pueden comunicarse entre sí por nombre
- La aplicación Node se conecta desde el host (localhost)

---

## 🚀 Para Producción

En producción, considera:

1. **Usar servicios administrados:**
   - AWS RDS (PostgreSQL)
   - AWS ElastiCache (Redis)
   - O equivalentes en tu cloud provider

2. **Si usas Docker en producción:**
   - Agregar contraseñas seguras
   - Usar Docker Swarm o Kubernetes
   - Configurar backups automáticos
   - Usar volúmenes externos
   - Configurar límites de recursos

---

## 📋 Checklist de Setup

```
[ ] docker-compose.yml configurado
[ ] Variables en .env configuradas
[ ] docker-compose up -d ejecutado
[ ] Servicios saludables (docker-compose ps)
[ ] PostgreSQL conecta (psql o app)
[ ] Redis conecta (redis-cli o app)
[ ] Migraciones ejecutadas
[ ] Seeds ejecutadas
[ ] Aplicación conecta correctamente
```

---

## 🎯 Comandos Útiles de Un Vistazo

```bash
# Inicio rápido
docker-compose up -d && npm run start:dev

# Ver todo
docker-compose ps && docker-compose logs --tail=50

# Reinicio completo
docker-compose restart && npm run start:dev

# Limpieza completa (⚠️ borra datos)
docker-compose down -v && docker-compose up -d && npm run migration:run && npm run seed:run

# Detener todo
docker-compose down && pkill -f "node.*start:dev"
```

---

**Documentación oficial:**
- [Docker Compose](https://docs.docker.com/compose/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Redis Docker](https://hub.docker.com/_/redis)
