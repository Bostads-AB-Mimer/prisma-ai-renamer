import { Example } from '../types/models'

export const examplesToMarkdown = (examples: Example[]) => {
  /*
      Convert:
        ;HYAEV     ;Rental object, empty value;1;KEYHYAEV  ;;C;15
        ;HYAEV     ;Rental object, empty value;2;KEYCMOBJ  ;Objekt;C;15
        ;HYAEV     ;Rental object, empty value;3;FDATE     ;From;T;8
        ;HYAEV     ;Rental object, empty value;4;VALUE     ;Amount;Y;8
        ; HYAEV;Rental object, empty value; 5; TIMESTAMP;; C; 10
      
      To:
      ## HYAEV: "Rental object, empty value"
      - KEYHYAEV: Key to rental object, empty value
      - KEYCMOBJ: Key to common object
      */
  if (examples.length === 0) return ''

  const header = `## ${examples[0].table}: "${examples[0].tableDescription}"`
  const fields = examples
    .map((row) => `- ${row.fieldName}: ${row.fieldDescription}`)
    .join('\n')
  return `${header}\n${fields}`
}
