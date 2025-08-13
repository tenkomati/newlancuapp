#!/bin/bash

# Script de deploy para Nueva LancuApp
set -e

echo "🚀 Iniciando proceso de deploy..."

# Verificar que existe el archivo .env
if [ ! -f ".env" ]; then
    echo "❌ Error: No se encontró el archivo .env"
    echo "📝 Copia .env.example a .env y configura las variables necesarias"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npm run db:generate

# Aplicar migraciones
echo "🗄️  Aplicando migraciones de base de datos..."
npm run db:push

# Ejecutar seed (opcional)
read -p "¿Deseas ejecutar el seed de la base de datos? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Ejecutando seed..."
    npm run db:seed
fi

# Build de producción
echo "🏗️  Construyendo aplicación..."
npm run build

echo "✅ Deploy completado exitosamente!"
echo "🌐 Puedes iniciar la aplicación con: npm start"
echo "📊 Para ver la base de datos: npm run db:studio"