import { map, mergeAll, mergeScan, pipe } from 'rxjs'
import { ModelSummary } from '../types/models'
import { loadModel } from '../lib/modelCache'
import OpenAI from 'openai'
import { saveModelToDisk } from '../lib/saveModelToDisk'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
})

export const reverseCheckModels = ({
  systemPrompt,
  conventionsPrompt,
  domainKnowledgePrompt,
  outputDir,
  depthFirst = false,
  concurrency = 1,
}: {
  systemPrompt: string
  conventionsPrompt: string
  domainKnowledgePrompt: string
  outputDir: string
  depthFirst?: Boolean
  concurrency: number
}) =>
  pipe(
    map((converted: ModelSummary[]) =>
      depthFirst ? converted.reverse() : converted
    ),
    mergeAll(),
    mergeScan(
      async (converted: ModelSummary[], modelSummary: ModelSummary) => {
        if (
          modelSummary.newSchema &&
          !modelSummary.newSchema.includes('TODO')
        ) {
          console.log('✅ already converted:', modelSummary.modelName)
          return [...converted, modelSummary] // already converted and no more work to do
        }

        const todoRegex = /\/\/\s*TODO\s*:\s*(.*)/g
        let match
        while ((match = todoRegex.exec(modelSummary.newSchema)) !== null) {
          console.log('[ ] ', match[1])
        }

        const relevantConvertedSchemas = modelSummary.dependencies
          .map((dep) => loadModel(dep, outputDir)?.content)
          .filter(Boolean)

        const messages = [
          {
            role: 'system',
            content: [
              systemPrompt,
              conventionsPrompt || '',
              domainKnowledgePrompt || '',
            ].join('\n\n'),
          },
          {
            role: 'assistant',
            content:
              'Ok, sounds like a plan. Send me the new schema you want updated!',
          },
          relevantConvertedSchemas.length > 0 && [
            {
              role: 'user',
              content: `## Previous converted models

When refering to models already converted, use the new names when appropriate. Also try to keep the names consistent with the conversions.

\`\`\`prisma
${relevantConvertedSchemas.join('\n\n')}
\`\`\`
            `,
            },
            {
              role: 'assistant',
              content:
                'Thanks. That is good to know. Please send me the prisma model you want converted based on these inputs.',
            },
          ],
          {
            role: 'user',
            content: `Now we are on the backward pass for the conversion. We have already converted the models in the forward pass, and now we are converting all the relations to use the new model names.
            
We are now working on a model previously called ${modelSummary.modelName} and we want to find and update all references to new model names and change them:

## OLD SCHEMA
\`\`\`prisma
${modelSummary.oldSchema}
\`\`\`

## NEW SCHEMA
\`\`\`prisma
${modelSummary.newSchema}
\`\`\`

Never change the actual db names or keys or relationship names, or other things stored in the database in the schema- always use @map to keep the old names in the db but use the new names. Note that sometimes you have to use both a mapping for a relation, i.e @id(map:..) or @default(@map:..) and a @map(..).

As you see above, in the previously renamed models, there are new model names and field names. Make sure you use the new names when possible (while keep the database intact). Don't change the model name for the new schema, since it is already used above. 

Also when you don't know a new model name, don't guess what it will be called, leave them as they are and make a TODO comment about changing it later. There will be many other passes at converting this model.

Never invent new relations or names for relationships to enforce a key constraint. The truth for the database is always in the old schema. Never add @relation("") if there are no such relations in the old schema.


For example you can convert a model like this:
--- EXAMPLE ---

\`\`\`prisma
model NewModelName {
  @@map("oldModelName")

  // Fields
  id Int @id @default(autoincrement())
  newFieldName String @map("oldFieldName")

  subCompanies Company[]
  orders Order[]
  rows Row[] @relation("oldweirdnamedrelation")
  fkser fkser[] @relation("fkserkeyaoatg") // TODO: Change this to the new model name once we know what fkser is called now
  statistics Statistics[] @relation("fkaostakeyaoatg")
  NewRelatedModelName @relation(fields: [newRelatedModelNameId], references: [id])
}
\`\`\`
--- EXAMPLE ---

You can use comments to explain your resoning but only when you are uncertain about the naming. When you have fixed a TODO, remove the comment.

ONLY RESPOND WITH NEW SCHEMA. DO NOT RESPOND WITH ANYTHING ELSE.
`,
          },
        ]
          .flat()
          .filter((m) => m && m.content !== undefined) as any[]
        console.log(
          modelSummary.modelName,
          'AI: Sending reverse pass messages:',
          messages.length
        )
        const chatCompletion = await client.chat.completions.create({
          messages: messages as any[],
          model: 'gpt-4o',
          //response_format: { type: 'json_object' },
        })

        const newSchema = /```prisma\s*([\s\S]*?)\s*```/g.exec(
          chatCompletion.choices[0].message?.content || ''
        )?.[1]
        const newNameMatch = /model (\w+)/.exec(newSchema || '')?.[1]
        modelSummary.newName = newNameMatch || ''
        modelSummary.newSchema = newSchema || ''
        console.log('newSchema', modelSummary)
        saveModelToDisk(modelSummary, outputDir)
        return [...converted, modelSummary]
      },
      [] as ModelSummary[],
      concurrency
    )
  )
