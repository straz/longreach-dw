import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Where things are on a laptop, for the dev server, the browser tests and the scripts (docs/PLAN.md §4). The app
// itself takes the API's address from the build (VITE_API_URL), which vite.config.ts defaults to LOCAL_API.

/** dw's dev server: the origin tyapi's gateway allows on a laptop. */
export const LOCAL_APP = 'https://127.0.0.1:5173'
/** The laptop's tyapi gateway. */
export const LOCAL_API = 'https://127.0.0.1:8100'
/** The tyapi checkout: TYAPI, or ../tyapi beside this repository. */
export const TYAPI = resolve(process.env.TYAPI ?? fileURLToPath(new URL('../tyapi', import.meta.url)))
