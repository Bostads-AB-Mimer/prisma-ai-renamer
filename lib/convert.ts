import { from, lastValueFrom, mergeAll, tap, toArray } from 'rxjs'

import { SchemaDeclaration } from '@loancrate/prisma-schema-parser'
import { reverseCheckModels } from '../agents/reverseCheckModels'
import { checkModelConsistency } from '../agents/checkModelConsistency'
import { loadPrompt } from './conventions'
import { convertModelNames } from '../agents/convertModelNames'
import { ast } from './ast'
import { mapModels } from './mapModels'
import { modelsToGraph } from './modelsToGraph'
import { findInitialNode } from './findInitialNode'
import { returnAllDependants } from './returnAllDependants'
import { includeExamples } from './includeExamples'
import { modelWithExamplesToSummary } from './modelWithExamplesToSummary'

const loadModels = ({
  schemaPath,
  startingModel,
  outputDir,
  requiredRelationships,
}: {
  schemaPath: string
  startingModel: string
  outputDir: string
  requiredRelationships?: boolean
}) =>
  from(ast(schemaPath).declarations as SchemaDeclaration[]) // Explicitly cast to Model[]
    .pipe(
      mapModels(outputDir),
      modelsToGraph(requiredRelationships),
      findInitialNode(startingModel),
      returnAllDependants(),
      mergeAll(),
      includeExamples(),
      modelWithExamplesToSummary(),
      tap((model) =>
        console.log(`📦 Queuing model for conversion: ${model.modelName}`)
      )
    )

interface MainParams {
  startingModel: string
  schemaPath: string
  conventionsPath: string
  systemPromptPath: string
  domainKnowledgePath: string
  outputDir: string
  forward?: boolean
  requiredRelationships?: boolean
}

export const convert = async ({
  startingModel,
  schemaPath,
  conventionsPath,
  systemPromptPath,
  domainKnowledgePath,
  outputDir,
  requiredRelationships,
  forward = true,
}: MainParams) => {
  // Load and apply coding conventions if provided
  const conventionsPrompt = await loadPrompt(conventionsPath)
  const systemPrompt = await loadPrompt(systemPromptPath)
  const domainKnowledgePrompt = await loadPrompt(domainKnowledgePath)

  const result = loadModels({
    schemaPath,
    startingModel,
    outputDir,
    requiredRelationships,
  }).pipe(
    forward
      ? convertModelNames({
          systemPrompt,
          conventionsPrompt,
          domainKnowledgePrompt,
          outputDir,
        })
      : toArray(), // forward pass
    reverseCheckModels({
      outputDir,
      conventionsPrompt,
      systemPrompt,
      domainKnowledgePrompt,
      depthFirst: !forward,
      concurrency: 20,
    }), // backward pass
    checkModelConsistency({
      outputDir,
      systemPrompt,
      concurrency: 10,
    }),
    toArray()
  )
  return await lastValueFrom(result)
}
