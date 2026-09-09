// 表达式词法分析 + 递归下降求值
// 支持：+ - * / ^ %  括号  一元正负号
//       常量 pi / e
//       函数 sin cos tan ln log sqrt（支持任意层嵌套括号）
//       三角函数按角度 / 弧度切换

const FUNC_SET: string[] = ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt']

export class CalculateUtil {
  /** 按系统计算器习惯补齐末尾缺失的右括号。末尾不完整时返回原串。 */
  static completeForEvaluation(source: string): string {
    if (source.length === 0) return source
    const tail: string = source[source.length - 1]
    if ('+−×÷^.'.indexOf(tail) >= 0 || source.endsWith('(')) return source
    let open: number = 0
    for (let i: number = 0; i < source.length; i++) {
      if (source[i] === '(') open++
      if (source[i] === ')') open--
      if (open < 0) return source
    }
    return source + ')'.repeat(open)
  }

  static isCompletable(source: string): boolean {
    if (source.length === 0) return false
    const tail: string = source[source.length - 1]
    return '+−×÷^.'.indexOf(tail) < 0 && !source.endsWith('(')
  }

  /**
   * 计算表达式
   * @param source 原始表达式，使用显示运算符 × ÷ −
   * @param radian 三角函数是否使用弧度；false 时按角度制
   */
  static evaluate(source: string, radian: boolean = false): number {
    // 1. 显示符号归一化为 ASCII
    const input: string = source
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'pi')

    // 2. 词法分析
    const tokens: string[] = CalculateUtil.tokenize(input)
    if (tokens.length === 0) {
      throw new Error('empty')
    }

    let pos: number = 0
    const mul: number = radian ? 1 : Math.PI / 180

    const peek = (): string => (pos < tokens.length ? tokens[pos] : '')
    const eat = (expect?: string): string => {
      const t: string = peek()
      if (t === '') {
        throw new Error('eof')
      }
      if (expect !== undefined && t !== expect) {
        throw new Error('syntax')
      }
      pos++
      return t
    }

    // 原子：数字 / 常量 / 函数（可嵌套）/ 括号子表达式
    const parseAtom = (): number => {
      const t: string = peek()
      if (t === '') {
        throw new Error('eof')
      }
      if (t === '(') {
        eat('(')
        const v: number = parseExpr()
        eat(')')
        return v
      }
      if (FUNC_SET.indexOf(t) >= 0) {
        eat()
        eat('(')
        const v: number = parseExpr()
        eat(')')
        return CalculateUtil.applyFunc(t, v, mul)
      }
      if (t === 'pi') {
        eat()
        return Math.PI
      }
      if (t === 'e') {
        eat()
        return Math.E
      }
      if (/^\d+(\.\d*)?$|^\.\d+$/.test(t)) {
        eat()
        const n: number = Number(t)
        if (isNaN(n)) {
          throw new Error('number')
        }
        return n
      }
      throw new Error('token:' + t)
    }

    // 百分号为后缀运算符；乘除按普通百分比处理。
    const parsePostfix = (): number => {
      let value: number = parseAtom()
      while (peek() === '%') {
        eat('%')
        value /= 100
      }
      return value
    }

    // 幂：右结合，指数允许带一元符号（2^-1）
    const parsePower = (): number => {
      const base: number = parsePostfix()
      if (peek() === '^') {
        eat('^')
        return Math.pow(base, parseUnary())
      }
      return base
    }

    // 一元符号：优先级低于幂，因此 -2^2 = -4
    const parseUnary = (): number => {
      if (peek() === '-') {
        eat('-')
        return -parseUnary()
      }
      if (peek() === '+') {
        eat('+')
        return parseUnary()
      }
      return parsePower()
    }

    const parseTerm = (): number => {
      let value: number = parseUnary()
      while (peek() === '*' || peek() === '/') {
        const op: string = eat()
        const rhs: number = parseUnary()
        if (op === '/' && rhs === 0) {
          throw new Error('zero')
        }
        value = op === '*' ? value * rhs : value / rhs
      }
      return value
    }

    const parseExpr = (): number => {
      let value: number = parseTerm()
      while (peek() === '+' || peek() === '-') {
        const op: string = eat()
        const rhsStart: number = pos
        const rhs: number = parseTerm()
        // 加减后的百分数以上一个累计值为基数：200 + 10% = 220。
        const rhsWasPercent: boolean = pos > rhsStart && tokens[pos - 1] === '%'
        const adjusted: number = rhsWasPercent ? value * rhs : rhs
        value = op === '+' ? value + adjusted : value - adjusted
      }
      return value
    }

    const answer: number = parseExpr()
    if (pos !== tokens.length || !isFinite(answer)) {
      throw new Error('tail')
    }
    return answer
  }

  /** 一元函数求值；参数非法时返回 NaN，由 isFinite 校验转为“术式失效” */
  private static applyFunc(name: string, v: number, mul: number): number {
    switch (name) {
      case 'sin':
        return Math.sin(v * mul)
      case 'cos':
        return Math.cos(v * mul)
      case 'tan':
        if (Math.abs(Math.cos(v * mul)) < 0.0000000001) return Number.NaN
        return Math.tan(v * mul)
      case 'ln':
        return v > 0 ? Math.log(v) : Number.NaN
      case 'log':
        return v > 0 ? Math.log10(v) : Number.NaN
      case 'sqrt':
        return v >= 0 ? Math.sqrt(v) : Number.NaN
      default:
        return Number.NaN
    }
  }

  /** 词法：数字（含小数）、标识符（函数名/常量）、运算符、括号 */
  private static tokenize(input: string): string[] {
    const tokens: string[] = []
    let i: number = 0
    while (i < input.length) {
      const c: string = input[i]
      if (c === ' ') {
        i++
        continue
      }
      const isDigit: boolean = (c >= '0' && c <= '9') || c === '.'
      const isLetter: boolean = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
      if (isDigit || isLetter) {
        let s: string = ''
        while (i < input.length) {
          const d: string = input[i]
          const isNum: boolean = (d >= '0' && d <= '9') || d === '.'
          const isChr: boolean = (d >= 'a' && d <= 'z') || (d >= 'A' && d <= 'Z')
          if (isDigit ? isNum : isChr) {
            s += d
            i++
          } else {
            break
          }
        }
        tokens.push(s)
        continue
      }
      if ('+-*/^()%'.indexOf(c) >= 0) {
        tokens.push(c)
        i++
        continue
      }
      throw new Error('char:' + c)
    }
    return tokens
  }

  /** 格式化数字：去掉无意义的尾零与浮点误差 */
  static format(value: number): string {
    if (Math.abs(value) < 0.000000000001) {
      return '0'
    }
    const abs: number = Math.abs(value)
    if (abs >= 1000000000000 || abs < 0.000000001) {
      return value.toExponential(8).replace(/\.0+e/, 'e').replace(/(\.\d*?)0+e/, '$1e')
    }
    return String(Number(value.toPrecision(12)))
  }
}
