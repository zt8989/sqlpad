import _ from "lodash";
import { pipe, trim } from "lodash/fp";
import { parseFilters } from "./filter-parser";
import { GenerateIdService } from "./generate-id-service";

export function splitCols(line: string, delimiter: string): string[] {
  const deli = /^\s+$/.test(delimiter) ? /\s+/g : delimiter;
  return [line, ...line.split(deli).filter(Boolean).map(_.trim)];
}

export function splitLines(content: string): string[] {
  return content.split(/[\r\n|\r|\n]/g).filter(pipe(trim, Boolean));
}

export function toSqlLinesData(
  content: string,
  delimiter: string = " ",
  startLine: number = 0
): string[][] {
  return splitLines(content)
    .slice(startLine)
    .map((x) => splitCols(x, delimiter));
}

export function toSqlLines(param: {
  content: string,
  delimiter: string,
  startLine: number,
  sqlTemplate: string,
  inMode: boolean
  service: GenerateIdService
}) {
  const {
    content, 
    delimiter = " ", 
    startLine = 0, 
    sqlTemplate,
    inMode,
    service
  } = param
  const data = toSqlLinesData(content, delimiter, startLine)
  return inMode
    ? [
        formatLine(
          _.unzip(data),
          sqlTemplate,
          0,
          service
        ),
      ]
    : data.map((x, index) => formatLine(x, sqlTemplate, index, service));
}

const simpleFormat = /^\$(\d+)$/;
const complexFormat = /^\${((\d+).*)}$/;
const idFormat = /^(@id(\.\d+)?|@snow|@uuidv4|@uuid)$/

const userDefineFuncs = {
  quote: (x: string, type = "'") => `${type}${x}${type}`,
};

export function getDataFromFormat(data: any, current: string, index = 0, service: GenerateIdService) {
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
  } else if((match = current.match(idFormat))){
    return matchId(match as unknown as RegExpMatchArray, index, service)
  }
}

function matchId(match: RegExpMatchArray, index = 0, service: GenerateIdService){
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

export function formatLine(data: any[], sqlTemplate: string, index = 0, service: GenerateIdService) {
  const matches = sqlTemplate.match(/\$\d+|\${\d+.*?}|@id(\.\d+)?|@snow|@uuidv4|@uuid/g);
  const set = new Set(matches);
  return _.sortBy(Array.from(set), (x) => -x.length).reduce((prev, current) => {
    return prev.replace(
      new RegExp(_.escapeRegExp(current), "g"),
      getDataFromFormat(data, current, index, service)
    );
  }, sqlTemplate);
}
