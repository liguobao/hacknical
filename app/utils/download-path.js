import path from 'path'
import PATH from '../../config/path'

export const downloadsRoot = path.resolve(process.env.DOWNLOADS_PATH || path.join(PATH.ROOT_PATH, 'data/downloads'))
