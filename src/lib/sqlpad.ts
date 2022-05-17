import _ from "lodash";
import { pipe, trim } from "lodash/fp";
import { parseFilters } from "./filter-parser";

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

export function toSqlLines(
  data: string[][],
  sqlTemplate: string,
  inMode: boolean
) {
  return inMode
    ? [
        formatLine(
          _.unzip(data).map((x) => x.join()),
          sqlTemplate
        ),
      ]
    : data.map((x) => formatLine(x, sqlTemplate));
}

const simpleFormat = /^\$(\d+)$/;
const complexFormat = /^\${((\d+).*)}$/;

const userDefineFuncs = {
  quote: (x: string, type = "'") => `${type}${x}${type}`,
};

export function getDataFromFormat(data: any, current: string) {
  let match;
  if ((match = current.match(simpleFormat))) {
    return _.get(data, match[1], "");
  } else if ((match = current.match(complexFormat))) {
    const parse = parseFilters("$" + match[1]);
    const resolveFilter = (x: string) => {
      return _.get(userDefineFuncs, x) || _.get(_, x) || _.identity;
    };
    try {
      const func = new Function("$" + match[2], "_f", `return ${parse}`);
      return func(_.get(data, match[2], ""), resolveFilter);
    } catch (e) {
      return _.get(data, match[2], "");
    }
  }
}

export function formatLine(data: any[], sqlTemplate: string) {
  const matches = sqlTemplate.match(/(\$\d+)|(\${\d+.*?})/g);
  const set = new Set(matches);
  console.log(set);
  return _.sortBy(Array.from(set), (x) => -x.length).reduce((prev, current) => {
    console.log(prev, current);
    return prev.replace(
      new RegExp(_.escapeRegExp(current), "g"),
      getDataFromFormat(data, current)
    );
  }, sqlTemplate);
}
