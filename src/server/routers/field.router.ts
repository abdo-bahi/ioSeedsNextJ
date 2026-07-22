import { z } from "zod";
import { router, publicProc } from "../trpc";
import { prisma } from "../../../prisma/lib/prisma";

export const fieldRouter = router({
  getAll: publicProc
    .input(z.object({ farmId: z.string() }))
    .query(async ({ input }) => {
      return prisma.irrigationField.findMany({
        where: { fk_FarmingUnit: input.farmId },
        select: {
          id: true,
          name: true,
          isActive: true,
          latitude: true,
          longitude: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }),
});
