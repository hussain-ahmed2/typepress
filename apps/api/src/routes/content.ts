import type { FastifyInstance } from 'fastify';
import { prisma } from '@typepress/db';

export async function content_routes(app: FastifyInstance) {
  app.get('/content', async (_request, reply) => {
    const contents = await prisma.content.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      include: { author: { select: { name: true } } },
    });

    return reply.send({
      success: true,
      data: contents.map((c) => ({
        id: c.id,
        type: c.type,
        slug: c.slug,
        title: c.title,
        status: c.status,
        author_name: c.author.name,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
      })),
    });
  });

  app.get('/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const content = await prisma.content.findUnique({
      where: { id },
      include: { author: { select: { name: true } } },
    });

    if (!content) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Content not found' },
      });
    }

    return reply.send({ success: true, data: content });
  });

  app.post('/content', async (request, reply) => {
    const body = request.body as {
      type: string;
      slug: string;
      title: string;
      author_id: string;
    };

    const content = await prisma.content.create({
      data: {
        type: body.type,
        slug: body.slug,
        title: body.title,
        author_id: body.author_id,
      },
    });

    return reply.status(201).send({ success: true, data: content });
  });
}
