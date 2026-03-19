import styles from './DocsView.module.css'

export function AboutView() {
  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>TaskGraph</h2>
          <p className={styles.body}>
            A task tracking application for visualising and managing interdependent tasks on a
            timeline graph. Tasks can have their own due dates and also inherit constraints from
            dependent tasks, making it easy to see how work flows through a project.
          </p>
          <ul className={styles.featureList}>
            <li>Graph and list views for tasks</li>
            <li>Dependency relationships between tasks</li>
            <li>Real-time notifications</li>
            <li>Configurable time axis and display</li>
            <li>Zoom controls and mini-map for graph navigation</li>
            <li>Undo/redo for task position and detail changes</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Technology</h2>
          <dl className={styles.dl}>
            <dt>Frontend</dt><dd>React + TypeScript + Vite</dd>
            <dt>Backend</dt><dd>.NET / ASP.NET Core</dd>
            <dt>Database</dt><dd>PostgreSQL</dd>
            <dt>Real-time</dt><dd>WebSockets</dd>
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Developer</h2>
          <p className={styles.body}>Built by Maciej.</p>
          <a
            className={styles.link}
            href="https://github.com/taskgraph/taskgraph"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </section>
      </div>
    </div>
  )
}
