import type { App } from 'vue'
import vLazy from './lazy'
import type { LazyOptions } from './lazy'

const install = (app: App): void => {
  app.directive('lazy', vLazy)
}

export { vLazy, install }
export type { LazyOptions }
export default { install }
