import fs from 'fs'
import path from 'path'

export const mergeModels = (outputDir: string) => {
  fs.readdir(path.resolve(outputDir), (err, files) => {
    if (err) {
      console.error(err)
      return
    }

    const merged = files.map((file) => {
      if (file.startsWith('merged') || !file.endsWith('.prisma')) return ''
      const model = fs.readFileSync(path.join(outputDir, file), 'utf8')
      return model
    })

    const header = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}

    `

    fs.writeFileSync(
      path.join(outputDir, 'merged.prisma'),
      header + merged.join('\n\n')
    )
  })
}
