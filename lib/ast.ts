import { parsePrismaSchema } from '@loancrate/prisma-schema-parser'
import fs from 'fs'

export const ast = (filename: string) =>
  parsePrismaSchema(
    fs.readFileSync(filename, {
      encoding: 'utf8',
    })
  )
