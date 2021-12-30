import _ from "lodash";
import { pipe, trim } from "lodash/fp";

export function splitCols(line: string, delimiter: string): string[] {
  const deli = /^\s+$/.test(delimiter) ? /\s+/g : delimiter;
  return [line, ...line.split(deli).filter(Boolean).map(_.trim)];
}

export function splitLines(content: string): string[] {
  return content.split(/[\r\n|\r|\n]/g).filter(pipe(trim, Boolean));
}

export function toSqlLinesData(
  content: string,
  delimiter: string = " "
): string[][] {
  return splitLines(content).map((x) => splitCols(x, delimiter));
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

export function formatLine(data: any[], sqlTemplate: string) {
  const matches = sqlTemplate.match(/\$\d+?/g);
  const set = new Set(matches);
  return Array.from(set).reduce((prev, current) => {
    return prev.replace(
      new RegExp(_.escapeRegExp(current), "g"),
      _.get(data, current.slice(1), "")
    );
  }, sqlTemplate);
}
