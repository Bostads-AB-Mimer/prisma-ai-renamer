import fs from 'fs'
import path from 'path'
import { ModelSummary } from '../types/models'

export const saveModelToDisk = (model: ModelSummary, outputDir: string) => {
  if (model.newName) {
    fs.writeFileSync(
      path.join(outputDir, model.newName + '_' + model.modelName + '.prisma'),
      model.newSchema
    )
  }
}
