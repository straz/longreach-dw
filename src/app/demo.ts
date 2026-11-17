import type { Schemas } from '../api.ts'
import type { OpenDemo } from '../features/shared/client.tsx'
import { fromApi, noNulls } from '../wire.ts'

// A demo as tyapi describes it (GET /v1/projects/{org}/{project}/demo) → what the screens read
// (features/shared/client.tsx): its client, its clock, and its content, in the screens' dates (src/wire.ts), and
// without the nulls the API writes for absent values.

export function demoFrom(out: Schemas['DemoOut']): OpenDemo {
  const d = noNulls(fromApi(out))
  return {
    client: {
      org: d.party,
      graph: d.graph,
      user: d.persona.party,
      footer: d.frame.footer,
    },
    clock: { today: d.frame.clock, earliest: d.frame.timeline_start },
    content: { briefs: d.briefs, documents: d.documents, indicators: d.indicators },
  }
}
