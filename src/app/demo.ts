import type { Me, Schemas } from '../api.ts'
import { yearBefore } from '../domain/dates.ts'
import type { Opened } from '../features/shared/client.tsx'
import { fromApi, noNulls } from '../wire.ts'
import type { DemoListing, ProjectListing } from './session.ts'

// A demo or project as tyapi describes it → what the screens read (features/shared/client.tsx): its client, its
// clock and its content, in the screens' dates (src/wire.ts), without the nulls the API writes for absent values;
// and what the navbar shows of it (Heading).

/** What the navbar and the gateway need of the open demo or project: where it is, and who works in it. */
export type Heading = { graph: string; org: string; project: string; orgName: string; who: { name: string; title: string } }

export const demoHeading = (d: DemoListing): Heading => ({ graph: d.graph, org: d.org, project: d.project, orgName: d.org_name, who: d.persona })

/** A project of the user's own: the user themselves, titled by the project's name. */
export const projectHeading = (p: ProjectListing, me: Me): Heading => ({
  graph: p.graph,
  org: p.org,
  project: p.project,
  orgName: p.org_name,
  who: { name: userName(me), title: p.name },
})

export const userName = (me: Me) => me.display_name ?? me.email ?? 'You'

/** A demo (GET /v1/projects/{org}/{project}/demo), opened as its persona. */
export function demoFrom(out: Schemas['DemoOut']): Opened {
  const d = noNulls(fromApi(out))
  return {
    client: { org: d.party, graph: d.graph, user: d.persona.party, who: d.persona.name, footer: d.frame.footer, demo: true },
    clock: { today: d.frame.clock, earliest: d.frame.timeline_start },
    content: { briefs: d.briefs, documents: d.documents, indicators: d.indicators },
  }
}

/** A project of the user's own (GET /v1/projects), opened as them, at today's date: its org's Party is the one its
 *  commitments bind (tyapi docs/20, P3), and it has no demo content. */
export function projectFrom(p: { graph: string; org: string }, me: Me, today: string): Opened {
  return {
    client: { org: p.org, graph: p.graph, user: '', who: userName(me), footer: '', demo: false },
    clock: { today, earliest: yearBefore(today) },
    content: { briefs: [], documents: [], indicators: {} },
  }
}
