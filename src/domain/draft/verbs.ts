// How each link reads, both ways, and what adding one from a card says (docs/21-new-commitment.md, N4, N5, §3).
// Written by hand, one entry per link a draft can reach; which offers a card shows comes from the model
// (palette.ts), so a link ty-core does not allow from a card is never offered. Never "refuted by": a contradicting
// claim is evidence, and whether a belief is falsified is a judgment someone records.

/** One thing a card offers to add: the record at the link's other end, of this kind. */
export type Offer = { label: string; kind?: string }

export type Verb = {
  /** The link read from its source ("rests on"), and from its target ("underpins"). */
  out: string
  in: string
  /** Offered on the source's card, adding the target. */
  addOut?: Offer[]
  /** Offered on the target's card, adding the source. */
  addIn?: Offer[]
}

export const VERBS: Record<string, Verb> = {
  // The commitment sentence
  Commits: { out: 'commits to', in: 'committed by', addIn: [{ label: 'Who commits to it…', kind: 'organization' }] },
  OwnedBy: { out: 'owned by', in: 'owns', addOut: [{ label: 'Who owns it…', kind: 'person' }] },
  Owes: { out: 'owed to', in: 'is owed', addOut: [{ label: "A party it's owed to…", kind: 'organization' }] },
  AccountableTo: { out: 'accountable to', in: 'oversees', addOut: [{ label: "Who it's accountable to…", kind: 'person' }] },
  // Why
  Creates: { out: 'made', in: 'made by', addIn: [{ label: 'The decision that made it…', kind: 'commit' }] },
  Considered: { out: 'considered', in: 'considered in', addOut: [{ label: 'An alternative we considered…' }] },
  Chose: { out: 'chose', in: 'chosen in' },
  GroundsCommitment: { out: 'grounds', in: 'grounded in', addIn: [{ label: 'Evidence behind it…', kind: 'observation' }] },
  GroundsDecision: { out: 'grounds', in: 'grounded in', addIn: [{ label: 'Evidence behind it…', kind: 'observation' }] },
  Raises: { out: 'raises', in: 'raised by', addOut: [{ label: 'A question it leaves open…' }] },
  // Rests on
  RestsOn: {
    out: 'rests on',
    in: 'underpins',
    addOut: [
      { label: 'An assumption it rests on…', kind: 'assumption' },
      { label: 'A prediction it rests on…', kind: 'prediction' },
      { label: 'A constraint it works within…', kind: 'constraint' },
    ],
  },
  BeliefRestsOn: { out: 'rests on', in: 'underpins', addOut: [{ label: 'A belief it rests on…', kind: 'assumption' }] },
  Supports: { out: 'supports', in: 'supported by', addIn: [{ label: 'Evidence for it…', kind: 'observation' }] },
  Contradicts: { out: 'contradicts', in: 'contradicted by', addIn: [{ label: 'Evidence against it…', kind: 'observation' }] },
  InformsBelief: { out: 'bears on', in: 'informed by', addIn: [{ label: 'Evidence that bears on it…', kind: 'observation' }] },
  WillInform: { out: 'will tell us about', in: 'reported on by', addIn: [{ label: 'A report that will tell us…', kind: 'document' }] },
  Watches: {
    out: 'watches',
    in: 'watched by',
    addIn: [{ label: 'A tripwire that watches it…', kind: 'review' }],
    addOut: [{ label: 'The belief it watches…', kind: 'assumption' }],
  },
  ClaimedBy: { out: 'claimed by', in: 'claims', addOut: [{ label: 'Who says so…', kind: 'person' }] },
  ClaimFrom: { out: 'from', in: 'source of' },
  // Depends on
  DependsOn: { out: 'depends on', in: 'needed by', addOut: [{ label: 'Something it depends on…' }] },
  Entails: { out: 'entails', in: 'part of', addOut: [{ label: 'Something it entails (a smaller commitment)…' }] },
  Allocates: {
    out: 'ties up',
    in: 'tied up by',
    addOut: [
      { label: 'Money it ties up…', kind: 'capital' },
      { label: 'People it ties up…', kind: 'talent' },
      { label: 'Time it ties up…', kind: 'time' },
    ],
  },
  // What could change
  GuardedBy: {
    out: 'guarded by',
    in: 'guards',
    addOut: [
      { label: 'A stop rule…', kind: 'kill' },
      { label: 'A review trigger…', kind: 'review' },
    ],
  },
  RiskOf: { out: 'is a risk to', in: 'at risk from', addIn: [{ label: 'A risk…', kind: 'other' }] },
  DrivenBy: {
    out: 'driven by',
    in: 'drives',
    addIn: [{ label: 'A risk it drives…', kind: 'other' }],
    addOut: [{ label: 'A belief that drives it…', kind: 'assumption' }],
  },
  RiskBorneBy: { out: 'borne by', in: 'bears', addOut: [{ label: 'Who bears it…', kind: 'organization' }] },
  // What it makes possible
  Enables: { out: 'opens', in: 'opened by', addOut: [{ label: 'An option it opens…', kind: 'expand' }] },
  Forecloses: { out: 'closes off', in: 'closed off by', addOut: [{ label: 'An option it closes off…', kind: 'other' }] },
  Serves: { out: 'serves', in: 'served by', addOut: [{ label: 'A goal it serves…' }] },
  // Authority
  CoversCommitment: { out: 'covers', in: 'covered by' },
  FormalizedBy: { out: 'formalized by', in: 'formalizes' },
  RecordedIn: { out: 'recorded in', in: 'records' },
}

/** How a link reads from the record it is shown on: its out reading from its source, its in reading from its target. */
export const verbOf = (l: { edge: string; direction: string }) => VERBS[l.edge]?.[l.direction === 'out' ? 'out' : 'in'] ?? l.edge
