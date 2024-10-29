#!/usr/bin/env node
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable.')
  console.error('This tool uses OpenAI. Please provide an API key.')
  console.error('Either export it or via an .env file')
  process.exit(1)
}
import { Command } from 'commander'
import { version } from './package.json'
import { convert } from './lib/convert'
import { saveModelToDisk } from './lib/saveModelToDisk'
import { mergeModels } from './lib/merge'

const program = new Command()

program
  .name('prisma-ai-renamer')
  .description('CLI to manage Prisma AI renaming tasks')
  .version(version)
  .description(
    `Convert models with a starting point and schema file. It uses depth-first search to find all dependencies and convert them in correct order. 

Examples:
  $ prisma-ai-renamer ModelName
  $ prisma-ai-renamer -s ./path/to/schema.prisma ModelName
  $ prisma-ai-renamer -s ./prisma/schema.prisma MyModel -o ./output`
  )
  .option(
    '-s, --schema <path>',
    'Path to the schema file',
    'prisma/schema.prisma'
  )
  .option('--required', 'Include only required relationships')

  .option(
    '-o, --output <directory>',
    'Output directory for converted models',
    './converted'
  )
  .option(
    '-sp, --system-prompt <path>',
    'Path to the system prompt file',
    './prompts/systemPrompt.md'
  )
  .option(
    '-c, --conventions <path>',
    'Path to the coding conventions markdown file',
    './prompts/conventions.md'
  )
  .option(
    '-dk, --domain-knowledge <path>',
    'Path to the domain knowledge file',
    './prompts/domainKnowledge.md'
  )
  .option(
    '-r, --reverse-only',
    'Perform only the reverse check, setting forward to false'
  )
  .option('-m, --merge', 'Merge converted models into a single output')
  .argument('<model>', 'Starting model name')

  .action((model, options) => {
    const {
      schema,
      conventions,
      output,
      systemPrompt,
      domainKnowledge,
      reverseOnly,
      required,
    } = options
    const schemaPath = path.join(process.cwd(), schema)

    // Check if schema file exists
    if (!fs.existsSync(schemaPath)) {
      console.error(`Schema file not found at: ${schemaPath}`)
      program.outputHelp()
      process.exit(1)
    }

    // Output the options to make the user aware of the settings
    console.log(`🔍 Using coding conventions from: ${conventions}`)
    console.log(`📜 Using system prompt from: ${systemPrompt}`)
    console.log(`📚 Using domain knowledge from: ${domainKnowledge}`)

    console.log(
      `🚀 Starting model conversion from: ${model} with schema at: ${schema}`
    )

    convert({
      startingModel: model,
      schemaPath: schema,
      conventionsPath: conventions,
      systemPromptPath: systemPrompt,
      domainKnowledgePath: domainKnowledge,
      outputDir: output,
      forward: !reverseOnly,
      requiredRelationships: required,
    })
      .then((result) => {
        console.log(
          result
            .map((model) => {
              saveModelToDisk(model, output)
              return model.modelName + ' -> ' + model.newName
            })
            .join('\n')
        )
      })
      .then((convertedNames) =>
        console.log('Conversion completed successfully: \n' + convertedNames)
      )
      .then(() => {
        if (options.merge) {
          console.log(`🔗 Merging converted models into a single file`)
          mergeModels(output)
        }
      })
      .catch((error) => {
        console.error('Error during conversion:', error)
        process.exit(1)
      })
  })
// Show help if no arguments are passed
if (!process.argv.slice(2).length) {
  program.outputHelp()
} else {
  program.parse(process.argv)
}
