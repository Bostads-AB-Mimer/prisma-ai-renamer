import fs from 'fs'
import path from 'path'
import { ModelSummary } from '../types/models'

export const loadModelsFromDisk = (outputDir: string) => {
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.endsWith('.prisma'))
    .filter((f) => !f.startsWith('merged'))
  return files.map((f) => ({
    filename: f,
    newModelName: f.split('_')[0],
    oldModelName: f.split('_')[1].split('.')[0],
    content: fs.readFileSync(path.join(outputDir, f), 'utf8'),
  }))
}

export const loadModel = (name: string, outputDir: string) => {
  const files = loadModelsFromDisk(outputDir)
  return files.find(
    (f) =>
      f.filename === name || f.newModelName === name || f.oldModelName === name
  )
}

export const loadDependantModels = (
  modelSummary: ModelSummary,
  outputDir: string
) =>
  modelSummary.dependencies
    .map((dep) => {
      const newSchema = loadModel(dep, outputDir)
      return {
        ...modelSummary,
        ...newSchema,
        fields: newSchema?.content
          .split('\n')
          .map((l) => l.trim())
          .map((l) => ({
            newName: /(\w+)\s/.exec(l)?.[1],
            oldName: /@map\("(\w+)"\)/.exec(l)?.[1],
          }))
          .filter(({ newName, oldName }) => newName && oldName),
      }
    })
    .filter((m) => m.oldModelName && m.fields?.length)
