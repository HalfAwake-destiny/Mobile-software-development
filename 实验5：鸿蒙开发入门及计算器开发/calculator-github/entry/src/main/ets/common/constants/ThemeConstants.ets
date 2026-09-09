// 玄青符算 · 主题色板
// 深色 = 玄青霓虹（夜间终端）
// 浅色 = 月白青瓷（同色系高亮版，保证对比度可读）

export interface ThemePalette {
  bg: string          // 页面底色
  card: string        // 显示卡片
  cardHist: string    // 历史卡片
  neon: string        // 主强调（青色霓虹）
  crimson: string     // 运算符（朱砂红）
  gold: string        // 等号与结算（鎏金）
  text: string        // 主文字
  textDim: string     // 次级文字
  textMute: string    // 弱化文字
  textHint: string    // 提示文字
  butText: string     // 按键文字
  equalsText: string  // 等号文字
  border: string      // 卡片描边
  borderHist: string  // 历史描边
  chipBg: string      // 芯片（DEG/RAD、主题）底色
  butKey: string      // 功能键底色
  butOpActive: string // 运算符激活态底色
  butSci: string      // 科学键底色
  butNum: string      // 数字键底色
  histRowBg: string   // 历史条目底色
  progressBg: string  // 灵力进度槽
  rune: string        // 符文装饰（主）
  runeAlt: string     // 符文装饰（次）
  shadow: string      // 卡片投影
}

export const THEME_DARK: ThemePalette = {
  bg: '#07151D',
  card: '#112A33',
  cardHist: '#0D212A',
  neon: '#62E8D4',
  crimson: '#9E3C49',
  gold: '#D5AE64',
  text: '#F1F5F2',
  textDim: '#A7C8C8',
  textMute: '#619196',
  textHint: '#719A9D',
  butText: '#F1F5F2',
  equalsText: '#18262A',
  border: '#326D73',
  borderHist: '#224A52',
  chipBg: '#0F3A42',
  butKey: '#2A5B63',
  butOpActive: '#C4525F',
  butSci: '#1D4650',
  butNum: '#142A34',
  histRowBg: '#13323B',
  progressBg: '#0B2029',
  rune: '#123B45',
  runeAlt: '#163E47',
  shadow: '#05171D',
}

export const THEME_LIGHT: ThemePalette = {
  bg: '#EDF3F3',
  card: '#FFFFFF',
  cardHist: '#E3EDEC',
  neon: '#0E7C6B',
  crimson: '#A33B48',
  gold: '#B4852C',
  text: '#0F262C',
  textDim: '#3C5B62',
  textMute: '#6C8D93',
  textHint: '#7A989E',
  butText: '#0F262C',
  equalsText: '#FFFFFF',
  border: '#9FC9C4',
  borderHist: '#B7D2CE',
  chipBg: '#D6EBE7',
  butKey: '#A8CBD1',
  butOpActive: '#C04552',
  butSci: '#C3DEE1',
  butNum: '#FFFFFF',
  histRowBg: '#D8E9E8',
  progressBg: '#D3E5E4',
  rune: '#BFD9D9',
  runeAlt: '#CFE4E4',
  shadow: '#9DB6B8',
}