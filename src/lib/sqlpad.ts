import _ from "lodash";
import { pipe, trim } from "lodash/fp";
import { parseFilters } from "./filter-parser";
import { GenerateService } from "./generate-id-service";
import { log } from "./log";

export function splitCols(line: string, delimiter: string): (string | string[])[] {
  const deli = /^\s+$/.test(delimiter) ? /\s+/g : delimiter;
  return [line.split(deli).filter(Boolean).map(_.trim), ...line.split(deli).filter(Boolean).map(_.trim)];
}

export function splitLines(content: string): string[] {
  return content.split(/[\r\n|\r|\n]/g).filter(pipe(trim, Boolean));
}

export function toSqlLinesData(
  content: string,
  delimiter: string = " ",
  startLine: number = 0
):(string | string[])[][] {
  return splitLines(content)
    .map((x) => splitCols(x, delimiter));
}

export function toSqlLines(param: {
  content: string,
  delimiter: string,
  startLine: number,
  sqlTemplate: string,
  inMode: boolean
  service: GenerateService
}) {
  const {
    content, 
    delimiter = " ", 
    startLine = 0, 
    sqlTemplate,
    inMode,
    service
  } = param
  const originData = toSqlLinesData(content, delimiter, startLine)
  const sliceData = originData.slice(startLine)
  return inMode
    ? [
        formatLine({
          item: _.unzip(sliceData),
          sqlTemplate,
          index: 0,
          data: sliceData,
          originData,
        },
          service
        ),
      ]
    : sliceData.map((x, index) => formatLine({ item: x, sqlTemplate, index, data: sliceData, originData }, service));
}

const simpleFormat = /^\$(\d+)$/;
const complexFormat = /^\${((\d+).*)}$/;
const simpleLineFormat = /^#(\d+)$/;
const complexLineFormat = /^#{((\d+).*)}$/;
const idFormat = /^(@id(\.\d+)?|@snow|@uuidv4|@uuid)$/
const dateFormat = /^(@now|@datetime|@date)$/

const userDefineFuncs = {
  quote: (x: string, type = "'") => `${type}${x}${type}`,
};

export function getDataFromFormat(param: formatLineArgs, current: string, service: GenerateService) {
  const { data, item, index } = param
  switch(current[0]){
    case "@":
      let match: RegExpMatchArray | null
      if(match = current.match(idFormat)){
        return matchId(match, index, service)
      }
      if(match = current.match(dateFormat)){
        return matchDate(match, index, service)
      }
    case "#":
      return matchLine(current, param.originData)
    case "$":
      return matchItem(current, item)
    default:
      return ""
  }
}

function resolveData(data: any, current: string, match: RegExpMatchArray) {
  const parse = parseFilters("$" + match[1]);
  log.dubug(parse)
  const resolveFilter = (x: string) => {
    return _.get(userDefineFuncs, x) || _.get(_, x) || _.identity;
  };
  const func = new Function("$" + match[2], "_f", "_", `return ${parse}`);
  const item = _.get(data, match[2], [])
  if(!current.includes("map(")){
    return Array.isArray(item) ? item.slice(1).map(i => func(i, resolveFilter, { ..._, ...userDefineFuncs })).join() : ""
  }
  const result = func(item.slice(1), resolveFilter, { ..._, ...userDefineFuncs })
  return Array.isArray(result) ? result.join() : result
}

function matchLine(current: string, data: any){
  let match;
  if ((match = current.match(simpleLineFormat))) {
    const line = parseInt(match[1])
    const item = _.get(data, line, []);
    return Array.isArray(item) ? item.slice(1).join() : item
  } else if ((match = current.match(complexLineFormat))) {
    try {
        return resolveData(data, current, match!)
    } catch (e) {
      log.error(e)
      const item = _.get(data, match[2], "")
      return Array.isArray(item) ? item.join() : item
    }
  }
}

function matchItem(current: string, data: any){
  let match;
  if ((match = current.match(simpleFormat))) {
    const item = _.get(data, match[1], "");
    return Array.isArray(item) ? item.join() : item
  } else if ((match = current.match(complexFormat))) {
    const parse = parseFilters("$" + match[1]);
    const resolveFilter = (x: string) => {
      return _.get(userDefineFuncs, x) || _.get(_, x) || _.identity;
    };
    try {
      const func = new Function("$" + match[2], "_f", `return ${parse}`);
      const item = _.get(data, match[2], "")
      return Array.isArray(item) ? item.map(x => func(x, resolveFilter)) : func(item, resolveFilter);
    } catch (e) {
      const item = _.get(data, match[2], "")
      return Array.isArray(item) ? item.join() : item
    }
  }
}

function matchId(match: RegExpMatchArray, index = 0, service: GenerateService){
  if(match[1].startsWith("@id")){
    const start = match[2] ? Number.parseInt(match[2].slice(1)) : 1
    return service.incId(index, start)
  }
  if(match[1] === "@snow"){
    return service.snowId(index)
  }
  if(match[1] === "@uuid"){
    return service.uuid(index)
  }
  if(match[1] === "@uuidv4"){
    return service.uuidv4(index)
  }
  return ``
}

interface formatLineArgs {
  item: any[],
  data: any[][],
  originData: any[][],
  sqlTemplate: string, 
  index:number
}

export function formatLine(param: formatLineArgs, service: GenerateService) {
  const { sqlTemplate, index = 0 } = param
  const matches = sqlTemplate.match(/(?<!\\)(\$\d+|\${\d+.*?}|#\d+|#{\d+.*?}|@id(\.\d+)?|@snow|@uuidv4|@uuid|@now|@datetime|@date)/g);
  const set = new Set(matches);
  return _.sortBy(Array.from(set), (x) => -x.length).reduce((prev, current) => {
    return prev.replace(
      new RegExp(_.escapeRegExp(current), "g"),
      getDataFromFormat(param, current, service)
    );
  }, sqlTemplate);
}
function matchDate(match: RegExpMatchArray, index: number, service: GenerateService) {
  if(match[1].startsWith("@now")){
    return service.getNow(true)
  }
  if(match[1] === "@date"){
    return service.getDate()
  }
  if(match[1] === "@datetime"){
    return service.getDateTime()
  }
  return ``
}

