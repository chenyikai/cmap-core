import type { UPDATE_STATUS } from '@/modules/Ship/vars.ts'
import type { IBaseShipOptions } from '@/types/Ship/BaseShip.ts'

export interface IAisShipOptions extends IBaseShipOptions {
  outLine?: boolean
  updateStatus?: UPDATE_STATUS
}
