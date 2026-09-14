import { prisma } from '@typepress/db';
import type { ApiResponse } from '@typepress/shared-types';

export class RevisionService {
  async list_by_content(content_id: string): Promise<ApiResponse> {
    const revisions = await prisma.revision.findMany({
      where: { content_id },
      orderBy: { created_at: 'desc' },
      take: 50,
      include: { author: { select: { name: true, email: true } } },
    });

    return { success: true, data: revisions };
  }

  async create(content_id: string, author_id: string): Promise<void> {
    const content = await prisma.content.findUnique({ where: { id: content_id } });
    if (!content) return;

    await prisma.revision.create({
      data: {
        content_id,
        author_id,
        data: {
          title: content.title,
          slug: content.slug,
          type: content.type,
          status: content.status,
          meta: content.meta,
        },
      },
    });

    // Enforce revision limit (keep last 50)
    const count = await prisma.revision.count({ where: { content_id } });
    if (count > 50) {
      const oldest = await prisma.revision.findFirst({
        where: { content_id },
        orderBy: { created_at: 'asc' },
      });
      if (oldest) {
        await prisma.revision.delete({ where: { id: oldest.id } });
      }
    }
  }

  async restore(revision_id: string): Promise<ApiResponse> {
    const revision = await prisma.revision.findUnique({ where: { id: revision_id } });
    if (!revision) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Revision not found' } };
    }

    const data = revision.data as Record<string, unknown>;

    await prisma.content.update({
      where: { id: revision.content_id },
      data: {
        title: data.title as string,
        slug: data.slug as string,
        meta: data.meta as never,
      },
    });

    return { success: true, data: { message: 'Revision restored' } };
  }
}
