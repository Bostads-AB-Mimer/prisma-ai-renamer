import { filter, from, map, mergeMap, pipe, toArray } from 'rxjs'
import csvParser from 'csv-parser'
import fs from 'fs'
import { Node } from 'fast-graph'
import { Model } from '../types/models'

export const includeExamples = () =>
  pipe(
    mergeMap((node: Node<Model>) =>
      from(
        fs
          .createReadStream('./tables/tables.csv', { encoding: 'utf8' })
          .pipe(csvParser({ separator: ';' }))
      ).pipe(
        filter(
          (row) =>
            row.table.trim().toLowerCase() === node.value.name.toLowerCase()
        ),
        toArray(),
        map((rows) => {
          return {
            ...node.value,
            examples:
              rows.map(({ tableDescription, fieldName, fieldDescription }) => ({
                table: node.value.name,
                tableDescription: tableDescription.trim(),
                fieldName: fieldName.toLowerCase().trim(),
                fieldDescription: fieldDescription.trim(),
              })) || [],
          }
        })
      )
    )
  )
