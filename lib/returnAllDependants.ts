import { map, pipe } from 'rxjs'
import { Node, SearchAlgorithmNodeBehavior } from 'fast-graph'
import { Model } from '../types/models'

export const returnAllDependants = () =>
  pipe(
    map(({ graph, initialNode }) => {
      if (!initialNode) {
        throw new Error('Initial node not found')
      }
      const dependants: Node<Model>[] = []
      graph.dfs((node: Node<Model>) => {
        dependants.push(node)
        return SearchAlgorithmNodeBehavior.continue
      }, initialNode)
      return dependants.reverse()
    })
  )
