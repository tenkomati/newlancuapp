import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuario administrador por defecto
  const hashedPassword = await hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@lancuapp.com' },
    update: {},
    create: {
      email: 'admin@lancuapp.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuario administrador creado:', adminUser.email);

  // Crear cliente de ejemplo
  let cliente = await prisma.cliente.findFirst({
    where: { email: 'cliente@ejemplo.com' },
  });
  
  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: {
        nombre: 'Cliente Ejemplo',
        direccion: 'Calle Falsa 123',
        telefono: '+54 9 11 1234-5678',
        email: 'cliente@ejemplo.com',
        zona: 'Centro',
      },
    });
  }

  console.log('✅ Cliente de ejemplo creado:', cliente.nombre);

  // Crear usuario cliente asociado
  const clienteUser = await prisma.user.upsert({
    where: { email: 'cliente@ejemplo.com' },
    update: {},
    create: {
      email: 'cliente@ejemplo.com',
      name: 'Cliente Ejemplo',
      password: await hash('cliente123', 12),
      role: 'USUARIO',
      clienteId: cliente.id,
    },
  });

  console.log('✅ Usuario cliente creado:', clienteUser.email);

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });