#!/bin/bash

# Script de deploy para Vercel + Supabase
set -e

echo "🚀 Deploy Nueva LancuApp - Vercel + Supabase"
echo "============================================"

# Verificar que existe el archivo .env.local
if [ ! -f ".env.local" ]; then
    echo "❌ Error: No se encontró el archivo .env.local"
    echo "📝 Crea .env.local basado en .env.example con tu configuración de Supabase"
    exit 1
fi

# Verificar que DATABASE_URL está configurado
if ! grep -q "supabase.co" .env.local; then
    echo "⚠️  Advertencia: DATABASE_URL no parece ser de Supabase"
    echo "📝 Asegúrate de usar la URL de conexión de Supabase"
fi

echo "📦 Instalando dependencias..."
npm ci

echo "🔧 Generando cliente de Prisma..."
npm run db:generate

echo "🗄️  Aplicando esquema a Supabase..."
npm run db:push

# Preguntar si ejecutar seed
read -p "¿Deseas ejecutar el seed de la base de datos? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Ejecutando seed..."
    npm run db:seed
    echo "✅ Datos iniciales creados:"
    echo "   👤 Admin: admin@lancuapp.com / admin123"
    echo "   👤 Cliente: cliente@ejemplo.com / cliente123"
fi

echo "🏗️  Construyendo aplicación..."
npm run build

echo "📤 Desplegando en Vercel..."
if command -v vercel &> /dev/null; then
    vercel --prod
else
    echo "⚠️  Vercel CLI no está instalado"
    echo "📝 Instala con: npm i -g vercel"
    echo "📝 O despliega desde el dashboard de Vercel conectando tu repositorio GitHub"
fi

echo ""
echo "✅ Deploy completado!"
echo "🌐 Próximos pasos:"
echo "   1. Configura las variables de entorno en Vercel"
echo "   2. Actualiza NEXTAUTH_URL con tu dominio de Vercel"
echo "   3. Prueba el login en tu aplicación"
echo ""
echo "📚 Consulta VERCEL-SUPABASE.md para más detalles"