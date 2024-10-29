import { map, pipe } from 'rxjs'
import { Graph, Node } from 'fast-graph'
import { Model } from '../types/models'

export const findInitialNode = (initialNode: string) =>
  pipe(
    map((graph: Graph<Model>) => {
      let foundNode = null
      // @ts-ignore
      graph._nodes.forEach((node) => {
        if (node.id === initialNode) {
          foundNode = node
        }
      })
      return { graph, initialNode: foundNode }
    })
  )
