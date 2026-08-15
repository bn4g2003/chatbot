export default function LocaleLoading() {
  return (
    <main className="route-loading" aria-busy="true" aria-label="Loading page">
      <div className="route-loading-banner skeleton-shimmer" />
      <div className="route-loading-search skeleton-shimmer" />
      <section className="route-loading-section">
        <div className="route-loading-heading skeleton-shimmer" />
        <div className="route-loading-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="route-loading-card" key={index}>
              <div className="route-loading-cover skeleton-shimmer" />
              <div className="route-loading-line skeleton-shimmer" />
              <div className="route-loading-line route-loading-line-short skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
