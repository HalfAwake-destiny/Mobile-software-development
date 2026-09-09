// 玄青符算 · QingCalc 全局常量
// 按键数据集、状态文案、业务阈值（颜色已迁移至 ThemeConstants）

export class CommonConstants {
  // —— 按键数据集 ——
  static readonly KEYS_BASIC: string[] = [
    'AC', '⌫', '%', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '−',
    '1', '2', '3', '+',
    '0', '.', '='
  ]
  static readonly KEYS_SCIENCE: string[] = [
    'sin', 'cos', 'tan',
    'ln', 'log', '√',
    'x²', 'xʸ', 'π',
    'e', '(', ')'
  ]

  // —— 状态文案（与方案第八节一致）——
  static readonly STATUS_IDLE: string = '灵力稳定'
  static readonly STATUS_INPUT: string = '术式输入中'
  static readonly STATUS_DONE: string = '符阵已闭合'
  static readonly STATUS_ERR: string = '术式失效'

  // —— 业务阈值 ——
  static readonly HISTORY_MAX: number = 5   // 历史记录上限
  static readonly MANA_FULL: number = 24    // 灵力满格所需的术式长度
}