// 标准 / 科学按键数据集
// 从 CommonConstants 中读取字符串列表，组装成 UI 可直接消费的模型

import { CommonConstants } from '../common/constants/CommonConstants'
import { PressKeysItem } from './PressKeysItem'

export class PresskeysViewModel {
  /** 4×5 基础键盘：'0' 跨两列，'=' 标记为等号 */
  static getBasicKeys(): PressKeysItem[] {
    return CommonConstants.KEYS_BASIC.map((label: string) =>
      new PressKeysItem(label, label === '0' ? 2 : 1, label === '=')
    )
  }

  /** 6×2 科学键盘 */
  static getScienceKeys(): PressKeysItem[] {
    return CommonConstants.KEYS_SCIENCE.map((label: string) =>
      new PressKeysItem(label, 1, false)
    )
  }
}