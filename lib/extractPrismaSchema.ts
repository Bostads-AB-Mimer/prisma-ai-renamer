import { map, pipe } from 'rxjs'

export const extractPrismaSchema = () =>
  pipe(
    map((output) => {
      return /```prisma\s*([\s\S]*?)\s*```/i.exec(output as string)?.[1] || ''
    })
  )
