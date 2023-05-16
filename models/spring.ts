import { IVerticesData, IVerticesFullData } from './vertices'
import { IEdge, IEdgesData, IEdgesFullData } from './edges'
import { Matrix, inverse } from 'ml-matrix'

interface IEdgeOfSprings extends IEdge {
  local: number[][]
  tableDOF: number[]
}

interface IOrderOfDOF {
  [key: string]: { isRestricted: boolean; position: number }
}

function twoDimensionalArray<T>(
  rows: number,
  columns: number,
  value: T
): T[][] {
  return Array(rows)
    .fill(null)
    .map((e) => Array(columns).fill(value))
}

export class Spring {
  dataVertices: IVerticesData
  dataEdges: { [key: string]: IEdgeOfSprings }
  springConfig: {
    verticesRestricted: number
    verticesUnrestricted: number
    verticesTotal: number

    dofForVertex: number
    lengthTableDOF: number
    orderOfDOF: IOrderOfDOF
  }

  f: {
    global: (number | string)[][]
    restricted: string[][]
    unrestricted: number[][]
  } = {
    global: Matrix.zeros(0, 0).toJSON(),
    restricted: twoDimensionalArray(0, 0, ''),
    unrestricted: twoDimensionalArray(0, 0, 0),
  }
  // k: { global: number[][] } = { global: [[]] }
  k: { global: Matrix; krr: Matrix; kru: Matrix; kur: Matrix; kuu: Matrix } = {
    global: Matrix.zeros(0, 0),
    krr: Matrix.zeros(0, 0),
    kru: Matrix.zeros(0, 0),
    kur: Matrix.zeros(0, 0),
    kuu: Matrix.zeros(0, 0),
  }

  u: {
    global: (number | string)[][]
    restricted: number[][]
    unrestricted: string[][]
  } = {
    global: Matrix.zeros(0, 0).toJSON(),
    restricted: twoDimensionalArray(0, 0, 0),
    unrestricted: twoDimensionalArray(0, 0, ''),
  }

  solved: {
    u: { unrestricted: Matrix; global: number[][] }
    f: { restricted: Matrix; global: number[][] }
    internalForces: {
      [key: string]: {
        u_i: number
        u_j: number
        delta: number
        internalForces: number
      }
    }
  } = {
    u: {
      unrestricted: Matrix.zeros(0, 0),
      global: twoDimensionalArray(0, 0, 0),
    },
    f: {
      restricted: Matrix.zeros(0, 0),
      global: twoDimensionalArray(0, 0, 0),
    },
    internalForces: {},
  }

  constructor(edgesData: IEdgesFullData) {
    //Inicializacion de los inputs
    this.dataVertices = JSON.parse(JSON.stringify(edgesData.vertices.data))
    this.dataEdges = JSON.parse(JSON.stringify(edgesData.edges))
    // Datos fundamentales
    const dofForVertex = 1
    this.springConfig = {
      dofForVertex: dofForVertex,
      lengthTableDOF: 2 * dofForVertex,
      orderOfDOF: {},
      verticesRestricted: edgesData.vertices.restrictedVertices,
      verticesUnrestricted: edgesData.vertices.unrestrictedVertices,
      verticesTotal: edgesData.vertices.totalVertices,
    }

    //Configuracion de datos
    this.dataConfig()
    //Creamos las matrices locales de rigidez
    this.generateLocals()
    //Generar el vector de grados de libertad de cada elemento
    this.generateTableDof()
    //Ensamblar la matriz global de rigidez
    this.buildGlobal()
    //Ensamblamos las matrices de fuerzas
    this.buildForces()
    //Ensamblamos las matrices de desplazamientos
    this.buildDisplacements()
    //separamos la matriz global de rigidez
    this.splitGlobal()
    //Resolver la matriz de desplazamientos
    this.solveDisplacements()
    //Resolver la matriz de fuerzas
    this.solveForces()
    //Creando las matrices globales numericas f y u
    this.buildNumericFAndU()
    //Obteniendo las fuerzas internas
    this.solveInternalForces()
  }

  dataConfig() {
    //Creando el esquema que tendra la matriz global de rigidez
    //los restringidos arriba
    //los no restringidos abajo
    const restricted: { id: string; isRestricted: boolean }[] = []
    const unrestricted: { id: string; isRestricted: boolean }[] = []

    Object.keys(this.dataVertices).map((vertex) => {
      if (this.dataVertices[vertex].isRestricted) {
        restricted.push({
          id: this.dataVertices[vertex].id,
          isRestricted: true,
        })
      } else {
        unrestricted.push({
          id: this.dataVertices[vertex].id,
          isRestricted: false,
        })
      }
    })

    const merge = [...restricted, ...unrestricted]
    const orderOfDOF: IOrderOfDOF = {}

    merge.map((e, i) => {
      orderOfDOF[e.id] = { isRestricted: e.isRestricted, position: i }
    })

    this.springConfig.orderOfDOF = orderOfDOF
  }

  generateLocals() {
    Object.keys(this.dataEdges).map((edge) => {
      const k = this.dataEdges[edge].k
      this.dataEdges[edge].local = [
        [k, -k],
        [-k, k],
      ]
    })
  }

  generateTableDof() {
    Object.keys(this.dataEdges).map((edge) => {
      this.dataEdges[edge].tableDOF = [
        this.springConfig.orderOfDOF[this.dataEdges[edge].from.id].position,
        this.springConfig.orderOfDOF[this.dataEdges[edge].to.id].position,
      ]
    })
  }

  assembler(edge: IEdgeOfSprings) {
    for (let i = 0; i < this.springConfig.lengthTableDOF; i++) {
      let row = edge.tableDOF[i]
      for (let j = 0; j < this.springConfig.lengthTableDOF; j++) {
        let column = edge.tableDOF[j]
        this.k.global.set(
          row,
          column,
          this.k.global.get(row, column) + edge.local[i][j]
        )
      }
    }
  }

  buildGlobal() {
    this.k.global = Matrix.zeros(
      this.springConfig.verticesTotal * this.springConfig.dofForVertex,
      this.springConfig.verticesTotal * this.springConfig.dofForVertex
    )

    Object.keys(this.dataEdges).map((edge) =>
      this.assembler(this.dataEdges[edge])
    )
  }

  buildForces() {
    this.f.global = Matrix.zeros(
      this.springConfig.verticesTotal * this.springConfig.dofForVertex,
      1
    ).toJSON()

    const restricted: string[][] = twoDimensionalArray(
      this.springConfig.verticesRestricted * this.springConfig.dofForVertex,
      1,
      ''
    ) //

    const unrestricted: number[][] = Matrix.zeros(
      this.springConfig.verticesUnrestricted * this.springConfig.dofForVertex,
      1
    ).toJSON()

    Object.keys(this.springConfig.orderOfDOF).map((key) => {
      //Agregando los valores necesarios a F global
      if (this.springConfig.orderOfDOF[key].isRestricted) {
        this.f.global[this.springConfig.orderOfDOF[key].position][0] =
          'P_' + key

        //Agregando los valores necesarios a F Restricted
        restricted[this.springConfig.orderOfDOF[key].position][0] = 'P_' + key
      } else {
        //Agregando los valores necesarios a F global
        this.f.global[this.springConfig.orderOfDOF[key].position][0] =
          this.dataVertices[key].force

        //Agregando los valores necesarios a F unestricted
        unrestricted[
          this.springConfig.orderOfDOF[key].position -
            this.springConfig.verticesRestricted
        ][0] = this.dataVertices[key].force
      }

      this.f.restricted = restricted
      this.f.unrestricted = unrestricted
      //Se podria crear el fglobal uniendo el restricted y el unrestricted, lo dejo porque me parecen interesantes ambas formas, no te la des de listillo eder del futuro!
    })
  }
  buildDisplacements() {
    this.u.global = Matrix.zeros(
      this.springConfig.verticesTotal * this.springConfig.dofForVertex,
      1
    ).toJSON()

    const restricted: number[][] = Matrix.zeros(
      this.springConfig.verticesRestricted * this.springConfig.dofForVertex,
      1
    ).toJSON()

    const unrestricted: string[][] = twoDimensionalArray(
      this.springConfig.verticesUnrestricted * this.springConfig.dofForVertex,
      1,
      ''
    )

    Object.keys(this.springConfig.orderOfDOF).map((key) => {
      //Agregando los valores necesarios a F global
      if (this.springConfig.orderOfDOF[key].isRestricted) {
        this.u.global[this.springConfig.orderOfDOF[key].position][0] =
          this.dataVertices[key].displacement

        //Agregando los valores necesarios a F Restricted
        restricted[this.springConfig.orderOfDOF[key].position][0] =
          this.dataVertices[key].displacement
      } else {
        //Agregando los valores necesarios a F global
        this.u.global[this.springConfig.orderOfDOF[key].position][0] =
          'u_' + key

        //Agregando los valores necesarios a F unestricted
        unrestricted[
          this.springConfig.orderOfDOF[key].position -
            this.springConfig.verticesRestricted
        ][0] = 'u_' + key
      }
    })

    this.u.restricted = restricted
    this.u.unrestricted = unrestricted
  }

  splitGlobal() {
    //|krr kru|
    //|kur kuu|
    const u: number = this.springConfig.verticesUnrestricted
    const r: number = this.springConfig.verticesRestricted
    //krr
    this.k.krr = Matrix.zeros(r, r)
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < r; j++) {
        this.k.krr.set(i, j, this.k.global.get(i, j))
      }
    }
    //kru
    this.k.kru = Matrix.zeros(r, u)
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < u; j++) {
        this.k.kru.set(i, j, this.k.global.get(i, j + r))
      }
    }
    //kur
    this.k.kur = Matrix.zeros(u, r)
    for (let i = 0; i < u; i++) {
      for (let j = 0; j < r; j++) {
        this.k.kur.set(i, j, this.k.global.get(i + r, j))
      }
    }
    //kuu
    this.k.kuu = Matrix.zeros(u, u)
    for (let i = 0; i < u; i++) {
      for (let j = 0; j < u; j++) {
        this.k.kuu.set(i, j, this.k.global.get(i + r, j + r))
      }
    }

    // console.log({
    //   krr: this.k.krr.toJSON(),
    //   kru: this.k.kru.toJSON(),
    //   kur: this.k.kur.toJSON(),
    //   kuu: this.k.kuu.toJSON(),
    // })
  }

  solveDisplacements() {
    this.solved.u.unrestricted = inverse(this.k.kuu).mmul(
      Matrix.sub(this.f.unrestricted, this.k.kur.mmul(this.u.restricted))
    )
  }

  solveForces() {
    this.solved.f.restricted = Matrix.add(
      this.k.krr.mmul(this.u.restricted),
      this.k.kru.mmul(this.solved.u.unrestricted)
    )
  }

  buildNumericFAndU() {
    this.solved.f.global = [
      ...this.solved.f.restricted.toJSON(),
      ...this.f.unrestricted,
    ]

    this.solved.u.global = [
      ...this.u.restricted,
      ...this.solved.u.unrestricted.toJSON(),
    ]
  }

  solveInternalForces() {
    // this.solved.internalForces=
    //Ensamblar la ecuacion global de rigidez con todos los valores correspondientes

    Object.keys(this.dataEdges).map((key) => {
      const u_i =
        this.solved.u.global[
          this.springConfig.orderOfDOF[this.dataEdges[key].from.id].position
        ][0]

      const u_j =
        this.solved.u.global[
          this.springConfig.orderOfDOF[this.dataEdges[key].to.id].position
        ][0]

      const internalForce = (u_j - u_i) * this.dataEdges[key].k

      this.solved.internalForces[key] = {
        u_i: u_i,
        u_j: u_j,
        delta: u_j - u_i,
        internalForces: internalForce,
      }
    })
  }
}
