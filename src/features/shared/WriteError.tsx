import './WriteError.css'

// What a failed write says, everywhere a write can fail: the gateway's
// message, and that nothing changed, so the user can try again.
export default function WriteError({ error }: { error?: Error | null }) {
  if (!error) return null
  return (
    <p className="write-error" role="alert">
      The graph did not accept the change: {error.message}. Nothing was changed; try again.
    </p>
  )
}
