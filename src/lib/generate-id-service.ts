import { Snowflake } from "node-snowflake"
import { v4 as uuidv4 } from 'uuid';

export class GenerateIdService {
  private static preService: GenerateIdService

  private hash: String
  private snowIds: string[] = []
  private uuidv4s: string[] = []

  private constructor(hash: String){
    this.hash = hash
  }

  incId(index: number, start: number){
    return index + start
  }

  snowId(index: number){
    if(this.snowIds[index]){
      return this.snowIds[index]
    }

    const id: string = Snowflake.nextId()
    this.snowIds.push(id)
    return id
  }

  uuidv4(index: number){
    if(this.uuidv4s[index]){
      return this.uuidv4s[index]
    }

    const id: string = uuidv4()
    this.uuidv4s.push(id)
    return id
  }

  uuid(index: number){
    return this.uuidv4(index).replace(/-/g, "")
  }

  static make(hash: String, forceNew = false) {
    if(!forceNew && this.preService && this.preService.hash === hash){
      return this.preService
    } else {
      this.preService = new GenerateIdService(hash)
      return this.preService
    }
  }
}
