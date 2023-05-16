export interface IVertex {
  force: number
  displacement: number
  isRestricted: boolean
  id: string
}

export interface IVerticesData {
  [key: string]: IVertex
}

export interface IVerticesFullData {
  data: IVerticesData
  restrictedVertices: number
  unrestrictedVertices: number
  totalVertices: number
}

interface IVerticesClass {
  data: IVerticesData
  restrictedVertices: number
  unrestrictedVertices: number
  addRestrictedVertex(displacement: number, id: string): IVerticesData
  addUnrestrictedVertex(displacement: number, id: string): IVerticesData
  getData(): IVerticesFullData
}

export class Vertices implements IVerticesClass {
  data: IVerticesData = {}
  restrictedVertices = 0
  unrestrictedVertices = 0
  // constructor() {}

  addRestrictedVertex(displacement: number, id: string) {
    //Un nudo restringido no puede tener una fuerza aplicada

    // Verificando si el id existe
    if (this.data[id] !== undefined) {
      throw new Error(`The name ${id} already exists.`)
    }

    const newVertex: IVertex = {
      force: 0,
      displacement: displacement,
      isRestricted: true,
      id: id,
    }

    this.restrictedVertices++
    this.data[id] = newVertex
    return this.data
  }
  addUnrestrictedVertex(force: number, id = '') {
    // Verificando si el id existe
    if (this.data[id] !== undefined) {
      throw new Error(`The name ${id} already exists.`)
    }
    const newVertex = {
      force: force,
      displacement: 0,
      isRestricted: false,
      id: id,
    }

    this.unrestrictedVertices++
    this.data[id] = newVertex
    return this.data
  }

  getData(): IVerticesFullData {
    return {
      data: this.data,
      restrictedVertices: this.restrictedVertices,
      unrestrictedVertices: this.unrestrictedVertices,
      totalVertices: Object.keys(this.data).length,
    }
  }
}
