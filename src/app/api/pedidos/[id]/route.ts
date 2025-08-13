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

const pedidoUpdateSchema = z.object({
  estado: z.enum(['PENDIENTE', 'ENTREGADO', 'CANCELADO']).optional(),
  cobrado: z.boolean().optional(),
  observacion: z.string().optional().nullable(),
  repartoId: z.string().optional().nullable(),
});

// GET - Obtener un pedido por ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const pedido = await db.pedido.findUnique({
      where: {
        id: params.id,
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

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario tiene permiso para ver este pedido
    if (session.user.role !== 'ADMIN' && session.user.clienteId !== pedido.clienteId) {
      return NextResponse.json(
        { error: 'No tiene permiso para ver este pedido' },
        { status: 403 }
      );
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Error al obtener pedido:', error);
    return NextResponse.json(
      { error: 'Error al obtener pedido' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un pedido por ID (solo estado, cobrado, observación y reparto)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar si el pedido existe
    const pedidoExistente = await db.pedido.findUnique({
      where: {
        id: params.id,
      },
      include: {
        cliente: true,
      },
    });

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario tiene permiso para actualizar este pedido
    if (session.user.role !== 'ADMIN' && session.user.clienteId !== pedidoExistente.clienteId) {
      return NextResponse.json(
        { error: 'No tiene permiso para actualizar este pedido' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = pedidoUpdateSchema.parse(body);

    // Verificar si el reparto existe (si se proporciona)
    if (validatedData.repartoId) {
      const reparto = await db.reparto.findUnique({
        where: {
          id: validatedData.repartoId,
        },
      });

      if (!reparto) {
        return NextResponse.json(
          { error: 'El reparto seleccionado no existe' },
          { status: 400 }
        );
      }

      // Verificar que el reparto corresponde a la zona del cliente
      if (reparto.zona !== pedidoExistente.cliente.zona) {
        return NextResponse.json(
          { error: 'El reparto seleccionado no corresponde a la zona del cliente' },
          { status: 400 }
        );
      }
    }

    // Actualizar el pedido
    const pedidoActualizado = await db.pedido.update({
      where: {
        id: params.id,
      },
      data: validatedData,
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

    return NextResponse.json(pedidoActualizado);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues },
        { status: 400 }
      );
    }

    console.error('Error al actualizar pedido:', error);
    return NextResponse.json(
      { error: 'Error al actualizar pedido' },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar un pedido por ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar si el pedido existe
    const pedidoExistente = await db.pedido.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario tiene permiso para cancelar este pedido
    if (session.user.role !== 'ADMIN' && session.user.clienteId !== pedidoExistente.clienteId) {
      return NextResponse.json(
        { error: 'No tiene permiso para cancelar este pedido' },
        { status: 403 }
      );
    }

    // Verificar si el pedido ya está entregado
    if (pedidoExistente.estado === 'ENTREGADO') {
      return NextResponse.json(
        { error: 'No se puede cancelar un pedido ya entregado' },
        { status: 400 }
      );
    }

    // Cancelar el pedido
    const pedidoCancelado = await db.pedido.update({
      where: {
        id: params.id,
      },
      data: {
        estado: 'CANCELADO',
      },
    });

    return NextResponse.json(
      { message: 'Pedido cancelado correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
    return NextResponse.json(
      { error: 'Error al cancelar pedido' },
      { status: 500 }
    );
  }
}