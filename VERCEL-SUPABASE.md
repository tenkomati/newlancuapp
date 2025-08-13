# Deploy con Vercel + Supabase - Nueva LancuApp

## 🚀 Guía Paso a Paso

### 1. Configurar Supabase

#### Crear Proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta y un nuevo proyecto
3. Espera a que se complete la configuración (2-3 minutos)
4. Ve a **Settings > Database**
5. Copia la **Connection String** (URI)

#### Configurar Variables de Entorno
Crea un archivo `.env.local` con:

```env
# Supabase Database
DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-REF].supabase.co:5432/postgres"

# NextAuth.js
NEXTAUTH_SECRET="tu-clave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Producción
NODE_ENV="production"
```

### 2. Configurar Base de Datos

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar esquema a Supabase
npm run db:push

# Poblar con datos iniciales
npm run db:seed
```

### 3. Deploy en Vercel

#### Opción A: Desde GitHub (Recomendado)
1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com)
3. Conecta tu repositorio
4. Configura las variables de entorno:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (será tu dominio de Vercel)

#### Opción B: Desde CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL

# Re-deploy con variables
vercel --prod
```

### 4. Variables de Entorno en Vercel

En el dashboard de Vercel, ve a **Settings > Environment Variables** y agrega:

| Variable | Valor | Entorno |
|----------|-------|----------|
| `DATABASE_URL` | Tu URL de Supabase | Production, Preview, Development |
| `NEXTAUTH_SECRET` | Clave secreta generada | Production, Preview |
| `NEXTAUTH_URL` | https://tu-app.vercel.app | Production |
| `NEXTAUTH_URL` | https://tu-app-git-branch.vercel.app | Preview |

### 5. Configuración Post-Deploy

#### Ejecutar Migraciones en Producción
```bash
# Desde tu terminal local con DATABASE_URL de producción
DATABASE_URL="tu-url-de-supabase" npx prisma db push
DATABASE_URL="tu-url-de-supabase" npm run db:seed
```

#### Verificar Funcionamiento
1. Visita tu URL de Vercel
2. Prueba el login con: `admin@lancuapp.com` / `admin123`
3. Verifica que puedes crear usuarios, clientes, etc.

## 🔧 Comandos Útiles

```bash
# Ver logs de Vercel
vercel logs

# Ver base de datos en Supabase
# Ve al dashboard de Supabase > Table Editor

# Conectar a BD desde local
npx prisma studio
```

## 🎯 Ventajas de Vercel + Supabase

- ✅ **Deploy automático** desde GitHub
- ✅ **Base de datos PostgreSQL** gratuita hasta 500MB
- ✅ **Escalabilidad automática**
- ✅ **SSL/HTTPS** incluido
- ✅ **Dominios personalizados** gratuitos
- ✅ **Backups automáticos** en Supabase
- ✅ **Dashboard visual** para la BD

## 🚨 Importante

- **Next.js 15**: ✅ La aplicación ha sido actualizada para ser compatible con Next.js 15
- **Nunca** subas el archivo `.env` al repositorio
- **Genera** una clave secreta fuerte para `NEXTAUTH_SECRET`
- **Actualiza** `NEXTAUTH_URL` con tu dominio real
- **Habilita** Row Level Security en Supabase si es necesario

## 📊 Monitoreo

- **Vercel Analytics**: Habilitado automáticamente
- **Supabase Dashboard**: Métricas de BD en tiempo real
- **Logs**: `vercel logs` o dashboard de Vercel