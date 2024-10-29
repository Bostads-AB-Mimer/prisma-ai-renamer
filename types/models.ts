import type { ModelDeclaration } from '@loancrate/prisma-schema-parser'

export interface Example {
  table: string
  tableDescription: string
  fieldName: string
  fieldDescription: string
}

export interface Model {
  ast: ModelDeclaration
  name: string
  newSchema?: string
  fields: { name: string; type: string }[]
  relations: { name: string; type: string | undefined }[]
  examples?: Example[]
  dependencies?: string[]
}

export interface ModelSummary {
  modelName: string
  newName: string
  examples: string
  oldSchema: string
  newSchema: string
  description: string
  converted: ModelSummary[]
  dependencies: string[]
  fields: { [key: string]: string }
  relations?: { name: string; type: string | undefined }[]
  ast?: ModelDeclaration
}
