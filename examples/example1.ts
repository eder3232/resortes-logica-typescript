import { Edges } from '../models/edges'
import { Spring } from '../models/spring'
import { Vertices } from '../models/vertices'

const vertices1 = new Vertices()

vertices1.addRestrictedVertex(0, 'v1')

vertices1.addUnrestrictedVertex(-4, 'v2')
vertices1.addUnrestrictedVertex(-8, 'v3')
vertices1.addUnrestrictedVertex(20, 'v4')

console.log(vertices1)

const edges1 = new Edges(vertices1.getData())

edges1.add('v1', 'v2', 10, 'e1')
edges1.add('v2', 'v3', 8, 'e2')
edges1.add('v3', 'v4', 12, 'e3')

const spring1 = new Spring(edges1.getData())

export { spring1 }
