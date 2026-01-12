#!/bin/bash

# Script de Verificación - Servicios Docker
set -e

echo "══════════════════════════════════════════════════════════════════════"
echo "  🐳 Verificación de Servicios Docker"
echo "══════════════════════════════════════════════════════════════════════"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar Docker
check_docker() {
    echo "📦 Verificando Docker..."
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker no está instalado${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker está instalado${NC}"
    docker --version
    echo ""
}

# 2. Verificar Docker Compose (Plugin)
check_docker_compose() {
    echo "📦 Verificando Docker Compose..."
    # Se verifica 'docker compose' como subcomando, no como ejecutable único
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}✗ Docker Compose Plugin no está instalado${NC}"
        echo "  Instala Docker Compose V2: https://docs.docker.com/compose/install/"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker Compose está instalado${NC}"
    docker compose version
    echo ""
}

# 3. Verificar Contenedores
check_containers() {
    echo "🔍 Verificando estado de contenedores..."

    # Quitamos las comillas a docker compose
    if ! docker compose ps --format "{{.Name}}" | grep -q "atr_postgres"; then
        echo -e "${RED}✗ PostgreSQL (atr_postgres) no está corriendo${NC}"
        echo "  Ejecuta: docker compose up -d"
        exit 1
    fi

    if ! docker compose ps --format "{{.Name}}" | grep -q "atr_redis"; then
        echo -e "${RED}✗ Redis (atr_redis) no está corriendo${NC}"
        echo "  Ejecuta: docker compose up -d"
        exit 1
    fi

    echo -e "${GREEN}✓ Contenedores están corriendo${NC}"
    docker compose ps
    echo ""
}

# 4. Verificar PostgreSQL (Basado en tu databaseConfig)
check_postgres() {
    echo "🗄️  Verificando PostgreSQL..."

    if docker exec atr_postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL está listo${NC}"

        # Usamos el nombre de la base de datos de tu configuración: audit_core_db
        if docker exec atr_postgres psql -U postgres -d audit_core_db -c "SELECT 1" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Base de datos 'audit_core_db' existe${NC}"
        else
            echo -e "${YELLOW}⚠ Base de datos 'audit_core_db' no existe${NC}"
            echo "  Ejecuta: npm run migration:run"
        fi
    else
        echo -e "${RED}✗ PostgreSQL no está listo${NC}"
        exit 1
    fi
    echo ""
}

# 5. Verificar Redis
check_redis() {
    echo "🔴 Verificando Redis..."
    if docker exec atr_redis redis-cli ping | grep -q "PONG"; then
        echo -e "${GREEN}✓ Redis está listo${NC}"
    else
        echo -e "${RED}✗ Redis no responde${NC}"
        exit 1
    fi
    echo ""
}

# Ejecutar
check_docker
check_docker_compose
check_containers
check_postgres
check_redis

echo -e "${GREEN}🎉 ¡Verificación exitosa! Los servicios están listos para la auditoría.${NC}"