"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const query = fs.readFileSync(path.join(root, "Vue.novaextension", "Queries", "injections.scm"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function section(startMarker, endMarker) {
  const start = query.indexOf(startMarker);
  assert(start >= 0, `Missing query section: ${startMarker}`);

  const end = endMarker ? query.indexOf(endMarker, start + startMarker.length) : query.length;
  assert(end >= 0, `Missing query section boundary: ${endMarker}`);
  return query.slice(start, end);
}

function directive(source, name) {
  const start = source.indexOf(`(#${name}`);
  assert(start >= 0, `Missing #${name} directive`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  throw new Error(`Unterminated #${name} directive`);
}

function languageCases(source) {
  const expression = directive(source, "set-by-case-eq!");
  const values = [...expression.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) => JSON.parse(`"${match[1]}"`));
  assert(values.length > 0 && values.length % 2 === 0, "Language switch must contain only case/value pairs and no fallback");

  const cases = new Map();
  for (let index = 0; index < values.length; index += 2) {
    cases.set(values[index], values[index + 1]);
  }
  return cases;
}

function assertExplicitLangRule(source, label) {
  assert(source.includes("(attribute_name) @_lang_attr"), `${label} must capture the attribute name`);
  assert(source.includes('(attribute_value) @_lang_value'), `${label} must capture the lang value`);
  assert(source.includes('(#match? @_lang_attr "(?i)^lang$")'), `${label} must reject attributes other than lang`);
  assert(!source.includes("@_attrvalue"), `${label} must not select arbitrary attribute values`);
}

function assertFallbackRule(source, language, label) {
  assert(source.includes("(start_tag) @_start_tag"), `${label} fallback must inspect the complete start tag`);
  assert(
    source.includes('(#not-match? @_start_tag "(?i)(^|\\\\s)lang\\\\s*=")'),
    `${label} fallback must be disabled whenever lang is present`,
  );
  assert(source.includes(`(#set! injection.language "${language}")`), `${label} fallback must inject ${language}`);
}

function attributes(startTag) {
  const result = new Map();
  const attributePattern = /\s([A-Za-z_:][\w:.-]*)(?:\s*=\s*(["'])(.*?)\2)?/g;
  for (const match of startTag.matchAll(attributePattern)) {
    result.set(match[1].toLowerCase(), match[3]);
  }
  return result;
}

function resolve(startTag, cases, fallback) {
  const lang = attributes(startTag).get("lang");
  if (lang === undefined) return fallback ? [fallback] : [];
  const language = cases.get(lang);
  return language ? [language] : [];
}

function assertResolution(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: expected ${expected}, received ${actual}`);
}

const scriptExplicit = section("; Script tags with an explicit language", "; Script tags without a lang attribute");
const scriptFallback = section("; Script tags without a lang attribute", "; Pug template tags");
const templateExplicit = section("; Pug template tags", "; Style tags with an explicit language");
const styleExplicit = section("; Style tags with an explicit language", "; Style tags without a lang attribute");
const styleFallback = section("; Style tags without a lang attribute", "; Style attributes");

assertExplicitLangRule(scriptExplicit, "Script");
assertExplicitLangRule(templateExplicit, "Template");
assertExplicitLangRule(styleExplicit, "Style");
assertFallbackRule(scriptFallback, "javascript", "Script");
assertFallbackRule(styleFallback, "css", "Style");

const scriptCases = languageCases(scriptExplicit);
const templateCases = languageCases(templateExplicit);
const styleCases = languageCases(styleExplicit);

const genericFixture = fs.readFileSync(path.join(root, "test-workspaces", "injections", "script-generic.vue"), "utf8");
assert(genericFixture.includes('<script setup lang="ts" generic="TData extends Record<string, unknown>">'), "Generic fixture is missing lang-before-generic coverage");
assert(genericFixture.includes('<style lang="stylus" module="styles">'), "Generic fixture is missing style extra-attribute coverage");

const fallbackFixture = fs.readFileSync(path.join(root, "test-workspaces", "injections", "non-lang-attributes.vue"), "utf8");
assert(fallbackFixture.includes('<script setup data-language="ts">'), "Fallback fixture is missing a misleading script attribute");
assert(fallbackFixture.includes('<template data-language="pug">'), "Fallback fixture is missing a misleading template attribute");
assert(fallbackFixture.includes('<style scoped data-language="stylus">'), "Fallback fixture is missing a misleading style attribute");

const cases = [
  [resolve('<script setup lang="ts" generic="T">', scriptCases, "javascript"), ["typescript"], "lang before generic"],
  [resolve('<script setup generic="T" lang="ts">', scriptCases, "javascript"), ["typescript"], "generic before lang"],
  [resolve('<script setup data-language="ts">', scriptCases, "javascript"), ["javascript"], "non-lang script attribute"],
  [resolve('<script setup lang="tsx" data-mode="js">', scriptCases, "javascript"), ["tsx"], "TSX with another attribute"],
  [resolve('<script setup lang="unknown" data-language="ts">', scriptCases, "javascript"), [], "unsupported explicit script lang"],
  [resolve('<template lang="pug" data-language="html">', templateCases, null), ["pug"], "Pug with another attribute"],
  [resolve('<template data-language="pug">', templateCases, null), [], "non-lang template attribute"],
  [resolve('<style lang="stylus" module="styles">', styleCases, "css"), ["stylus"], "Stylus with module"],
  [resolve('<style scoped data-language="stylus">', styleCases, "css"), ["css"], "non-lang style attribute"],
  [resolve('<style lang="unknown" data-language="css">', styleCases, "css"), [], "unsupported explicit style lang"],
];

for (const [actual, expected, label] of cases) {
  assertResolution(actual, expected, label);
}

console.log("Vue injection rule tests passed.");
