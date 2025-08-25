export type LoginParams = {
  username: string
  password: string
}

export type Status = {
  date: Date
  warehouse: StatusWarehouse
  user: StatusUser
  version: number
}

type StatusWarehouse = {
  unid: number
  code: string
  name: string
}

type StatusUser = {
  unid: number
  id: number
  login: string
  code: string
}