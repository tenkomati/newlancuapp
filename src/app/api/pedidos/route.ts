import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema para validación de pedido
const pedidoItemSchema = z.object({
  productoId: z.string().min(1, 'El producto es requerido'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
  precio: z.number().positive('El precio debe ser mayor a 0'),
  subtotal: z.number().positive('El subtotal debe ser mayor a 0'),
});

const pedidoSchema = z.object({
  clienteId: z.string().min(1, 'El cliente es requerido'),
  fecha: z.string().transform((str) => new Date(str)),
  estado: z.enum(['PENDIENTE', 'ENTREGADO', 'CANCELADO']).default('PENDIENTE'),
  cobrado: z.boolean().default(false),
  total: z.number().positive('El total debe ser mayor a 0'),
  observacion: z.string().optional().nullable(),
  items: z.array(pedidoItemSchema).min(1, 'Debe agregar al menos un producto'),
});

// GET - Obtener todos los pedidos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('clienteId');

    // Filtrar por cliente si el usuario no es admin
    const where: any = {};
    if (session.user.role !== 'ADMIN') {
      if (!session.user.clienteId) {
        return NextResponse.json(
          { error: 'Usuario no asociado a un cliente' },
          { status: 403 }
        );
      }
      where.clienteId = session.user.clienteId;
    } else if (clienteId) {
      where.clienteId = clienteId;
    }

    const pedidos = await db.pedido.findMany({
      where,
      orderBy: {
        fecha: 'desc',
      },
      include: {
        cliente: true,
        reparto: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return NextResponse.json(
      { error: 'Error al obtener pedidos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo pedido
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = pedidoSchema.parse(body);

    // Verificar si el usuario tiene permiso para crear pedidos para este cliente
    if (session.user.role !== 'ADMIN' && session.user.clienteId !== validatedData.clienteId) {
      return NextResponse.json(
        { error: 'No tiene permiso para crear pedidos para este cliente' },
        { status: 403 }
      );
    }

    // Verificar si existe el cliente
    const cliente = await db.cliente.findUnique({
      where: {
        id: validatedData.clienteId,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: 'El cliente seleccionado no existe' },
        { status: 400 }
      );
    }

    // Verificar si existe un reparto próximo para la zona del cliente
    const fechaActual = new Date();
    const reparto = await db.reparto.findFirst({
      where: {
        fecha: {
          gte: fechaActual,
        },
        zona: cliente.zona,
        estado: true,
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    // Crear el pedido con sus items
    const pedido = await db.pedido.create({
      data: {
        clienteId: validatedData.clienteId,
        fecha: validatedData.fecha,
        estado: validatedData.estado,
        cobrado: validatedData.cobrado,
        total: validatedData.total,
        observacion: validatedData.observacion,
        repartoId: reparto?.id, // Asignar al reparto si existe
        items: {
          create: validatedData.items.map(item => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precio: item.precio,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        cliente: true,
        reparto: true,
        items: {
          include: {
            producto: true,
          },
        },
      },
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al crear pedido:', error);
    return NextResponse.json(
      { error: 'Error al crear pedido' },
      { status: 500 }
    );
  }
}