import OpenAI from 'openai'
import { mergeAll, mergeMap, pipe } from 'rxjs'
import { ModelSummary } from '../types/models'
import { loadModel } from '../lib/modelCache'
import { saveModelToDisk } from '../lib/saveModelToDisk'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
})

export const checkModelConsistency = ({
  outputDir,
  systemPrompt,
  concurrency = 10,
}: {
  outputDir: string
  systemPrompt: string
  concurrency?: number
}) =>
  pipe(
    mergeAll(),
    mergeMap(async (modelSummary: ModelSummary) => {
      const converted = modelSummary.dependencies
        .map((dep) => {
          const newSchema = loadModel(dep, outputDir)
          return {
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

      /*   
  actionId String @id(map: "pkaoatg") @db.Char(15) @map("keyaoatg")
  actionCode String @unique(map: "akaoatg1") @db.VarChar(10) @map("code")
  description String? @db.VarChar(70) @map("caption")
  publishStatus Int @default(0, map: "DF__aoatg__publish__2179EDD4") @db.TinyInt @map("publish")
  isActive Int @default(1, map: "DF__aoatg__isactive__226E120D") @db.TinyInt @map("isactive")
  */

      const fieldMarkdown = converted.map(
        (m) =>
          `## ${m.oldModelName} -> ${m.newModelName}
${m.fields?.map((f) => `- ${f.oldName}: ${f.newName || f.oldName}`).join('\n')}`
      )

      const messages = [
        { role: 'system', content: systemPrompt },
        {
          role: 'assistant',
          content:
            'Ok, sounds like a plan. Send me the new schema you want updated!',
        },
        fieldMarkdown.length > 0 && [
          {
            role: 'user',
            content: `## Previous converted models

These models are relevant for your work. Please only respond with OK when you have read and understood the models below:

${fieldMarkdown.join('\n\n')}
            `,
          },
          {
            role: 'assistant',
            content: 'OK',
          },
        ],
        {
          role: 'user',
          content: `Now we are on the check for consistency pass in the conversion. We have already converted the models in the forward pass, and have checked for all relevant relation names in a backward pass. 
Now we want to make sure we have a consistant model that will work without problems in the database. Your job now is to verify according to the original schema that the new generated schema will work and that no
weird errors will occur and that no unwanted migration scripts will be generated from this change. We do not want to change the database at all.

If there are fields that are refering to models or fields that arent available above, please comment out these rows for now, do not remove any fields or relations. If you do, make sure to add a TODO: 

Verify that the schema is correct and that no squiggly lines will appear when using this schema. Add a TODO: comment if you find something that needs to be fixed in a later pass.

Comment out the row if there are anything that makes the schema inconsistent.

## OLD SCHEMA
\`\`\`prisma
${modelSummary.oldSchema}
\`\`\`

## NEW SCHEMA
\`\`\`prisma
${modelSummary.newSchema}
\`\`\`

ONLY RESPOND WITH NEW SCHEMA. DO NOT RESPOND WITH ANYTHING ELSE.
`,
        },
      ]
        .flat()
        .filter((m) => m && m.content !== undefined) as any[]
      console.log(
        modelSummary.modelName,
        'AI: Checking consistency pass messages:',
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
      if (!newSchema) {
        console.log('❌ No new schema found for model:', modelSummary.modelName)
        return modelSummary
      }
      modelSummary.newSchema = newSchema

      saveModelToDisk(modelSummary, outputDir)
      console.log(
        '✅ Saved model to disk after correct consistency check:',
        modelSummary.modelName,
        modelSummary.newName
      )
      return modelSummary
    }, concurrency)
  )
