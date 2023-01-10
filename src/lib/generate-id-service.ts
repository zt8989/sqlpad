import { Snowflake } from "node-snowflake"
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs"
export class GenerateService {
  private static preService: GenerateService

  private hash: String
  private snowIds: string[] = []
  private uuidv4s: string[] = []
  private now = dayjs()

  private constructor(hash: String){
    this.hash = hash
  }

  getNow(mile: boolean){
    return mile ? this.now.valueOf() : this.now.unix()
  }

  getDate(){
    return this.now.format("YYYY-MM-DD")
  }

  getDateTime(){
    return this.now.format("YYYY-MM-DD HH:mm:ss")
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
      this.preService = new GenerateService(hash)
      return this.preService
    }
  }
}
