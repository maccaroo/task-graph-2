export function Placeholder({ name }: { name: string }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
      <h1>{name}</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>Coming soon</p>
    </div>
  )
}
