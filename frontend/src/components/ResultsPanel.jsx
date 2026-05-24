export default function ResultsPanel({ results }) {
  if (!results) return null;

  const { optimal_flight, top_flights, search_summary } = results;

  return (
    <div className="results-panel">
      <div className="summary-bar">
        <span>{search_summary?.route}</span>
        <span>{search_summary?.date}</span>
        <span>{search_summary?.total_results} flights found</span>
        <span>Filtered: {search_summary?.filtered_results}</span>
      </div>

      {optimal_flight ? (
        <div className="optimal-card">
          <div className="optimal-label">✈ Optimal Flight</div>
          <div className="optimal-details">
            <span className="price">${optimal_flight.price}</span>
            <span>{optimal_flight.airline}</span>
            <span>{optimal_flight.departure} → {optimal_flight.arrival}</span>
            <span>{optimal_flight.duration}</span>
            <span>{optimal_flight.stops === 0 ? "Nonstop" : `${optimal_flight.stops} stop(s)`}</span>
          </div>
        </div>
      ) : (
        <div className="no-results">No flights matched your constraints.</div>
      )}

      {top_flights?.length > 0 && (
        <div className="flights-table-wrap">
          <h3>All Matching Flights</h3>
          <table className="flights-table">
            <thead>
              <tr>
                <th>Airline</th>
                <th>Price</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Duration</th>
                <th>Stops</th>
              </tr>
            </thead>
            <tbody>
              {top_flights.map((f, i) => (
                <tr key={i} className={f.is_optimal ? "optimal-row" : ""}>
                  <td>{f.airline}</td>
                  <td>${f.price}</td>
                  <td>{f.departure}</td>
                  <td>{f.arrival}</td>
                  <td>{f.duration}</td>
                  <td>{f.stops === 0 ? "Nonstop" : `${f.stops} stop(s)`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}