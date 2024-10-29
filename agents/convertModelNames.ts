import { last, mergeScan, pipe } from 'rxjs'
import { ModelSummary } from '../types/models'
import OpenAI from 'openai'
import { saveModelToDisk } from '../lib/saveModelToDisk'
import { loadDependantModels } from '../lib/modelCache'

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
})

export const convertModelNames = ({
  systemPrompt,
  conventionsPrompt,
  domainKnowledgePrompt,
  outputDir,
}: {
  systemPrompt: string
  domainKnowledgePrompt: string
  conventionsPrompt: string
  outputDir: string
}) =>
  pipe(
    mergeScan(
      async (converted: ModelSummary[], modelSummary: ModelSummary) => {
        const dependencies = loadDependantModels(modelSummary, outputDir)

        const relevantConvertedSchemas = [...converted, ...dependencies]
          // TODO remove duplicates
          .filter((old) => modelSummary.oldSchema.includes(old.modelName))
          .filter((old) => old.newSchema)
          .reduce((acc, old) => {
            if (!acc.some((prev) => prev.modelName === old.modelName)) {
              acc.push(old as ModelSummary)
            }
            return acc
          }, [] as ModelSummary[])
          .map((old) => old.newSchema)

        console.log(
          'AI: starting converting model:',
          modelSummary.modelName,
          'with',
          relevantConvertedSchemas.length,
          'relevant converted schemas',
          modelSummary.newSchema
            ? '(✅ already converted before)'
            : '(❓ not yet converted)'
        )

        const todoRegex = /\/\/\s*TODO\s*:\s*(.*)/g
        let match
        while ((match = todoRegex.exec(modelSummary.newSchema)) !== null) {
          console.log('[ ] ', match[1])
        }

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
            role: 'user',
            content: `I will send you a prisma schema to convert. But before I do, it can be good to know that these are some previous notes about the naming:
${modelSummary.examples}`,
          },
          {
            role: 'assistant',
            content:
              'Ok, makes sense. Do you have more background info before we start converting the schema?',
          },
          relevantConvertedSchemas.length > 0 && [
            {
              role: 'user',
              content: `## Previous converted schemas

When refering to models already converted, use the new names when appropriate. Also try to keep the names consistent with the previous conversions.

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

          modelSummary.newSchema && [
            {
              role: 'user',
              content: `## Model already converted in a previous pass

We have previously converted this model. Here is the new schema. You now have more information so please concentrate on the TODOs and the relations to other models that are not yet converted. If you find inconsistencies or have names that are not yet converted, leave the old names and make a TODO comment about changing it in a later pass. 

\`\`\`prisma
${modelSummary.newSchema}
\`\`\`
            `,
            },
            {
              role: 'assistant',
              content: `Thanks. That is good to know. I'll make sure to keep the new names consistent with the previous conversions.`,
            },
          ],

          {
            role: 'user',
            content: `Here is the actual schema for conversion:

\`\`\`prisma
${modelSummary.oldSchema}
\`\`\`

IMPORTANT: Never change the actual field names in the schema- always use @map to map the old names, the database can not be affected by this renaming. Note that sometimes you have to use both a mapping for a relation, i.e @id(map:..) or @default(@map:..) and a @map(..).

When you find a relationship to another model that you don't yet know the new name for, leave the old name as is and make a TODO: comment about changing it later when there will be a backward pass through the models again to change these names. 

Never change relation names- these are stored in the database and can not be changed. Also don't add @relation to virtual fields that have no relation in the old schema. 

Always try to return a working copy of the model. Comment out fields that are not yet converted or that you are uncertain about and add a TODO comment about it for later passes.

For example you can convert a model like this:
--- EXAMPLE 1 ---

\`\`\`prisma
model bakmc {
  keybakmc  String  @id(map: "pkbakmc") @db.Char(15)
  code      String  @unique(map: "akbakmc") @db.VarChar(10)
  caption   String  @db.VarChar(60)
  timestamp String  @db.Char(10)
  bakmp     bakmp[]
}
\`\`\`

Converts to:

\`\`\`prisma
model ComponentCategory {
  @@map("bakmc")
  id String @id(map: "pkbakmc") @map("keybakmc") @db.Char(15)
  code String @unique(map: "akbakmc") @map("code") @db.VarChar(10)
  name String @map("caption") @db.VarChar(60)
  timestamp String @map("timestamp") @db.Char(10) // TODO: change timestamp later when knowing more about its usage 

  bakmp bakmp[] // TODO: change bakmp to new model name when available
}
\`\`\`
--- EXAMPLE 1 ---

--- EXAMPLE 2 ---
\`\`\`prisma
model bakmp {
  keybakmp                     String    @id(map: "pkbakmp") @db.Char(15)
  keycmobj                     String    @unique(map: "fkbakmpcmobj") @db.Char(15)
  keybakmt                     String?   @db.Char(15)
  keybakmc                     String?   @db.Char(15)
  keycmctc                     String?   @db.Char(15)
  keycmctc2                    String?   @db.Char(15)
  keyaobdl                     String?   @db.Char(15)
  keytvart                     String?   @db.Char(15)
  keytvpca                     String?   @db.Char(15)
  code                         String    @db.VarChar(30)
  caption                      String?   @db.VarChar(60)
  fabrikat                     String?   @db.VarChar(60)
  typbeteckn                   String?   @db.VarChar(60)
  instdatum                    DateTime? @db.DateTime
  tdatewarr                    DateTime? @db.DateTime
  betjanar                     String?   @db.VarChar(60)
  aoadm                        Int       @default(1, map: "DF__bakmp__aoadm__5A029E25") @db.TinyInt
  isai                         Int       @default(0, map: "DF__bakmp__isai__5AF6C25E") @db.TinyInt
  deletemark                   Int       @default(0, map: "DF__bakmp__deletemar__5BEAE697") @db.TinyInt
  fdate                        DateTime  @db.DateTime
  tdate                        DateTime  @db.DateTime
  timestamp                    String    @db.Char(10)
  aobdl                        aobdl?    @relation(fields: [keyaobdl], references: [keyaobdl], onUpdate: NoAction, map: "fkbakmpkeyaobdl ")
  bakmc                        bakmc?    @relation(fields: [keybakmc], references: [keybakmc], onUpdate: NoAction, map: "fkbakmpkeybakmc ")
  bakmt                        bakmt?    @relation(fields: [keybakmt], references: [keybakmt], onUpdate: NoAction, map: "fkbakmpkeybakmt ")
  cmctc_bakmp_keycmctcTocmctc  cmctc?    @relation("bakmp_keycmctcTocmctc", fields: [keycmctc], references: [keycmctc], onDelete: NoAction, onUpdate: NoAction, map: "fkbakmpkeycmctc")
  cmctc_bakmp_keycmctc2Tocmctc cmctc?    @relation("bakmp_keycmctc2Tocmctc", fields: [keycmctc2], references: [keycmctc], onDelete: NoAction, onUpdate: NoAction, map: "fkbakmpkeycmctc2")
  cmobj                        cmobj     @relation(fields: [keycmobj], references: [keycmobj], onDelete: Cascade, onUpdate: NoAction, map: "fkbakmpkeycmobj")
  tvart                        tvart?    @relation(fields: [keytvart], references: [keytvart], onUpdate: NoAction, map: "fkbakmpkeytvart ")
  tvpca                        tvpca?    @relation(fields: [keytvpca], references: [keytvpca], onUpdate: NoAction, map: "fkbakmpkeytvpca")

  @@index([keyaobdl], map: "fkbakmpaobdl")
  @@index([keybakmt], map: "fkbakmpbakmt")
  @@index([keycmctc], map: "fkbakmpcmctc")
  @@index([keycmctc2], map: "fkbakmpcmctc2")
  @@index([keytvart], map: "fkbakmptvart")
  @@index([keytvpca], map: "fkbakmptvpca")
  @@index([fdate], map: "inbakmp_2KX0I3RLS")
  @@index([tdate], map: "inbakmp_2KX0I3RMK")
  @@index([code], map: "inbakmp_2KX0I3RN3")
  @@index([caption], map: "inbakmp_2KX0I3RNI")
}
\`\`\`


\`\`\`prisma
model Component {
  @@map("bakmp")

  id String @id(map: "pkbakmp") @map("keybakmp") @db.Char(15)
  objectID String @unique(map: "fkbakmpcmobj") @map("keycmobj") @db.Char(15)
  typeId String? @map("keybakmt") @db.Char(15)
  categoryId String? @map("keybakmc") @db.Char(15)
  systemSupplierId String? @map("keycmctc") @db.Char(15) 
  ownerUserId String? @map("keycmctc2") @db.Char(15)
  constructionPartId String? @map("keyaobdl") @db.Char(15)
  itemId String? @map("keytvart") @db.Char(15)
  priceCategoryId String? @map("keytvpca") @db.Char(15)
  code String @map("code") @db.VarChar(30)
  name String? @map("caption") @db.VarChar(60)
  manufacturer String? @map("fabrikat") @db.VarChar(60)
  typeDesignation String? @map("typbeteckn") @db.VarChar(60)
  installationDate DateTime? @map("instdatum") @db.DateTime
  warrantyEndDate DateTime? @map("tdatewarr") @db.DateTime
  serves String? @map("betjanar") @db.VarChar(60)
  faultReportingAdministration Int @default(1, map: "DF__bakmp__aoadm__5A029E25") @map("aoadm") @db.TinyInt
  isArtInventory Int @default(0, map: "DF__bakmp__isai__5AF6C25E") @map("isai") @db.TinyInt
  deleteMark Int @default(0, map: "DF__bakmp__deletemar__5BEAE697") @map("deletemark") @db.TinyInt
  fromDate DateTime @map("fdate") @db.DateTime
  toDate DateTime @map("tdate") @db.DateTime
  timestamp String @map("timestamp") @db.Char(10)

  // TODO: rename these virtual fields when knowing the new model names
  // aobdl                        aobdl?    @relation(fields: [keyaobdl], references: [keyaobdl], onUpdate: NoAction, map: "fkbakmpkeyaobdl ")
  // bakmc                        bakmc?    @relation(fields: [keybakmc], references: [keybakmc], onUpdate: NoAction, map: "fkbakmpkeybakmc ")
  // bakmt                        bakmt?    @relation(fields: [keybakmt], references: [keybakmt], onUpdate: NoAction, map: "fkbakmpkeybakmt ")
  // cmctc_bakmp_keycmctcTocmctc  cmctc?    @relation("bakmp_keycmctcTocmctc", fields: [keycmctc], references: [keycmctc], onDelete: NoAction, onUpdate: NoAction, map: "fkbakmpkeycmctc")
  // cmctc_bakmp_keycmctc2Tocmctc cmctc?    @relation("bakmp_keycmctc2Tocmctc", fields: [keycmctc2], references: [keycmctc], onDelete: NoAction, onUpdate: NoAction, map: "fkbakmpkeycmctc2")
  // cmobj                        cmobj     @relation(fields: [keycmobj], references: [keycmobj], onDelete: Cascade, onUpdate: NoAction, map: "fkbakmpkeycmobj")
  // tvart                        tvart?    @relation(fields: [keytvart], references: [keytvart], onUpdate: NoAction, map: "fkbakmpkeytvart ")
  // tvpca                        tvpca?    @relation(fields: [keytvpca], references: [keytvpca], onUpdate: NoAction, map: "fkbakmpkeytvpca")

  @@index([constructionPartId], map: "fkbakmpaobdl")
  @@index([typeId], map: "fkbakmpbakmt")
  @@index([systemSupplierId], map: "fkbakmpcmctc")
  @@index([ownerUserId], map: "fkbakmpcmctc2")
  @@index([itemId], map: "fkbakmptvart")
  @@index([priceCategoryId], map: "fkbakmptvpca")
  @@index([fromDate], map: "inbakmp_2KX0I3RLS")
  @@index([toDate], map: "inbakmp_2KX0I3RMK")
  @@index([code], map: "inbakmp_2KX0I3RN3")
  @@index([name], map: "inbakmp_2KX0I3RNI")
}
\`\`\`
--- EXAMPLE 2 ---

You can use comments to explain your resoning but only when you are uncertain or want to keep a reference to an old name if you are uncertain with a TODO: comment. If you have fixed a TODO, remove the comment.

ONLY RESPOND WITH NEW SCHEMA. DO NOT RESPOND WITH ANYTHING ELSE.
`,
          },
        ]
          .flat()
          .filter((m) => m && m.content !== undefined) as any[]
        console.log(
          modelSummary.modelName,
          'AI: Sending messages:',
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

        saveModelToDisk(modelSummary, outputDir)
        return [...converted, modelSummary]
      },
      [] as ModelSummary[],
      1
    ),
    last() // wait until we are finished until we let the next step to proceed
  )
