# Data layer — the ontology as a graph in Postgres

**Status: design only.** The Demo 1 MVP is a static site that reads a graph export (`PLAN.md`). This
document designs the persistent layer the product will need, so the MVP's data shape is already the
one the server will serve. Stack: PostgreSQL, SQLAlchemy 2.0 (async), Alembic, FastAPI, Pydantic v2,
`uv` (the conventions of `~/src/cardb`).

---

## 1. Requirements (from `ONTOLOGY.md`)

1. **A graph:** typed nodes and typed, directed links, both carrying **attributes**. Links need
   attributes (necessity, stance, lag, thresholds), which cardb's links do not have.
2. **The ontology is data:** node types, link types, their fields, and which types a link may join
   live in tables, so the model can grow without a migration per entity.
3. **Append-only history.** Evidence is never edited; beliefs change through change sets; every
   version stays. Any strategy can be read as of any snapshot, and any evidence as of any date.
4. **Two times** for evidence: valid time (what period a claim is about) and knowledge time (when
   we could have known it). Plus transaction time (when the row was written).
5. **Provenance on every record:** origin (external, analyst, AI, derived), kind, by, based_on,
   synthetic, verified (ONTOLOGY §3). Usually set once per change set, overridable per record.
6. **Shared vs owned:** evidence and the world model are firm-wide; beliefs belong to one strategy.
7. **Traversal:** downstream and upstream along `supports`, `relies_on`, `supported_by`, with
   depth limits; end-payer resolution (`ultimately_depends_on`).
8. **Diagnostics are never stored.** They are computed from the graph (in the browser for the MVP;
   possibly on the server later, §9).
9. **Multi-tenant later** (one firm per tenant), single tenant now.

---

## 2. What we borrow and what we change

| From | Borrow | Change |
|---|---|---|
| **cardb** (`backend/cardb/models`) | `nodes` with JSONB `fields` and a GIN index; `links` with source/target; `org_id` tenant column; handle unique per org (partial index); async SQLAlchemy; Alembic; service layer that scopes every query; RLS as an upgrade path; `uv` | Links get JSONB `fields` and a `type`; nodes get a `type`; both become **versioned**; writes go through **change sets**; tags replaced by types (tags kept optional) |
| **StackDB** (`doc/file-format.md`) | YAML seed format: handles (`@id`), typed field values, `rel` names on links, "tag nodes" that declare field types | Field declarations live in the type registry rather than tag nodes; change-set headers carry provenance (the ONTOLOGY's per-file defaults) |
| **ONTOLOGY.md** | entity classes, relationships, provenance block, snapshots as base + change sets, two-time evaluation | becomes the seed of the type registry (§4) |

---

## 3. Schema

### 3.1 Tables

```
orgs                 the tenant (Verity Investments)
actors               people, AI agents, rules, external sources that write
node_types           registry: name, description, fields schema, scope (shared|owned)
link_types           registry: name, description, fields schema, allowed source/target types
changesets           one atomic write: who, when, why, scope, provenance defaults
nodes                identity only: id, org, type, handle
node_versions        append-only: fields, provenance, valid time, changeset
links                identity only: id, org, type, source node, target node
link_versions        append-only: fields, provenance, changeset
```

### 3.2 DDL (abridged)

```sql
CREATE TABLE orgs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Who or what produced a record. Origin is the ONTOLOGY's provenance origin.
CREATE TABLE actors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  handle      text NOT NULL,                      -- 'analyst.priya-raman', 'ai.evidence-agent', 'rule.threshold', 'source.northgate'
  origin      text NOT NULL CHECK (origin IN ('external','analyst','ai','derived')),
  name        text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}',        -- model + version for AI; source_type, fictional for sources
  UNIQUE (org_id, handle)
);

CREATE TABLE node_types (
  name         text PRIMARY KEY,                  -- 'assumption', 'commitment', 'observation', 'indicator', ...
  description  text NOT NULL,
  scope        text NOT NULL CHECK (scope IN ('shared','owned')),
  fields_schema jsonb NOT NULL,                   -- JSON Schema for node_versions.fields
  version      int  NOT NULL DEFAULT 1
);

CREATE TABLE link_types (
  name          text PRIMARY KEY,                 -- 'supports', 'relies_on', 'measures', 'bears_on', ...
  description   text NOT NULL,
  source_types  text[] NOT NULL,                  -- allowed node_types.name
  target_types  text[] NOT NULL,
  fields_schema jsonb NOT NULL,                   -- JSON Schema for link_versions.fields
  acyclic       boolean NOT NULL DEFAULT false,   -- enforced by the service for 'supports'
  version       int  NOT NULL DEFAULT 1
);

-- Every write happens in a change set. It is the unit of history, review, and provenance.
CREATE TABLE changesets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  seq          bigserial NOT NULL,                -- global order; snapshots are "up to seq N"
  scope_id     uuid,                              -- the strategy node for owned beliefs; NULL = shared
  actor_id     uuid NOT NULL REFERENCES actors(id),
  recorded_by  uuid REFERENCES actors(id),        -- who typed it, if different (ONTOLOGY §3.1)
  at           timestamptz NOT NULL DEFAULT now(),-- transaction time
  kind         text NOT NULL CHECK (kind IN ('base','change','intake','review','import','correction')),
  trigger      text,                              -- scheduled review | gap | manual | ...
  note         text,
  provenance   jsonb NOT NULL DEFAULT '{}',       -- defaults for every record in it: kind, synthetic, verified, based_on
  UNIQUE (org_id, seq)
);
CREATE INDEX ON changesets (org_id, scope_id, seq);

CREATE TABLE nodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type        text NOT NULL REFERENCES node_types(name),
  handle      text NOT NULL,                      -- 'asm.halberd-50m.pricing-power'
  scope_id    uuid REFERENCES nodes(id),          -- owning strategy for owned types; NULL for shared
  created_cs  uuid NOT NULL REFERENCES changesets(id),
  UNIQUE (org_id, handle)
);

CREATE TABLE node_versions (
  node_id     uuid NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  version     int  NOT NULL,
  changeset_id uuid NOT NULL REFERENCES changesets(id),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired','superseded')),
  fields      jsonb NOT NULL DEFAULT '{}',
  provenance  jsonb NOT NULL DEFAULT '{}',        -- overrides of the change set's defaults
  valid_from  date,                               -- valid time, for observations and dated claims
  valid_to    date,
  published_at date,                              -- knowledge time from the source (observations)
  PRIMARY KEY (node_id, version)
);
CREATE INDEX ON node_versions USING gin (fields);
CREATE INDEX ON node_versions (changeset_id);

CREATE TABLE links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type        text NOT NULL REFERENCES link_types(name),
  source_id   uuid NOT NULL REFERENCES nodes(id),
  target_id   uuid NOT NULL REFERENCES nodes(id),
  scope_id    uuid REFERENCES nodes(id),          -- owned links (beliefs, judged evidence) carry the strategy
  created_cs  uuid NOT NULL REFERENCES changesets(id)
);
CREATE INDEX ON links (source_id, type);
CREATE INDEX ON links (target_id, type);

CREATE TABLE link_versions (
  link_id      uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  version      int  NOT NULL,
  changeset_id uuid NOT NULL REFERENCES changesets(id),
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  fields       jsonb NOT NULL DEFAULT '{}',       -- necessity, weight, stance, lag, note …
  provenance   jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (link_id, version)
);
```

Notes:

- **Identity is separate from content.** `nodes` and `links` never change after insert. All content
  is in `*_versions`, one row per change. "Delete" is a version with `status = 'retired'`.
- **Foreign keys on links** (unlike cardb, which dropped them for cross-schema links). We have one
  schema per tenant, so endpoints can be enforced by the database.
- **Hard deletes** only by tenant removal (`ON DELETE CASCADE` from `orgs`). Nothing else deletes.
- **Optional `tags`** (cardb's `node_tags`) can be added later for user labels; types carry meaning.

### 3.3 Why a type registry instead of a table per entity

The ontology has ~30 entity classes and is still changing (this revision adds four). A table per
class means a migration per idea. With a registry, a new class is a row in `node_types` with a JSON
Schema; the service validates `fields` against it. The cost is weaker database typing; we accept it
because the service layer validates every write, the seed is validated at build time (as in
test5–7), and the hot query paths (§5) use generated columns and indexes, not arbitrary JSON.

When an entity's fields become query-critical, promote them to **generated columns** on
`node_versions` (e.g. `indicator_id` on observations), not to new tables.

---

## 4. The ontology in the registry

Seeded from `ONTOLOGY.md` by a migration. Summary (full field lists in ONTOLOGY):

| node type | scope | key fields (JSON) |
|---|---|---|
| firm, analyst, client, meeting | shared / org | names, dates, cadence |
| strategy | owned (is its own scope) | name, domain, client, status, thesis, forked_from |
| commitment | owned | kind (position · budget · process), subject, stance, size {amount, currency}, authority, term {start, end}, next_review |
| assumption | owned | type (assumption · prediction), statement, plain, conviction, expectation {indicator, rule, threshold, tolerance, window, baseline}, review_by, resolves_on. Premise vs conclusion is **derived** from incoming `supports` links, not stored |
| risk_level, protection, break_trigger, scenario, watchlist | owned | per ONTOLOGY §4.5 |
| source, indicator, observation | shared | per ONTOLOGY §4.3; observation versions set `valid_from/valid_to/published_at` columns |
| player, asset, obligation, role, risk_type, domain | shared | per ONTOLOGY §4.2, §4.4 |
| assessment, ai_suggestion, review | owned by assessor / strategy | per ONTOLOGY §4.6 |

| link type | source → target | key fields |
|---|---|---|
| **supports** | assumption → assumption · assumption → commitment | `necessity` (necessary · supporting), `weight`, `lag_days`, `note`; acyclic |
| depends_on | bet → assumption | `necessity` (ONTOLOGY §4.5; bets group assumptions by role) |
| measures | observation → indicator | — |
| expects | assumption → indicator | (denormalized from claim.expectation for traversal) |
| bears_on | observation → assumption / break_trigger | `stance`, `method` (judged · ai), `note` (rule links are computed, never stored) |
| about | observation → player / obligation / asset | — |
| supersedes | observation → observation | — |
| supported_by, backstops, secured_by | obligation → obligation / asset | — |
| obligor, obligee, guarantor | obligation → player | — |
| member_of | player → role | `from`, `to` |
| driven_by | risk_level → assumption | — |
| embodied_in | protection → obligation | — |
| leads_to | break_trigger → break_trigger | `lag_days` |
| authorizes | actor (person/role) → commitment | `authority` (decide · review · inform) |
| assesses | assessment → source / observation | — |
| based_on | any → any | — |
| forked_from | strategy / assumption → template strategy / assumption | — |

The registry is itself exported in the graph export (§6), so the static site and the build check
read the same schema the server enforces.

---

## 5. Reading the graph

### 5.1 As of a snapshot and a date

Two cut-offs, matching `evaluate(strategy, snapshot S, as of T)` (ONTOLOGY §6.3):

- **Beliefs** (owned scope) up to change-set `seq ≤ S` of that strategy.
- **Evidence** (shared scope) with `published_at ≤ T` and change set `at ≤ T` (we could not have
  known it earlier).

```sql
-- Latest version of every node in a strategy's scope, as of snapshot seq :s
SELECT DISTINCT ON (nv.node_id) n.handle, n.type, nv.*
FROM nodes n
JOIN node_versions nv ON nv.node_id = n.id
JOIN changesets cs   ON cs.id = nv.changeset_id
WHERE n.org_id = :org AND n.scope_id = :strategy AND cs.seq <= :s
ORDER BY nv.node_id, nv.version DESC;
```

The same pattern with `published_at <= :t AND cs.at <= :t` reads evidence. A view per pattern
(`current_nodes`, `current_links`) covers the common "latest" case.

### 5.2 Traversal

Recursive CTE over current links, depth-limited and cycle-safe:

```sql
WITH RECURSIVE downstream(id, depth, path) AS (
  SELECT :start::uuid, 0, ARRAY[:start::uuid]
  UNION ALL
  SELECT l.target_id, d.depth + 1, d.path || l.target_id
  FROM downstream d
  JOIN current_links l ON l.source_id = d.id AND l.type = 'supports'
  WHERE d.depth < :max_depth AND NOT l.target_id = ANY(d.path)
)
SELECT DISTINCT id FROM downstream;
```

Used for: Demo 1's downstream set and exposure, `ultimately_depends_on` (obligations), and "which
commitments care about this observation" (observation → indicator ← claim → … → commitment).

### 5.3 Diff between snapshots

`node_versions` and `link_versions` written by change sets with `seq` in `(S1, S2]` for the
strategy, grouped by change set: the change list of ONTOLOGY §6.2, for free.

---

## 6. Graph export (the contract with the static site)

The MVP never talks to the server; it loads a **graph export**. The server will serve the same
document, so moving from static to live is a change of URL, not of code.

```jsonc
// graph.json — version 1
{
  "format": "longreach.graph", "version": 1,
  "org": { "slug": "verity", "name": "Verity Investments" },
  "as_of": { "snapshot_seq": 12, "evidence_date": "2027-03-31" },
  "types": { "nodes": [ /* node_types rows */ ], "links": [ /* link_types rows */ ] },
  "actors": [ /* actors */ ],
  "changesets": [ /* id, seq, scope, actor, at, kind, trigger, note, provenance */ ],
  "nodes": [ { "id": "asm.halberd-50m.pricing-power", "type": "assumption", "scope": "strategy.halberd-50m",
               "versions": [ { "v": 1, "cs": "cs-0001", "fields": { … }, "provenance": { … } } ] } ],
  "links": [ { "id": "…", "type": "supports", "source": "asm.…utilization", "target": "asm.…pricing-power",
               "versions": [ { "v": 1, "cs": "cs-0001", "fields": { "necessity": "necessary" } } ] } ]
}
```

- Handles, not UUIDs, in the export (cardb's rule for its exposed API): readable, stable across
  databases, and what the seed files use.
- The export carries **all versions** in range, so the browser can move "as of" without a round trip.
- A JSON Schema for the export lives in the repo; both the static build and API tests validate
  against it.

---

## 7. Seed format (hand-written YAML)

Authors write YAML, one file per change set, StackDB-style handles and typed fields:

```yaml
# seed/strategies/halberd-50m/0001-base.yml
changeset:
  kind: base
  actor: analyst.priya-raman
  at: 2026-10-01
  note: Investment committee approval, Halberd Compute.
  provenance: { kind: opinion, synthetic: true }   # defaults for every record below

nodes:
  - handle: commitment.halberd-50m
    type: commitment
    fields:
      kind: position
      subject: Halberd Compute, growth equity
      stance: invest
      size: { amount: 50000000, currency: USD }
      next_review: 2027-04-15

  - handle: asm.halberd-50m.pricing-power
    type: assumption
    fields:
      statement: Operators keep pricing power
      conviction: high
      expectation: { indicator: "@indicator.h100-rental-index", rule: at_least,
                     baseline: { at: 2026-09-30 }, tolerance_pct: 5 }

links:
  - { type: supports, source: "@asm.halberd-50m.utilization",  target: "@asm.halberd-50m.pricing-power", fields: { necessity: necessary } }
  - { type: supports, source: "@asm.halberd-50m.pricing-power", target: "@asm.halberd-50m.margins",       fields: { necessity: necessary } }
  - { type: authorizes, source: "@role.investment-committee", target: "@commitment.halberd-50m", fields: { authority: decide } }
```

The seed loader (Python, `uv run seed`) validates every file against the registry and writes it as
one change set. The static build (`PLAN.md` §4) runs the same validation in TypeScript and emits
`graph.json` directly from the YAML, so the MVP needs no database.

---

## 8. API (FastAPI)

Reads are graph-shaped; writes are change sets. Nothing edits a version in place.

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/types` | the registry |
| GET | `/v1/graph?scope=&snapshot=&as_of=` | graph export (§6) for a strategy, or shared evidence |
| GET | `/v1/nodes/{handle}?as_of=` | one node with its versions |
| GET | `/v1/nodes?type=&scope=&q=` | list / search |
| GET | `/v1/traverse/{handle}?link=supports&dir=down&depth=` | downstream / upstream sets |
| GET | `/v1/changesets?scope=&from=&to=` | history; the diff between snapshots |
| POST | `/v1/changesets` | atomic write: nodes and links to add, version, or retire, with provenance; validated against the registry; returns the new `seq` |
| POST | `/v1/import` | load a seed YAML change set (admin) |

- **Validation in the service layer** (as cardb): field JSON Schema per type; link endpoint types;
  `supports` stays acyclic (checked with the traversal CTE before commit); provenance rules (only
  external records may be kind `fact`; AI records never overwrite analyst ones; synthetic records
  only from fictional sources). Rejected writes return every violation, not the first.
- **Auth:** none in the MVP. Production: an org-scoped session; RLS as cardb's upgrade path.
- **Pydantic models** generated from the registry's JSON Schemas for typed endpoints where useful.

---

## 9. Where diagnostics run

The ONTOLOGY puts the diagnostic engine in the browser, at load. The MVP keeps that: one TypeScript
engine over the graph export. Later needs (alerts when a new observation comes in, notifications to
the decision authority, cohort learning across hundreds of commitments) want the engine on the
server too. Options, decided when the server is built:

1. **Port to Python** and keep both in step with a shared test corpus (fixtures in, expected
   diagnostics out, run by both test suites). Simple; two implementations.
2. **Run the TypeScript engine on the server** (a Node worker invoked by FastAPI). One
   implementation; a second runtime.
3. **Materialized diagnostics** written as `derived` change sets by a scheduled job, for the alert
   and learning features only. Never the source of truth.

Recommendation: 1 + 3, with the shared corpus as the contract.

---

## 10. Repository layout (when built)

```
dw/server/
  pyproject.toml                 uv; fastapi, sqlalchemy[asyncio], asyncpg, alembic, pydantic, jsonschema, ruamel.yaml
  alembic/versions/              0001 schema · 0002 registry seed from ONTOLOGY
  dw_server/
    db.py                        engine, session (cardb pattern)
    models/                      org, actor, types, changeset, node, link (+ versions)
    registry.py                  load and validate against node/link types
    services/                    graph_read.py (as-of, traversal) · changesets.py (writes, validation)
    export.py                    graph.json writer
    api/                         routers per §8
    seed.py                      YAML → change sets
  tests/                         pytest; the shared diagnostics corpus lives in ../shared/fixtures
docker-compose.yml               postgres:17-alpine, named volume (cardb 006 pattern)
```

---

## 11. Risks

- **JSONB everywhere.** Mitigated by the registry, service validation, generated columns for hot
  fields, and the build-time check on seeds.
- **Version tables grow.** Demo and pilot volumes are small (thousands of rows). Partition by org
  or archive old versions only if a tenant reaches millions of versions.
- **Two engines** (§9). The shared corpus is the mitigation; without it they will diverge.
- **"As of" correctness** depends on `published_at` being right for every observation. The intake
  form must make it required; the seed check rejects observations without it.
