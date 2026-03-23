import { type ToolMode } from './toolbar'

export class ToolbarViewModel {
  mode = $state<ToolMode>('pan')

  setMode(m: ToolMode) {
    this.mode = m
  }
}
