import { map, pipe, toArray } from 'rxjs'
import { Graph, Node } from 'fast-graph'
import { Model } from '../types/models'

export const modelsToGraph = (requiredRelationships = false) =>
  pipe(
    toArray<Model>(),
    map((models: Model[]) => {
      const graph = new Graph<Model>()
      const nodes = new Map<string, Node<Model>>()
      models.forEach((model) => {
        const node = new Node(model.name, model)
        nodes.set(model.name, node)
        graph.addNode(node)
      })
      models.forEach((model) => {
        model.relations
          ?.filter((dep) => !requiredRelationships || dep.type === 'link')
          .forEach((dep) => {
            const fromNode = new Node(model.name, model)
            const toNode = nodes.get(dep.name)
            if (toNode !== undefined) {
              graph.addEdge(fromNode, toNode)
            }
          })
      })
      return graph
    })
  )
