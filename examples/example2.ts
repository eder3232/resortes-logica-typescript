import { Edges } from '../models/edges'
import { Spring } from '../models/spring'
import { Vertices } from '../models/vertices'

const vertices2 = new Vertices()

vertices2.addRestrictedVertex(0, 'v4')
vertices2.addRestrictedVertex(0, 'v5')

vertices2.addUnrestrictedVertex(5, 'v1')
vertices2.addUnrestrictedVertex(4, 'v2')
vertices2.addUnrestrictedVertex(0, 'v3')

const edges2 = new Edges(vertices2.getData())

edges2.add('v4', 'v2', 10, 'e1')
edges2.add('v2', 'v3', 4, 'e2')
edges2.add('v3', 'v5', 3, 'e3')
edges2.add('v2', 'v1', 8, 'e4')

const spring2 = new Spring(edges2.getData())

export { spring2 }
