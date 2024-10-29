# Prisma AI Renamer

A CLI tool to use AI to rename complex Prisma schemas according to naming conventions without changing the underlying database structure.

## How to use

Make sure you have OPENAI_API_KEY in your environment or in a .env file in the same folder you are using this tool.

To use this CLI tool, run:

```bash
npx prisma-ai-renamer --schema prisma/schema.prisma modelName
```

or for local development

```bash
# git clone
# cd xpand-prisma-client
npm run build
npm link
```

## Usage

## Requirements

The tool needs to know a few things about your environment to be able to guess the correct names. Look in the [prompts](prompts) folder for examples. Also you will need some form of hint for the field names if there are anything available. Look inside the [tables](tables) for more information on format.

Also you will need a OPENAI_API_KEY token to run this tool.

### Convert Models

To convert models with a starting point and schema file, use the following command:

```bash
prisma-ai-renamer --schema ./path/to/schema.prisma ModelName
```

### Options

- `-s, --schema <path>`: Path to the schema file. Default is `./prisma/schema.prisma`.
- `-m, --model <name>`: Starting model name. Default is `babuf`.
- `-o, --output <directory>`: Output directory for converted models. Default is `./converted`.
- `-sp, --system-prompt <path>`: Path to the system prompt file. Default is `./prompts/systemPrompt.md`.
- `-c, --conventions <path>`: Path to the coding conventions markdown file. Default is `./prompts/conventions.md`.
- `-dk, --domain-knowledge <path>`: Path to the domain knowledge file. Default is `./prompts/domainKnowledge.md`.
- `-r, --reverse-only`: Perform only the reverse check, setting forward to false.

### Example

```bash
prisma-ai-renamer -s ./prisma/schema.prisma -o ./output MyModel
```

This command will convert the models starting from `MyModel` using the schema at `./prisma/schema.prisma` and save the converted models to the `./output` directory using default prompts stored in prompts/ dir.
