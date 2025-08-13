# Guía de Despliegue - Nueva LancuApp

## Prerrequisitos

1. **Node.js** (versión 18 o superior)
2. **Base de datos PostgreSQL** (local o en la nube)
3. **Variables de entorno** configuradas

## Pasos para el Despliegue

### 1. Configuración de Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Configura las siguientes variables:

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `NEXTAUTH_SECRET`: Clave secreta para NextAuth (genera una con `openssl rand -base64 32`)
- `NEXTAUTH_URL`: URL de tu aplicación en producción

### 2. Instalación de Dependencias

```bash
npm install
```

### 3. Configuración de la Base de Datos

```bash
# Generar el cliente de Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma db push

# (Opcional) Poblar la base de datos
npx prisma db seed
```

### 4. Build de Producción

```bash
npm run build
```

### 5. Iniciar la Aplicación

```bash
npm start
```

## Opciones de Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en el dashboard de Vercel
3. Vercel detectará automáticamente que es una aplicación Next.js

### Railway

1. Conecta tu repositorio a Railway
2. Agrega un servicio PostgreSQL
3. Configura las variables de entorno

### Docker

Crea un `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | Clave secreta | `tu-clave-secreta-aqui` |
| `NEXTAUTH_URL` | URL de la app | `https://tu-app.vercel.app` |

## Verificación Post-Despliegue

1. Verifica que la aplicación cargue correctamente
2. Prueba el login/registro
3. Verifica la conexión a la base de datos
4. Revisa los logs para errores

## Troubleshooting

### Errores Comunes

- **Error de conexión a BD**: Verifica `DATABASE_URL`
- **Error de autenticación**: Verifica `NEXTAUTH_SECRET` y `NEXTAUTH_URL`
- **Error de build**: Ejecuta `npm run build` localmente para debuggear

## ✅ Compatibilidad Next.js 15

La aplicación ha sido **totalmente actualizada** para ser compatible con Next.js 15:
- ✅ Parámetros de rutas dinámicas actualizados (`Promise<{ id: string }>`)
- ✅ Configuración de `next.config.ts` optimizada
- ✅ Todas las rutas API funcionando correctamente
- ✅ TypeScript sin errores

## 🚨 Problemas Conocidos

### Windows - Error EPERM
Si encuentras errores `EPERM: operation not permitted` durante el build:

```bash
# Ejecutar como administrador o cambiar permisos
# Alternativamente, usar WSL2 para desarrollo
# RECOMENDADO: Usar Vercel para deployment
```

### Múltiples Lockfiles
Si ves warnings sobre múltiples lockfiles:

```bash
# Eliminar package-lock.json si usas pnpm
rm package-lock.json

# O eliminar pnpm-lock.yaml si usas npm
rm pnpm-lock.yaml
```

### Comandos de Verificación

```bash
# Verificar que Prisma funciona
npm run db:generate

# Verificar conexión a BD
npx prisma db push

# Verificar que el servidor inicia
npm run dev
```