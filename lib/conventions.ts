import fs from 'fs'

export function loadPrompt(promptPath: string): any {
  const data = fs.readFileSync(promptPath, 'utf-8')
  return data
}
