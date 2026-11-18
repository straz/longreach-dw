import { useState } from 'react'
import { Link } from 'react-router'
import { API_URL } from '../api.ts'
import { useAction } from '../features/shared/useAction.ts'
import { Card } from './Card.tsx'
import { makeApiKey } from './session.ts'
import './ConnectAiPage.css'
import './PageForm.css'

// Connect your AI (tyapi docs/20, §5): the MCP address and a key of the user's own, with how to add them to Claude Code,
// Claude Desktop or Cursor. The key is the user's, and an assistant's from its first use at MCP: what the assistant
// writes goes in an update of theirs, as its own Actor, and waits for their review before it merges, whether it
// writes over MCP or not. The key is shown this once.

export default function ConnectAiPage() {
  const [key, setKey] = useState<string | null>(null)
  const { busy, problem, run } = useAction()
  const url = `${API_URL}/v1/mcp`
  const shown = key ?? '<your key>'
  const make = () => run(async () => setKey((await makeApiKey()).key))
  const desktop = JSON.stringify({ mcpServers: { longreach: { type: 'http', url, headers: { Authorization: `Bearer ${shown}` } } } }, null, 2)
  return (
    <Card lede="Connect your AI assistant to Longreach. It reads your projects and proposes changes in an update of yours; you review what it wrote, and merge.">
      <div className="page-form">
        <label>
          <span>MCP address</span>
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
        </label>
        {key ? (
          <label>
            <span>Your key, shown this once: copy it now</span>
            <input readOnly value={key} onFocus={(e) => e.target.select()} aria-label="Your key" />
          </label>
        ) : (
          <div className="page-form-actions">
            <button type="button" className="btn-action" onClick={() => void make()} disabled={busy !== null}>
              {busy ? 'Making a key…' : 'Make a key'}
            </button>
          </div>
        )}
        {problem && (
          <p role="alert" className="page-form-problem">
            Could not make a key: {problem}
          </p>
        )}
        <section aria-label="Claude Code">
          <h2>Claude Code</h2>
          <pre className="connect-snippet">{`claude mcp add --transport http longreach ${url} --header "Authorization: Bearer ${shown}"`}</pre>
        </section>
        <section aria-label="Claude Desktop and Cursor">
          <h2>Claude Desktop, Cursor</h2>
          <p>Add this to the app's MCP configuration (Claude Desktop: Settings, Developer; Cursor: .cursor/mcp.json):</p>
          <pre className="connect-snippet">{desktop}</pre>
        </section>
        <p>Then ask it, or pick one of its Longreach prompts: “Draft a commitment”, “Find risks in my update”, “Find evidence for an assumption”.</p>
        <Link className="btn-quiet as-link" to="/">
          Back
        </Link>
      </div>
    </Card>
  )
}
