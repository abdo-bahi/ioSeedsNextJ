import { prisma } from "../../prisma/lib/prisma"

export async function getUserFarms(userId: string) {
  // Get all irrigation fields this user has a role in
  const roleMembers = await prisma.roleMember.findMany({
    where: {
      fk_user: userId,
      fk_irrigationField: { not: null },
    },
    select: {
      fk_role: true,
      irrigationField: {
        select: {
          id:   true,
          name: true,
          FarmingUnit: {
            select: {
              id:       true,
              name:     true,
              isActive: true,
              wilaya:   { select: { name: true, code: true } }
            }
          }
        }
      }
    }
  })

  // Also get farms the user owns directly
  const ownedFarms = await prisma.farmingUnit.findMany({
    where:  { fk_owner: userId, isActive: true },
    select: {
      id:       true,
      name:     true,
      isActive: true,
      wilaya:   { select: { name: true, code: true } }
    }
  })

  // Merge and deduplicate
  const fromRoles = roleMembers
    .map(rm => rm.irrigationField?.FarmingUnit)
    .filter(Boolean)
    .filter(f => f!.isActive)

  const allFarms = [
    ...ownedFarms,
    ...fromRoles,
  ]

  // Deduplicate by id
  const seen = new Set<string>()
  return allFarms.filter(f => {
    if (seen.has(f!.id)) return false
    seen.add(f!.id)
    return true
  })
}