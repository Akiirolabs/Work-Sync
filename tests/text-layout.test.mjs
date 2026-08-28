import assert from "node:assert/strict";
import test from "node:test";
import { wrapExternalText, wrapExternalValue } from "../src/lib/text-layout.ts";

test("pasted and automated text wraps at the text-frame limit", () => {
  const source = Array.from({ length: 36 }, () => "generated").join(" ");
  const lines = wrapExternalText(source, 60);
  assert.ok(lines.length > 1);
  assert.ok(lines.every((line) => line.length <= 60));
  assert.equal(wrapExternalValue(source, 60), lines.join("\n"));
});

test("existing explicit line breaks are preserved", () => {
  assert.deepEqual(wrapExternalText("first\nsecond", 60), ["first", "second"]);
});
