# 🔧 Guía de Configuración del .env

## 🚀 Quick Start (Configuración Rápida)

### 1. Copiar el template
```bash
cp .env.example .env
```

### 2. Configuraciones MÍNIMAS para empezar

Edita `.env` y configura **solo estos 3 items**:

#### a) **Database** (PostgreSQL)
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audit_core_db
```

**Crear la base de datos:**
```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE audit_core_db;

# Salir
\q
```

#### b) **Email** (Ethereal - para testing)

1. Ve a: https://ethereal.email/create
2. Copia las credenciales generadas
3. Pega en `.env`:

```bash
MAIL_USER=tu-email-generado@ethereal.email
MAIL_PASSWORD=tu-password-generado
```

**✅ Con Ethereal puedes ver los emails en**: https://ethereal.email/messages

#### c) **JWT Secret** (genera uno random)

```bash
# Generar JWT secret
openssl rand -base64 32

# Copiar el resultado y pegar en .env:
JWT_SECRET=el-string-generado-aqui
JWT_REFRESH_SECRET=otro-string-generado-aqui
```

**O usa este comando directo:**
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

---

## 📊 Configuración por Entorno

### 🟢 DESARROLLO (Local)

```bash
NODE_ENV=development
LOG_LEVEL=debug
MAIL_HOST=smtp.ethereal.email  # Emails de prueba
CORS_ORIGIN=*  # Permite todo
SWAGGER_ENABLED=true  # Documentación habilitada
```

### 🟡 STAGING (Servidor de pruebas)

```bash
NODE_ENV=staging
LOG_LEVEL=http
MAIL_HOST=smtp.gmail.com  # Email real
CORS_ORIGIN=https://staging.tu-app.com
SWAGGER_ENABLED=true
```

### 🔴 PRODUCCIÓN

```bash
NODE_ENV=production
LOG_LEVEL=info
MAIL_HOST=smtp.gmail.com  # Email real
CORS_ORIGIN=https://tu-app.com
SWAGGER_ENABLED=false  # Deshabilitar en producción
```

---

## 📧 Configuración de Email por Proveedor

### Ethereal (Testing - Recomendado para desarrollo)

```bash
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=<generado-en-ethereal>
MAIL_PASSWORD=<generado-en-ethereal>
```

**URL**: https://ethereal.email/create

### Gmail (Producción)

1. Habilitar "App Passwords" en tu cuenta de Gmail:
   - Ve a: https://myaccount.google.com/security
   - Buscar: "App passwords" o "Contraseñas de aplicaciones"
   - Generar contraseña para "Mail"

2. Configurar en `.env`:
```bash
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-email@gmail.com
MAIL_PASSWORD=<app-password-generado>
MAIL_FROM=noreply@tu-dominio.com
MAIL_FROM_NAME="Tu App"
```

### SendGrid (Alternativa profesional)

```bash
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=apikey
MAIL_PASSWORD=<tu-sendgrid-api-key>
```

### Mailgun (Alternativa profesional)

```bash
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=<tu-usuario-mailgun>
MAIL_PASSWORD=<tu-password-mailgun>
```

---

## 🗄️ Configuración de Database

### PostgreSQL Local (Docker)

```bash
# Crear contenedor
docker run -d \
  --name audit-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=audit_core_db \
  -p 5432:5432 \
  postgres:15

# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audit_core_db
```

### PostgreSQL Local (Instalado directamente)

```bash
# Linux/Mac
sudo -u postgres psql
CREATE DATABASE audit_core_db;
CREATE USER audit_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE audit_core_db TO audit_user;

# .env
DATABASE_URL=postgresql://audit_user:secure_password@localhost:5432/audit_core_db
```

### PostgreSQL en la Nube (Supabase/Railway/Render)

1. Crea un proyecto en la plataforma
2. Copia la connection string
3. Pégala en `.env`:

```bash
DATABASE_URL=postgresql://usuario:password@host:puerto/database?sslmode=require
```

---

## 🔒 Generación de Secrets

### Opción 1: OpenSSL (Recomendado)

```bash
# Generar un secret fuerte
openssl rand -base64 32

# Generar hex (alternativa)
openssl rand -hex 32
```

### Opción 2: Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Opción 3: Online (menos seguro)

https://generate-secret.vercel.app/32

---

## ✅ Verificar Configuración

### 1. Verificar que el .env se cargó

```bash
npm run start:dev
```

Deberías ver en los logs:
```
[Nest] INFO Starting Nest application...
[Database] Connected to PostgreSQL
[Logger] Log level: debug
```

### 2. Test de Email

```bash
# Comando del proyecto
npm run email:test

# O prueba manual
npm run email:test:welcome
```

### 3. Test de Database

```bash
# Correr migraciones
npm run migration:run

# Ver status
npm run migration:show
```

### 4. Acceder a Swagger

http://localhost:3001/api

---

## 🚨 Troubleshooting

### Error: Cannot connect to database

```bash
# Verificar que PostgreSQL está corriendo
# Linux/Mac
sudo service postgresql status

# Docker
docker ps | grep postgres
```

### Error: EAUTH (Email authentication failed)

- Verifica que copiaste correctamente las credenciales de Ethereal
- Si usas Gmail, verifica que generaste un "App Password"
- Revisa que `MAIL_PORT` sea 587 y `MAIL_SECURE=false`

### Error: Port 3001 already in use

```bash
# Cambiar puerto en .env
PORT=3002

# O matar el proceso que usa 3001
lsof -ti:3001 | xargs kill -9
```

---

## 📋 Checklist de Producción

Antes de deployar a producción, verifica:

- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` o `warn`
- [ ] JWT secrets son diferentes y fuertes (32+ caracteres)
- [ ] Database usa SSL (`?sslmode=require` en URL)
- [ ] Email usa proveedor real (Gmail/SendGrid/Mailgun)
- [ ] `CORS_ORIGIN` especifica dominios permitidos
- [ ] `SWAGGER_ENABLED=false` (o protegido con auth)
- [ ] `DATABASE_URL` no contiene datos en plaintext (usar secrets manager)
- [ ] File uploads tienen límites apropiados
- [ ] Session secret es fuerte y único

---

## 🔐 Seguridad: .env en Git

**IMPORTANTE**: NUNCA subas `.env` a Git

Verifica que `.gitignore` contiene:
```
# Environment variables
.env
.env.local
.env.*.local
```

**SÍ sube** `.env.example` (sin valores sensibles)

---

## 📚 Variables por Módulo

### Core Database
- `DATABASE_URL`

### Core Logger
- `LOG_LEVEL`

### Core Email
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`
- `MAIL_FROM`, `MAIL_FROM_NAME`

### Core Files
- `UPLOAD_PATH`, `MAX_FILE_SIZE`

### Auth Module
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`

### Users Module
- `BCRYPT_ROUNDS`

---

## 🎯 Próximos Pasos

1. Copia `.env.example` → `.env`
2. Configura las 3 cosas mínimas (DB, Email, JWT)
3. Corre `npm run start:dev`
4. Prueba http://localhost:3001/api

¡Listo para desarrollar! 🚀
