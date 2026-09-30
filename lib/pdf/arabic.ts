/**
 * Arabic shaping for PDF.
 * PDF viewers do not apply OpenType GSUB, so logical Arabic is mapped to
 * presentation forms and reversed into visual order before it is drawn.
 */

const ISOLATED = 0
const FINAL = 1
const INITIAL = 2
const MEDIAL = 3

type Forms = readonly [string, string, string, string]

function forms(isolated: string, final: string, initial?: string, medial?: string): Forms {
  return [isolated, final, initial || isolated, medial || final]
}

const LETTERS: Record<string, Forms> = {
  "\u0621": forms("\uFE80", "\uFE80"),
  "\u0622": forms("\uFE81", "\uFE82"),
  "\u0623": forms("\uFE83", "\uFE84"),
  "\u0624": forms("\uFE85", "\uFE86"),
  "\u0625": forms("\uFE87", "\uFE88"),
  "\u0626": forms("\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"),
  "\u0627": forms("\uFE8D", "\uFE8E"),
  "\u0628": forms("\uFE8F", "\uFE90", "\uFE91", "\uFE92"),
  "\u0629": forms("\uFE93", "\uFE94"),
  "\u062A": forms("\uFE95", "\uFE96", "\uFE97", "\uFE98"),
  "\u062B": forms("\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"),
  "\u062C": forms("\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"),
  "\u062D": forms("\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"),
  "\u062E": forms("\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"),
  "\u062F": forms("\uFEA9", "\uFEAA"),
  "\u0630": forms("\uFEAB", "\uFEAC"),
  "\u0631": forms("\uFEAD", "\uFEAE"),
  "\u0632": forms("\uFEAF", "\uFEB0"),
  "\u0633": forms("\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"),
  "\u0634": forms("\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"),
  "\u0635": forms("\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"),
  "\u0636": forms("\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"),
  "\u0637": forms("\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"),
  "\u0638": forms("\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"),
  "\u0639": forms("\uFEC9", "\uFECA", "\uFECB", "\uFECC"),
  "\u063A": forms("\uFECD", "\uFECE", "\uFECF", "\uFED0"),
  "\u0641": forms("\uFED1", "\uFED2", "\uFED3", "\uFED4"),
  "\u0642": forms("\uFED5", "\uFED6", "\uFED7", "\uFED8"),
  "\u0643": forms("\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"),
  "\u0644": forms("\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"),
  "\u0645": forms("\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"),
  "\u0646": forms("\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"),
  "\u0647": forms("\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"),
  "\u0648": forms("\uFEED", "\uFEEE"),
  "\u0649": forms("\uFEEF", "\uFEF0"),
  "\u064A": forms("\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"),
}

const LAM_ALEF: Record<string, readonly [string, string]> = {
  "\u0622": ["\uFEF5", "\uFEF6"],
  "\u0623": ["\uFEF7", "\uFEF8"],
  "\u0625": ["\uFEF9", "\uFEFA"],
  "\u0627": ["\uFEFB", "\uFEFC"],
}

function joinsForward(char: string): boolean {
  const row = LETTERS[char]
  return Boolean(row && row[INITIAL] !== row[ISOLATED])
}

function joinsBackward(char: string): boolean {
  return Boolean(LETTERS[char])
}

function isMark(char: string): boolean {
  const code = char.codePointAt(0) || 0
  return (code >= 0x064b && code <= 0x0652) || code === 0x0670
}

function shapeLetters(run: string): string {
  const chars = Array.from(run).filter((char) => !isMark(char) && char !== "\u0640")
  const shaped: string[] = []
  for (let index = 0; index < chars.length; index++) {
    const current = chars[index]
    const next = chars[index + 1]
    const previousJoins = index > 0 && joinsForward(chars[index - 1])
    const ligature = current === "\u0644" ? LAM_ALEF[next] : undefined
    if (ligature) {
      shaped.push(previousJoins ? ligature[1] : ligature[0])
      index += 1
      continue
    }
    const row = LETTERS[current]
    if (!row) {
      shaped.push(current)
      continue
    }
    const nextJoins = Boolean(next && joinsBackward(next))
    let form: 0 | 1 | 2 | 3 = ISOLATED
    if (previousJoins && nextJoins && row[MEDIAL] !== row[FINAL]) form = MEDIAL
    else if (previousJoins) form = FINAL
    else if (nextJoins && row[INITIAL] !== row[ISOLATED]) form = INITIAL
    shaped.push(row[form])
  }
  return shaped.reverse().join("")
}

type Token = { kind: "arabic" | "number" | "other"; text: string }

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  for (const char of Array.from(input)) {
    const code = char.codePointAt(0) || 0
    const kind: Token["kind"] =
      (code >= 0x0621 && code <= 0x064a) || isMark(char) || char === "\u0640"
        ? "arabic"
        : (code >= 0x0030 && code <= 0x0039) || (code >= 0x0660 && code <= 0x0669)
          ? "number"
          : "other"
    const last = tokens[tokens.length - 1]
    if (last && last.kind === kind) last.text += char
    else tokens.push({ kind, text: char })
  }
  return tokens
}

function firstStrong(input: string): "ar" | "en" {
  for (const char of Array.from(input)) {
    const code = char.codePointAt(0) || 0
    if (code >= 0x0621 && code <= 0x064a) return "ar"
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return "en"
  }
  return "en"
}

/** Visual order, safe to draw left-to-right with a font that has presentation forms. */
export function shapeForPdf(input: string): string {
  const tokens = tokenize(input).map((token) => (token.kind === "arabic" ? shapeLetters(token.text) : token.text))
  if (firstStrong(input) === "ar") tokens.reverse()
  return tokens.join("")
}

export function lineIsRtl(input: string): boolean {
  return firstStrong(input) === "ar"
}
