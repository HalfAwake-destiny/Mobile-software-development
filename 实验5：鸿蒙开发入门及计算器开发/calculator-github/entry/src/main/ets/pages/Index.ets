import { CalculateUtil } from '../common/util/CalculateUtil'

@Entry
@Component
struct Index {
  @State @Watch('onInputChange') expression: string = ''
  @State result: string = '0'
  @State preview: string = ''
  @State history: string[] = []
  @State scientific: boolean = false
  @State radian: boolean = false
  @State darkMode: boolean = true
  @State evaluated: boolean = false
  @State activeOperator: string = ''
  @State pressedKey: string = ''
  @State runeAngle: number = 0
  @State resultScale: number = 1
  @State expressionOffsetY: number = 0
  @State expressionOpacity: number = 1
  @State hexagram: string = ''
  @State status: string = '灵力稳定'
  @State showHistory: boolean = false

  private lastOperator: string = ''
  private lastOperand: string = ''
  private historyPressTimer: number = -1
  private readonly maxInputLength: number = 48
  private readonly hexagramNames: string[] = ['乾为天','坤为地','水雷屯','山水蒙','水天需','天水讼','地水师','水地比','风天小畜','天泽履','地天泰','天地否','天火同人','火天大有','地山谦','雷地豫','泽雷随','山风蛊','地泽临','风地观','火雷噬嗑','山火贲','山地剥','地雷复','天雷无妄','山天大畜','山雷颐','泽风大过','坎为水','离为火','泽山咸','雷风恒','天山遁','雷天大壮','火地晋','地火明夷','风火家人','火泽睽','水山蹇','雷水解','山泽损','风雷益','泽天夬','天风姤','泽地萃','地风升','泽水困','水风井','泽火革','火风鼎','震为雷','艮为山','风山渐','雷泽归妹','雷火丰','火山旅','巽为风','兑为泽','风水涣','水泽节','风泽中孚','雷山小过','水火既济','火水未济']
  private readonly basicKeys: string[] = ['AC', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '=']
  private readonly scienceKeys: string[] = ['sin', 'cos', 'tan', 'ln', 'log', '√', 'x²', 'xʸ', 'π', 'e', '(', ')']

  bg(): string { return this.darkMode ? '#07151D' : '#EDF3F3' }
  card(): string { return this.darkMode ? '#D9112A33' : '#F2FFFFFF' }
  text(): string { return this.darkMode ? '#F1F5F2' : '#0F262C' }
  textDim(): string { return this.darkMode ? '#A7C8C8' : '#3C5B62' }
  mute(): string { return this.darkMode ? '#719A9D' : '#6C8D93' }
  neon(): string { return this.darkMode ? '#62E8D4' : '#0E7C6B' }
  gold(): string { return this.darkMode ? '#D5AE64' : '#B4852C' }
  crimson(): string { return this.darkMode ? '#9E3C49' : '#A33B48' }
  edgeTone(): string { return this.darkMode ? '#326D73' : '#9FC9C4' }

  onInputChange(): void {
    if (this.expression.length === 0) {
      this.preview = ''
      this.status = '灵力稳定'
      return
    }
    this.status = this.expression.length >= this.maxInputLength ? '灵力已充盈' : '术式输入中'
    this.updatePreview()
  }

  updatePreview(): void {
    if (!CalculateUtil.isCompletable(this.expression)) { this.preview = ''; return }
    try {
      const completed: string = CalculateUtil.completeForEvaluation(this.expression)
      this.preview = '= ' + CalculateUtil.format(CalculateUtil.evaluate(completed, this.radian))
    } catch (error) { this.preview = '' }
  }

  isOperator(key: string): boolean { return ['+', '−', '×', '÷'].indexOf(key) >= 0 }
  isValueTail(value: string): boolean {
    if (value.length === 0) return false
    const tail: string = value[value.length - 1]
    return (tail >= '0' && tail <= '9') || tail === ')' || tail === '%' || value.endsWith('pi') || tail === 'e'
  }
  needsImplicitMultiply(): boolean { return this.isValueTail(this.expression) }

  canAppend(length: number): boolean {
    if (this.expression.length + length <= this.maxInputLength) return true
    this.status = '灵力已充盈'
    return false
  }

  energyValue(): number { return Math.min(this.expression.length, this.maxInputLength) }

  castHexagram(answer: string): void {
    const value: number = Number(answer)
    if (!isFinite(value)) { this.hexagram = ''; return }
    const index: number = Math.round(Math.abs(value) * 1000) % 64
    this.hexagram = String.fromCodePoint(0x4DC0 + index) + '  第' + String(index + 1) + '卦 · ' + this.hexagramNames[index]
  }

  openParenCount(): number {
    let count: number = 0
    for (let i: number = 0; i < this.expression.length; i++) {
      if (this.expression[i] === '(') count++
      else if (this.expression[i] === ')') count--
    }
    return count
  }

  displayExpression(): string {
    return this.expression.length > 0 ? this.expression.replace(/pi/g, 'π') : ''
  }

  previewValue(): string {
    return this.preview.startsWith('= ') ? this.preview.slice(2) : this.preview
  }

  historyExpression(item: string): string {
    return (item.split(' = ')[0] || '').replace(/pi/g, 'π')
  }

  historyResult(item: string): string {
    return '= ' + (item.split(' = ')[1] || '')
  }

  // 字号自适应：内容越长字号越小，尽量完整显示而不出现省略号
  // fitLen = 在 base 字号下刚好能完整容纳的字符数；算出的值低于 min 则取 min
  fitSize(text: string, base: number, min: number, fitLen: number): number {
    const len: number = text.length
    if (len <= fitLen) {
      return base
    }
    const size: number = Math.floor(base * fitLen / len)
    return size < min ? min : size
  }

  displayTouch(event: TouchEvent): void {
    if (event.type === TouchType.Down) {
      this.historyPressTimer = setTimeout(() => {
        this.showHistory = !this.showHistory
        this.historyPressTimer = -1
      }, 450)
    } else if (event.type === TouchType.Up || event.type === TouchType.Cancel) {
      if (this.historyPressTimer >= 0) {
        clearTimeout(this.historyPressTimer)
        this.historyPressTimer = -1
      }
    }
  }

  currentOperand(): string {
    if (this.evaluated) return this.result
    let source: string = this.expression
    while (source.length > 0 && this.isOperator(source[source.length - 1])) {
      source = source.slice(0, -1)
    }
    let start: number = source.length - 1
    while (start >= 0 && !this.isOperator(source[start]) && source[start] !== '(') start--
    const value: string = source.slice(start + 1).replace(/pi/g, 'π')
    return value.length > 0 ? value : '0'
  }

  pressDown(key: string): void { this.pressedKey = key }
  pressUp(key: string): void {
    if (this.pressedKey === key) this.pressedKey = ''
  }

  appendValue(value: string): void {
    if (this.evaluated || this.status === '术式失效') {
      this.expression = ''
      this.result = '0'
      this.evaluated = false
    }
    const needsMultiply: boolean = this.needsImplicitMultiply() &&
      (value === '(' || value === 'pi' || value === 'e' || value.endsWith('('))
    const addition: string = (needsMultiply ? '×' : '') + value
    if (!this.canAppend(addition.length)) return
    this.expression += addition
    this.activeOperator = ''
  }

  appendDigit(key: string): void {
    if (this.evaluated || this.status === '术式失效') {
      this.expression = ''
      this.result = '0'
      this.evaluated = false
    }
    const needsMultiply: boolean = this.expression.endsWith(')') || this.expression.endsWith('%') ||
      this.expression.endsWith('pi') || this.expression.endsWith('e')
    if (!needsMultiply) {
      let start: number = this.expression.length - 1
      while (start >= 0 && ((this.expression[start] >= '0' && this.expression[start] <= '9') || this.expression[start] === '.')) start--
      const segment: string = this.expression.slice(start + 1)
      if (segment === '0') {
        if (key === '0') return
        this.expression = this.expression.slice(0, -1) + key
        this.activeOperator = ''
        return
      }
    }
    const addition: string = (needsMultiply ? '×' : '') + key
    if (!this.canAppend(addition.length)) return
    this.expression += addition
    this.activeOperator = ''
  }

  appendDecimal(): void {
    if (this.evaluated || this.status === '术式失效') { this.expression = ''; this.result = '0'; this.evaluated = false }
    let i: number = this.expression.length - 1
    while (i >= 0 && ((this.expression[i] >= '0' && this.expression[i] <= '9') || this.expression[i] === '.')) i--
    const segment: string = this.expression.slice(i + 1)
    if (segment.indexOf('.') >= 0) return
    const needsMultiply: boolean = this.isValueTail(this.expression) && segment.length === 0
    const addition: string = (needsMultiply ? '×' : '') + (segment.length === 0 ? '0' : '') + '.'
    if (!this.canAppend(addition.length)) return
    this.expression += addition
    this.activeOperator = ''
  }

  appendOperator(key: string): void {
    if (this.status === '术式失效') return
    if (this.evaluated) {
      this.expression = this.result
      this.evaluated = false
    }
    if (this.expression.length === 0) {
      if (key === '−' || key === '+') this.expression = key
      return
    }
    const tail: string = this.expression[this.expression.length - 1]
    if (tail === '(') {
      if ((key === '−' || key === '+') && this.canAppend(1)) this.expression += key
      this.activeOperator = key === '−' || key === '+' ? key : ''
      return
    }
    if (this.isOperator(tail)) this.expression = this.expression.slice(0, -1) + key
    else if (tail !== '(' && tail !== '.' && this.canAppend(1)) this.expression += key
    this.activeOperator = key
  }

  deleteUnit(): void {
    if (this.expression.length === 0) return
    const units: string[] = ['sqrt(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'pi']
    for (let i: number = 0; i < units.length; i++) {
      if (this.expression.endsWith(units[i])) {
        this.expression = this.expression.slice(0, -units[i].length)
        this.activeOperator = ''
        return
      }
    }
    this.expression = this.expression.slice(0, -1)
    this.activeOperator = ''
  }

  clearAll(): void {
    this.expression = ''; this.result = '0'; this.preview = ''; this.evaluated = false
    this.activeOperator = ''; this.lastOperator = ''; this.lastOperand = ''; this.status = '灵力稳定'; this.hexagram = ''
  }

  captureRepeat(expression: string): void {
    let depth: number = 0
    let position: number = -1
    for (let i: number = 0; i < expression.length; i++) {
      const c: string = expression[i]
      if (c === '(') depth++
      else if (c === ')') depth--
      else if (depth === 0 && this.isOperator(c) && i > 0) position = i
    }
    if (position >= 0) {
      this.lastOperator = expression[position]
      this.lastOperand = expression.slice(position + 1)
    } else {
      this.lastOperator = ''
      this.lastOperand = ''
    }
  }

  playResultAnimation(): void {
    this.runeAngle += 180
    this.resultScale = 0.72
    this.expressionOffsetY = 8
    this.expressionOpacity = 0.35
    setTimeout(() => {
      this.getUIContext().animateTo({ duration: 180, curve: Curve.EaseOut }, () => {
        this.resultScale = 1.08
        this.expressionOffsetY = 0
        this.expressionOpacity = 1
      })
    }, 20)
    setTimeout(() => {
      this.getUIContext().animateTo({ duration: 110, curve: Curve.EaseOut }, () => {
        this.resultScale = 1
      })
    }, 210)
  }

  calculate(): void {
    if (this.evaluated && this.lastOperator.length > 0 && this.lastOperand.length > 0) {
      this.expression = this.result + this.lastOperator + this.lastOperand
    }
    if (!CalculateUtil.isCompletable(this.expression)) { this.status = '术式未完成'; return }
    const completed: string = CalculateUtil.completeForEvaluation(this.expression)
    try {
      const answer: string = CalculateUtil.format(CalculateUtil.evaluate(completed, this.radian))
      if (!this.evaluated) this.captureRepeat(completed)
      this.expression = completed
      this.result = answer
      this.castHexagram(answer)
      const entry: string = completed + ' = ' + answer
      if (this.history.length === 0 || this.history[0] !== entry) this.history = [entry].concat(this.history).slice(0, 5)
      this.evaluated = true
      this.activeOperator = ''
      this.status = '符阵已闭合'
      this.playResultAnimation()
    } catch (error) {
      this.result = 'ERR'; this.status = '术式失效'; this.activeOperator = ''
    }
  }

  handleKey(key: string): void {
    if (key === 'AC') { this.clearAll(); return }
    if (key === '⌫') { this.deleteUnit(); return }
    if (key === '=') { this.calculate(); return }
    if (this.isOperator(key)) { this.appendOperator(key); return }
    if (key === '.') { this.appendDecimal(); return }
    if (key >= '0' && key <= '9') { this.appendDigit(key); return }
    if (key === '%') { if (this.isValueTail(this.expression) && !this.expression.endsWith('%') && this.canAppend(1)) this.expression += '%'; return }
    if (key === '√') { this.appendValue('sqrt('); return }
    if (key === 'x²') { if (this.isValueTail(this.expression) && this.canAppend(2)) this.expression += '^2'; return }
    if (key === 'xʸ') { if (this.isValueTail(this.expression) && this.canAppend(1)) this.expression += '^'; return }
    if (key === 'π') { this.appendValue('pi'); return }
    if (key === 'e') { this.appendValue('e'); return }
    if (key === '(') { this.appendValue('('); return }
    if (key === ')') {
      if (this.openParenCount() > 0 && this.isValueTail(this.expression) && this.canAppend(1)) this.expression += ')'
      return
    }
    this.appendValue(key + '(')
  }

  buttonColor(key: string): string {
    if (key === '=') return this.gold()
    if (this.isOperator(key)) return this.activeOperator === key ? this.neon() : this.crimson()
    if (['AC', '⌫', '%'].indexOf(key) >= 0) return this.darkMode ? '#2A5B63' : '#A8CBD1'
    if (this.scienceKeys.indexOf(key) >= 0) return this.darkMode ? '#1D4650' : '#C3DEE1'
    return this.darkMode ? '#D9142A34' : '#F2FFFFFF'
  }

  @Builder keyButton(key: string, scienceKey: boolean) {
    Button(key)
      .fontSize(key === '=' ? 27 : (scienceKey ? 14 : 20))
      .fontColor(key === '=' || this.activeOperator === key ? '#17262A' : this.text())
      .backgroundColor(this.buttonColor(key)).borderRadius(scienceKey ? 13 : 18)
      .border({ width: this.pressedKey === key ? 2 : (this.activeOperator === key ? 1.5 : 0), color: this.pressedKey === key ? this.gold() : this.neon() })
      .padding(0).width('100%').height('100%')
      .scale({ x: this.pressedKey === key ? 0.90 : 1, y: this.pressedKey === key ? 0.90 : 1 })
      .translate({ y: this.pressedKey === key ? 3 : 0 })
      .opacity(this.pressedKey === key ? 0.90 : 1)
      .shadow({ radius: this.pressedKey === key ? 18 : 4, color: this.pressedKey === key ? this.neon() : '#33000000', offsetX: 0, offsetY: this.pressedKey === key ? 0 : 3 })
      .animation({ duration: this.pressedKey === key ? 70 : 190, curve: this.pressedKey === key ? Curve.EaseIn : Curve.EaseOut })
      .onTouch((event: TouchEvent) => {
        if (event.type === TouchType.Down) this.pressDown(key)
        else if (event.type === TouchType.Up || event.type === TouchType.Cancel) this.pressUp(key)
      })
      .onClick(() => this.handleKey(key))
  }

  @Builder displayCard() {
    Stack() {
      Image($r('app.media.rune_core')).width(230).height(230).opacity(this.darkMode ? 0.32 : 0.10)
        .rotate({ angle: this.runeAngle }).animation({ duration: 720, curve: Curve.EaseOut })
      Column() {
        Text(this.displayExpression())
          .fontSize(this.evaluated
            ? this.fitSize(this.displayExpression(), 16, 9, 30)
            : this.fitSize(this.displayExpression(), 46, 12, 11))
          .fontWeight(this.evaluated ? FontWeight.Normal : FontWeight.Bold)
          .fontColor(this.evaluated ? this.textDim() : this.text()).width('100%').textAlign(TextAlign.End)
          .height(58).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
          .opacity(this.expression.length > 0 ? this.expressionOpacity : 0.35).translate({ y: this.expressionOffsetY })
        if (this.evaluated) {
          Row() {
            Text('=').fontSize(30).fontWeight(FontWeight.Bold).fontColor(this.gold()).margin({ right: 8 })
            Text(this.result).fontSize(this.fitSize(this.result, 50, 16, 9)).fontWeight(FontWeight.Bold).fontColor(this.neon())
              .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
          }.width('100%').height(58).justifyContent(FlexAlign.End).margin({ top: 2 })
            .scale({ x: this.resultScale, y: this.resultScale })
        } else {
          Row() {
            Text('=').fontSize(22).fontWeight(FontWeight.Medium).fontColor(this.gold()).margin({ right: 7 })
            Text(this.previewValue()).fontSize(this.fitSize(this.previewValue(), 25, 12, 18)).fontColor(this.neon()).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
          }.width('100%').height(58).justifyContent(FlexAlign.End).margin({ top: 2 }).opacity(this.preview.length > 0 ? 1 : 0)
        }
        if (this.evaluated && this.hexagram.length > 0) {
          Row() {
            Text('卦象').fontSize(11).fontColor(this.gold()).margin({ right: 8 })
            Text(this.hexagram).fontSize(this.fitSize(this.hexagram, 12, 9, 22)).fontColor(this.neon()).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
          }.width('100%').height(21).justifyContent(FlexAlign.End).margin({ top: 2 })
        }
        Row() {
          Text('灵力').fontSize(10).fontColor(this.gold())
          Blank()
          Text(String(this.energyValue()) + ' / ' + String(this.maxInputLength)).fontSize(10)
            .fontColor(this.expression.length >= this.maxInputLength ? this.crimson() : this.mute())
        }.width('100%').height(16)
        Progress({ value: this.energyValue(), total: this.maxInputLength, type: ProgressType.Linear })
          .width('100%').height(5).color(this.expression.length >= this.maxInputLength ? this.crimson() : this.neon())
          .backgroundColor(this.darkMode ? '#3A28444A' : '#304B7479').borderRadius(3)
        Row() {
          Text(this.radian ? 'RAD' : 'DEG').fontSize(10).fontColor(this.neon())
          Blank()
          Text('记录 ' + String(this.history.length)).fontSize(10).fontColor(this.mute())
        }.width('100%').margin({ top: 5 })
      }.width('100%').padding(16).backgroundColor(this.card()).borderRadius(22)
    }.width('calc(100% - 24vp)').height(208).margin({ left: 12, right: 12, bottom: 10 })
      .borderRadius(22).border({ width: 1, color: this.status === '术式失效' ? this.crimson() : this.edgeTone() })
      .shadow({ radius: 18, color: this.darkMode ? '#05171D' : '#9DB6B8', offsetX: 0, offsetY: 7 })
      .onTouch((event: TouchEvent) => { this.displayTouch(event) })
  }

  @Builder historyDropdown() {
    Column() {
      Row() {
        Text('最近计算').fontSize(15).fontWeight(FontWeight.Bold).fontColor(this.text())
        Blank()
        Button('清除').fontSize(11).fontColor(this.crimson()).backgroundColor(Color.Transparent).height(28).padding({ left: 9, right: 9 }).onClick(() => { this.history = [] })
        Button('×').fontSize(20).fontColor(this.textDim()).backgroundColor(Color.Transparent).width(30).height(28).padding(0).onClick(() => { this.showHistory = false })
      }.width('100%').height(32).margin({ bottom: 7 })
      Scroll() {
        Column() {
          if (this.history.length === 0) {
            Column() {
              Text('暂无记录').fontSize(15).fontWeight(FontWeight.Medium).fontColor(this.textDim())
              Text('完成计算后将在此显示').fontSize(11).fontColor(this.mute()).margin({ top: 5 })
            }.width('100%').height(110).justifyContent(FlexAlign.Center)
          }
          ForEach(this.history, (item: string, index: number) => {
            Row() {
              Column() {
                Text(this.historyExpression(item)).fontSize(this.fitSize(this.historyExpression(item), 12, 8, 42)).fontColor(this.mute()).width('100%').textAlign(TextAlign.End).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
                Text(this.historyResult(item)).fontSize(this.fitSize(this.historyResult(item), 20, 12, 22)).fontWeight(FontWeight.Medium).fontColor(this.gold()).width('100%').textAlign(TextAlign.End).margin({ top: 2 })
              }.layoutWeight(1).alignItems(HorizontalAlign.End)
            }.width('100%').padding({ left: 10, right: 10, top: 8, bottom: 8 }).borderRadius(8)
              .border({ width: { bottom: 1 }, color: this.darkMode ? '#3349686A' : '#B9D4D1' })
              .onClick(() => { this.expression = item.split(' = ')[0] || ''; this.evaluated = false; this.showHistory = false })
          }, (item: string, index: number) => String(index) + item)
        }.width('100%')
      }.layoutWeight(1).width('100%')
    }.padding({ left: 14, right: 14, top: 10, bottom: 10 }).width('calc(100% - 24vp)').height(265)
      .backgroundColor(this.darkMode ? '#F20B1C24' : '#FAF7FAFA').borderRadius(14)
      .border({ width: 1, color: this.edgeTone() }).shadow({ radius: 22, color: '#66000000', offsetX: 0, offsetY: 8 })
  }

  build() {
    Stack() {
      Image($r('app.media.qingcalc_bg')).width('100%').height('100%').objectFit(ImageFit.Cover).opacity(this.darkMode ? 0.75 : 0.10)
      Image($r('app.media.corner_ornament')).width('100%').height(210).align(Alignment.Bottom).objectFit(ImageFit.Cover).opacity(this.darkMode ? 0.38 : 0.08)
      Image($r('app.media.qingcalc_mascot')).width(142).height(213).align(Alignment.TopEnd).objectFit(ImageFit.Cover).opacity(this.darkMode ? 0.38 : 0.08)
      Column() {
        Row() {
          Image($r('app.media.app_icon')).width(36).height(36).borderRadius(9).margin({ right: 9 })
          Column() { Text('玄青符算').fontSize(23).fontWeight(FontWeight.Bold).fontColor(this.text()); Text('QINGCALC · RUNE TERMINAL').fontSize(9).fontColor(this.neon()).letterSpacing(1.1) }.alignItems(HorizontalAlign.Start)
          Blank()
          Row() {
            Text('●').fontSize(16).fontColor(this.status === '术式失效' ? this.crimson() : (this.status === '符阵已闭合' ? this.gold() : this.neon())).margin({ right: 6 })
            Column() { Text(this.status === '术式失效' ? 'ERROR' : 'ONLINE').fontSize(10).fontWeight(FontWeight.Bold).fontColor(this.text()); Text(this.status).fontSize(10).fontColor(this.status === '术式失效' ? this.crimson() : this.gold()) }.alignItems(HorizontalAlign.End)
          }.padding({ left: 10, right: 10, top: 5, bottom: 5 }).backgroundColor(this.darkMode ? '#D9112A22' : '#EAF5F2').border({ width: 1, color: this.status === '术式失效' ? this.crimson() : this.edgeTone() }).borderRadius(16)
        }.width('100%').padding({ left: 18, right: 18, top: 18, bottom: 8 })
        Row() {
          Button() { Row() { Image(this.scientific ? $r('app.media.mode_scientific') : $r('app.media.mode_standard')).width(22).height(22).margin({ right: 6 }); Text(this.scientific ? '科学' : '标准').fontSize(12).fontColor(this.text()) } }.height(34).padding({ left: 9, right: 11 }).backgroundColor(this.card()).borderRadius(17).onClick(() => { this.scientific = !this.scientific })
          Button(this.radian ? 'RAD' : 'DEG').height(34).fontSize(11).fontColor(this.neon()).backgroundColor(this.card()).borderRadius(17).margin({ left: 8 }).onClick(() => { this.radian = !this.radian; this.updatePreview() })
          Blank()
          Button(this.darkMode ? '☀  浅色' : '☾  深色').height(34).fontSize(11).fontColor(this.text()).backgroundColor(this.card()).borderRadius(17).onClick(() => { this.darkMode = !this.darkMode })
        }.width('100%').padding({ left: 18, right: 18, bottom: 10 })
        Stack() {
          this.displayCard()
          if (this.showHistory) {
            Stack() { this.historyDropdown() }.position({ x: 12, y: 178 }).zIndex(20)
          }
        }.width('100%').height(208).zIndex(20)
        if (this.scientific) {
          Grid() { ForEach(this.scienceKeys, (key: string) => { GridItem() { this.keyButton(key, true) } }, (key: string) => key) }
            .columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr').rowsTemplate('1fr 1fr').columnsGap(7).rowsGap(7)
            .width('calc(100% - 24vp)').height(94).margin({ left: 12, right: 12, bottom: 8 })
        }
        Grid() {
          ForEach(this.basicKeys, (key: string) => {
            if (key === '0') GridItem() { this.keyButton(key, false) }.columnStart(0).columnEnd(1)
            else GridItem() { this.keyButton(key, false) }
          }, (key: string) => key)
        }.columnsTemplate('1fr 1fr 1fr 1fr').rowsTemplate('1fr 1fr 1fr 1fr 1fr').columnsGap(9).rowsGap(9)
          .width('calc(100% - 24vp)').margin({ left: 12, right: 12, bottom: 12 }).layoutWeight(1)
        Row() { Blank(); Text('东方幻想 UI · v3.0').fontSize(9).fontColor(this.mute()) }.width('100%').padding({ left: 20, right: 20, bottom: 12 })
      }.width('100%').height('100%')
    }.width('100%').height('100%').backgroundColor(this.bg())
  }
}
