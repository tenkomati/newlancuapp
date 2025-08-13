# 🚚 Nueva LancuApp

Sistema de gestión de pedidos y repartos construido con Next.js 15, Prisma, NextAuth.js y TailwindCSS.

## ✨ Características

- 🔐 **Autenticación** con NextAuth.js
- 👥 **Gestión de usuarios** (Admin/Cliente)
- 🏢 **Gestión de clientes**
- 📦 **Gestión de pedidos**
- 🚛 **Gestión de repartos**
- 💰 **Gestión de precios**
- 📱 **Responsive design**

## 🚀 Deploy Rápido (Vercel + Supabase)

### 1. Configurar Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Copia la URL de conexión de la base de datos

### 2. Configurar Variables
```bash
cp .env.example .env.local
# Edita .env.local con tu configuración de Supabase
```

### 3. Deploy
```bash
npm install
npm run deploy:vercel
```

### 4. Configurar Vercel
1. Conecta tu repositorio en [vercel.com](https://vercel.com)
2. Configura las variables de entorno
3. ¡Listo!

## 📚 Documentación Completa

- **[VERCEL-SUPABASE.md](./VERCEL-SUPABASE.md)** - Guía detallada Vercel + Supabase
- **[DEPLOY.md](./DEPLOY.md)** - Guía general de deploy

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar base de datos
npm run db:generate
npm run db:push
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

## 👤 Usuarios por Defecto

- **Admin**: admin@lancuapp.com / admin123
- **Cliente**: cliente@ejemplo.com / cliente123

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:push` - Aplicar esquema a BD
- `npm run db:seed` - Poblar BD con datos iniciales
- `npm run db:studio` - Interfaz visual de BD
- `npm run deploy:vercel` - Deploy automatizado

## 🏗️ Stack Tecnológico

- **Framework**: Next.js 15 ✅
- **Base de datos**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Autenticación**: NextAuth.js
- **Estilos**: TailwindCSS
- **Validación**: Zod
- **Estado**: Zustand
- **Deploy**: Vercel
- **Compatibilidad**: ✅ Totalmente compatible con Next.js 15
