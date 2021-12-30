import {
  formatLine,
  splitLines,
  toSqlLines,
  toSqlLinesData,
} from "../lib/sqlpad";

test("formatLine", () => {
  const result = formatLine(
    ["156773072708", "156773072708"],
    "update bc_bank_movement set IS_AUDIT = 'N' where BANK_MOVEMENT_NO = $1 and abc = $1"
  );
  expect(result).toEqual(
    "update bc_bank_movement set IS_AUDIT = 'N' where BANK_MOVEMENT_NO = 156773072708 and abc = 156773072708"
  );
});

test("toSqlLines", () => {
  const result = toSqlLines(
    [["156773072708", "156773072708"]],
    "update bc_bank_movement set IS_AUDIT = 'N' where BANK_MOVEMENT_NO = $1 and abc = $1"
  );
  expect(result).toEqual([
    "update bc_bank_movement set IS_AUDIT = 'N' where BANK_MOVEMENT_NO = 156773072708 and abc = 156773072708",
  ]);
});

test("splitLines", () => {
  const result = splitLines(`156773072708 156773072708
156773072708 156773072708 15677307
                 `);
  expect(result).toEqual([
    "156773072708 156773072708",
    "156773072708 156773072708 15677307",
  ]);
});
test("toSqlLinesData", () => {
  const result = toSqlLinesData(`156773072708 156773072708
                 156773072708 156773072708 15677307
                 `);
  expect(result).toEqual([
    ["156773072708", "156773072708"],
    ["156773072708", "156773072708", "15677307"],
  ]);
});
