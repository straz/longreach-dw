import './Pending.css'

// A tab's body before its build phase (docs/PLAN.md §8): says what will be
// here, so the deployed demo is honest after every phase.
export default function Pending({ title, children }: { title: string; children: string }) {
  return (
    <section className="pending">
      <h1 className="pending-title">{title}</h1>
      <p className="pending-text">{children}</p>
    </section>
  )
}
