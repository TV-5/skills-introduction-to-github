import test from "node:test";
import assert from "node:assert/strict";
import { generateDocument } from "../src/documentGenerator.js";

const oneField = [{ key: "value", label: "Value" }];

function section(overrides = {}) {
  return {
    label: "Test Section",
    fields: oneField,
    assignment: {
      stakeholderName: "Alice",
      stakeholderEmail: "alice@example.com",
      data: {},
      ...overrides,
    },
  };
}

test("renders the title, description, and a generated timestamp line", () => {
  const md = generateDocument({ name: "Orders API", description: "Internal only" }, []);
  assert.match(md, /^# API Requirements Document: Orders API/);
  assert.match(md, /Internal only/);
  assert.match(md, /_Generated \d{4}-\d{2}-\d{2}T/);
});

test("omits the description line cleanly when blank or null", () => {
  const blank = generateDocument({ name: "Orders API", description: "" }, []);
  assert.doesNotMatch(blank, /undefined|null/);

  const nullDesc = generateDocument({ name: "Orders API", description: null }, []);
  assert.doesNotMatch(nullDesc, /undefined|null/);
});

test("renders a filled field's value and attributes it to the stakeholder", () => {
  const md = generateDocument(
    { name: "Orders API" },
    [section({ data: { value: "hello" } })]
  );
  assert.match(md, /## Test Section/);
  assert.match(md, /\*Provided by Alice \(alice@example\.com\)\*/);
  assert.match(md, /\*\*Value:\*\*\n\nhello/);
});

test("empty, whitespace-only, null, and undefined values all render as 'Not provided'", () => {
  for (const value of ["", "   ", null, undefined]) {
    const md = generateDocument({ name: "Orders API" }, [section({ data: { value } })]);
    assert.match(md, /_Not provided_/, `expected "_Not provided_" for value ${JSON.stringify(value)}`);
  }
});

test("truthiness pin: numeric 0 and boolean false render as 'Not provided' (the check short-circuits on the raw value before stringifying), but the string \"0\" renders literally", () => {
  const zero = generateDocument({ name: "Orders API" }, [section({ data: { value: 0 } })]);
  assert.match(zero, /_Not provided_/);

  const falseVal = generateDocument({ name: "Orders API" }, [section({ data: { value: false } })]);
  assert.match(falseVal, /_Not provided_/);

  const stringZero = generateDocument({ name: "Orders API" }, [section({ data: { value: "0" } })]);
  assert.match(stringZero, /\*\*Value:\*\*\n\n0/);
});

test("sections render in the order of the input array (caller is responsible for sorting)", () => {
  const md = generateDocument({ name: "Orders API" }, [
    { ...section(), label: "First Section" },
    { ...section(), label: "Second Section" },
  ]);
  const firstIndex = md.indexOf("## First Section");
  const secondIndex = md.indexOf("## Second Section");
  assert.ok(firstIndex >= 0 && secondIndex > firstIndex);
});

test("documented limitation: markdown-structural characters in a value pass through unescaped", () => {
  const payload = "## Fake Heading\n```\ncode fence\n```";
  const md = generateDocument({ name: "Orders API" }, [section({ data: { value: payload } })]);
  assert.match(md, /## Fake Heading/);
  assert.match(md, /```\ncode fence\n```/);
});
