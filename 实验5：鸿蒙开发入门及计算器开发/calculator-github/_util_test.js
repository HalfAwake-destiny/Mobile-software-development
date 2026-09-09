// 临时校验脚本：镜像 CalculateUtil.ets 的逻辑，验证解析器正确性（校验后删除）
const FUNC_SET = ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt']

function evaluate(source, radian = false) {
  const input = source.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/%/g, '/100')
  const tokens = tokenize(input)
  if (tokens.length === 0) throw new Error('empty')
  let pos = 0
  const mul = radian ? 1 : Math.PI / 180
  const peek = () => (pos < tokens.length ? tokens[pos] : '')
  const eat = (expect) => {
    const t = peek()
    if (t === '') throw new Error('eof')
    if (expect !== undefined && t !== expect) throw new Error('syntax')
    pos++
    return t
  }
  const parseAtom = () => {
    const t = peek()
    if (t === '') throw new Error('eof')
    if (t === '(') { eat('('); const v = parseExpr(); eat(')'); return v }
    if (FUNC_SET.indexOf(t) >= 0) { eat(); eat('('); const v = parseExpr(); eat(')'); return applyFunc(t, v, mul) }
    if (t === 'pi') { eat(); return Math.PI }
    if (t === 'e') { eat(); return Math.E }
    if (/^\d+(\.\d*)?$|^\.\d+$/.test(t)) {
      eat()
      const n = Number(t)
      if (isNaN(n)) throw new Error('number')
      return n
    }
    throw new Error('token:' + t)
  }
  const parsePower = () => {
    const base = parseAtom()
    if (peek() === '^') { eat('^'); return Math.pow(base, parseUnary()) }
    return base
  }
  const parseUnary = () => {
    if (peek() === '-') { eat('-'); return -parseUnary() }
    if (peek() === '+') { eat('+'); return parseUnary() }
    return parsePower()
  }
  const parseTerm = () => {
    let value = parseUnary()
    while (peek() === '*' || peek() === '/') {
      const op = eat()
      const rhs = parseUnary()
      if (op === '/' && rhs === 0) throw new Error('zero')
      value = op === '*' ? value * rhs : value / rhs
    }
    return value
  }
  const parseExpr = () => {
    let value = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = eat()
      const rhs = parseTerm()
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }
  const answer = parseExpr()
  if (pos !== tokens.length || !isFinite(answer)) throw new Error('tail')
  return answer
}

function applyFunc(name, v, mul) {
  switch (name) {
    case 'sin': return Math.sin(v * mul)
    case 'cos': return Math.cos(v * mul)
    case 'tan': return Math.tan(v * mul)
    case 'ln': return v > 0 ? Math.log(v) : NaN
    case 'log': return v > 0 ? Math.log10(v) : NaN
    case 'sqrt': return v >= 0 ? Math.sqrt(v) : NaN
    default: return NaN
  }
}

function tokenize(input) {
  const tokens = []
  let i = 0
  while (i < input.length) {
    const c = input[i]
    if (c === ' ') { i++; continue }
    const isDigit = (c >= '0' && c <= '9') || c === '.'
    const isLetter = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
    if (isDigit || isLetter) {
      let s = ''
      while (i < input.length) {
        const d = input[i]
        const isNum = (d >= '0' && d <= '9') || d === '.'
        const isChr = (d >= 'a' && d <= 'z') || (d >= 'A' && d <= 'Z')
        if (isDigit ? isNum : isChr) { s += d; i++ } else break
      }
      tokens.push(s)
      continue
    }
    if ('+-*/^()'.indexOf(c) >= 0) { tokens.push(c); i++; continue }
    throw new Error('char:' + c)
  }
  return tokens
}

function format(v) { return Math.abs(v) < 0.000000001 ? '0' : String(Number(v.toFixed(10))) }

const D = Math.PI / 180
const cases = [
  ['1+2×3', 7],
  ['(1+2)×3', 9],
  ['2+3×4−6÷3', 12],
  ['10%', 0.1],
  ['2^3^2', 512],
  ['-2^2', -4],
  ['2^-1', 0.5],
  ['sin(30)', Math.sin(30 * D)],
  ['cos(60)', Math.cos(60 * D)],
  ['sin(cos(30))', Math.sin(Math.cos(30 * D) * D)],
  ['sqrt(16)', 4],
  ['sqrt((3+4)×2)', Math.sqrt(14)],
  ['ln(e)', 1],
  ['log(100)', 2],
  ['5×pi', 5 * Math.PI],
  ['5×e', 5 * Math.E],
  ['((1+2))', 3],
  ['2×(3+4)×5', 70],
  ['sin(0)', 0],
  ['1+', null],
  ['1++2', null],
  ['(1+2', null],
  ['1/', null],
  ['1/0', null],
  ['sqrt(-1)', null],
  ['ln(0)', null],
  ['2..3', null]
]

let fail = 0
for (const [expr, expected] of cases) {
  let got = null
  let err = null
  try { got = format(evaluate(expr)) } catch (e) { err = e.message }
  const exp = expected === null ? null : format(expected)
  const ok = expected === null ? got === null : got === exp
  if (!ok) fail++
  console.log((ok ? 'PASS' : 'FAIL').padEnd(5), expr.padEnd(14),
    'got=' + (got === null ? 'ERR(' + err + ')' : got),
    expected !== null ? 'expect=' + exp : 'expect=ERR')
}
console.log(fail === 0 ? '\nALL PASS (' + cases.length + ')' : '\n' + fail + ' FAILED')
