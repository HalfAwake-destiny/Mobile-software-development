// 按键条目数据模型
// 用于解耦"显示文案 / 占位宽度 / 是否等号"与渲染层

export class PressKeysItem {
  label: string
  span: number      // 占几格（用于 '0' 跨两列）
  isEquals: boolean // 是否 "="，决定字号与字色

  constructor(label: string, span: number = 1, isEquals: boolean = false) {
    this.label = label
    this.span = span
    this.isEquals = isEquals
  }
}