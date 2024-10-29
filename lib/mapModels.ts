import { filter, map, pipe } from 'rxjs'
import { ModelDeclaration } from '@loancrate/prisma-schema-parser'
import { Model } from '../types/models'
import { loadModel } from '../lib/modelCache'

export const mapModels = (outputDir: string) =>
  pipe(
    filter((declaration: any) => declaration.kind === 'model'),
    map((model: ModelDeclaration) => {
      const fields = model.members
        .filter((member) => member.kind === 'field')
        .filter((field: any) => field.type?.kind === 'typeId')
        .map((field: any) => ({
          name: field.name.value,
          type: field.type.name.value,
        }))

      const relations = model.members
        .filter((member) => member.kind === 'field')
        .filter((field: any) => field.type?.kind !== 'typeId')
        .map((field: any) => ({
          name: field.name.value,
          type: field.type?.kind,
        }))

      const dependencies = relations.map((relation) => relation.name)

      return {
        ast: model,
        name: model.name.value,
        newSchema: loadModel(model.name.value, outputDir)?.content || '',
        fields,
        relations,
        dependencies,
      } as Model
    })
  )
