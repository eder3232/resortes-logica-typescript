import { IVertex, IVerticesFullData } from './vertices'

export interface IEdge {
  k: number
  from: IVertex
  to: IVertex
  id: string
}

export interface IEdgesData {
  [key: string]: IEdge
}

export interface IEdgesFullData {
  edges: IEdgesData
  vertices: IVerticesFullData
}

interface IEdgesClass {
  data: IEdgesData
  verticesFullData: IVerticesFullData
  getData(): IEdgesFullData
}

export class Edges implements IEdgesClass {
  data: IEdgesData = {}
  verticesFullData: IVerticesFullData
  constructor(vertices: IVerticesFullData) {
    this.verticesFullData = vertices
  }

  add(from: string, to: string, k: number, id = '') {
    // Verificando si el id existe
    if (this.data[id] !== undefined) {
      throw new Error(`The name ${id} already exists`)
    }
    //Verificando si el from y el to son valores validos
    if (!Object.keys(this.verticesFullData.data).includes(from)) {
      throw new Error(`The vertex with id: ${from} doesn't exist.`)
    } else if (!Object.keys(this.verticesFullData.data).includes(to)) {
      throw new Error(`The vertex with id: ${to} doesn't exist.`)
    } else {
      const newObject: IEdge = {
        k: k,
        from: this.verticesFullData.data[from],
        to: this.verticesFullData.data[to],
        id: id,
      }
      this.data[id] = newObject
    }
  }
  getData(): IEdgesFullData {
    return {
      edges: this.data,
      vertices: this.verticesFullData,
    }
  }
}
