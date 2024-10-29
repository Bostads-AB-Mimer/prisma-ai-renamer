import { formatAst } from '@loancrate/prisma-schema-parser'
import { Example, Model, ModelSummary } from '../types/models'
import { examplesToMarkdown } from './examplesToMarkdown'
import { map, pipe } from 'rxjs'

export const modelWithExamplesToSummary = () =>
  pipe(
    map(
      (model: Model & { examples: Example[] }) =>
        ({
          modelName: model.name,
          newName: '',
          examples: examplesToMarkdown(model.examples || []),
          oldSchema: formatAst(model.ast),
          newSchema: model.newSchema || '',
          description: model.examples[0].tableDescription,
          converted: [],
          dependencies: model.dependencies,
          fields: model.examples
            .map(({ fieldName, fieldDescription }) => ({
              fieldName,
              fieldDescription,
            }))
            .reduce((acc, { fieldName, fieldDescription }) => {
              acc[fieldName] = fieldDescription
              return acc
            }, {} as { [key: string]: any }),
        } as ModelSummary)
    )
  )
