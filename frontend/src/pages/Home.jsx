import { useState } from "react";
import { searchFlights } from "../api/flightApi";

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function AlertIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function ArrowRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

export default function Home() {
  const [form, setForm] = useState({
    origin: "BOS",
    destinationsStr: "SFO",
    tripType: "round_trip",
    startDate: today(30),
    endDate: today(37),
    flexibilityDays: 3,
    passengers: 1,
    maxPrice: "",
    maxDurationHours: 24,
    earliestDepTime: "",
    latestDepTime: "",
    maxStops: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setHasSearched(true);
    setLoading(true);
    setError(null);
    setResult(null);

    const destinations = form.destinationsStr
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    try {
      const data = await searchFlights({
        origin: form.origin.toUpperCase(),
        destinations,
        trip_type: form.tripType,
        start_date: form.startDate,
        end_date: form.endDate || null,
        flexibility_days: Number(form.flexibilityDays),
        passengers: Number(form.passengers),
        max_total_time_hours: Number(form.maxDurationHours),
        max_price: form.maxPrice ? Number(form.maxPrice) : null,
        earliest_dep_time: form.earliestDepTime || null,
        latest_dep_time: form.latestDepTime || null,
        max_stops: form.maxStops !== "" ? Number(form.maxStops) : null,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const summaryTable = result?.summary_table || [];
  const bestOption = result?.best_option || null;
  const avgPrice = summaryTable.length > 0
    ? summaryTable.reduce((s, f) => s + f.price, 0) / summaryTable.length : 0;
  const cheapestDest = bestOption?.destination || null;
  const buyNowCount = summaryTable.filter(f => (f.recommendation || "").toLowerCase().includes("buy")).length;
  const waitCount = summaryTable.filter(f => (f.recommendation || "").toLowerCase().includes("wait")).length;

  function recClass(rec) {
    if (!rec) return "badge-neutral";
    if (rec.toLowerCase().includes("buy")) return "badge-buy";
    if (rec.toLowerCase().includes("wait")) return "badge-wait";
    return "badge-neutral";
  }

  function confClass(conf) {
    if (conf >= 0.8) return "conf-high";
    if (conf >= 0.5) return "conf-mid";
    return "conf-low";
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">✈ FlightIQ Terminal</h1>
          <p className="page-subtitle">Global Route Optimizer & Price Intelligence</p>
        </div>
        <div className="system-stats">
          <div className="stat-item">
            <span className="stat-label">System Status</span>
            <span className="stat-value online">● ONLINE</span>
          </div>
        </div>
      </div>

      <div className="card form-card">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Origin</label>
              <input className="field-input mono upper" placeholder="BOS" value={form.origin} onChange={e => set("origin", e.target.value)} />
            </div>
            <div className="field field-wide">
              <label className="field-label">Destinations (comma-separated)</label>
              <input className="field-input mono upper" placeholder="SFO, JFK, LAX" value={form.destinationsStr} onChange={e => set("destinationsStr", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Type</label>
              <select className="field-input mono" value={form.tripType} onChange={e => set("tripType", e.target.value)}>
                <option value="round_trip">Round Trip</option>
                <option value="one_way">One Way</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Depart</label>
              <input type="date" className="field-input mono" value={form.startDate} onChange={e => set("startDate", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Return</label>
              <input type="date" className="field-input mono" value={form.endDate} onChange={e => set("endDate", e.target.value)} disabled={form.tripType === "one_way"} />
            </div>
            <div className="field">
              <label className="field-label">Flex (+/- days)</label>
              <input type="number" min="0" max="14" className="field-input mono" value={form.flexibilityDays} onChange={e => set("flexibilityDays", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Passengers</label>
              <input type="number" min="1" max="9" className="field-input mono" value={form.passengers} onChange={e => set("passengers", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Max Price ($)</label>
              <input type="number" min="0" step="50" className="field-input mono" placeholder="Any" value={form.maxPrice} onChange={e => set("maxPrice", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Max Duration (h)</label>
              <input type="number" min="1" className="field-input mono" value={form.maxDurationHours} onChange={e => set("maxDurationHours", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Earliest Dep.</label>
              <input type="text" className="field-input mono" placeholder="06:00" value={form.earliestDepTime} onChange={e => set("earliestDepTime", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Latest Dep.</label>
              <input type="text" className="field-input mono" placeholder="22:00" value={form.latestDepTime} onChange={e => set("latestDepTime", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Max Stops</label>
              <select className="field-input mono" value={form.maxStops} onChange={e => set("maxStops", e.target.value)}>
                <option value="">No Limit</option>
                <option value="0">Nonstop</option>
                <option value="1">Up to 1 Stop</option>
                <option value="2">Up to 2 Stops</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="pulsing">Processing...</span> : <>Execute Query <SearchIcon /></>}
            </button>
          </div>
        </form>
      </div>

      {hasSearched && (
        <div className="results-section">
          <div className="results-header">
            <h2 className="results-title"><ShieldIcon /> Analysis Results</h2>
            {loading && <span className="fetching-label">⏱ Fetching real-time market data...</span>}
          </div>

          {loading ? (
            <div className="skeleton-list">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : error ? (
            <div className="error-card"><AlertIcon size={18} /><span>ERR_MARKET_DATA: {error}</span></div>
          ) : result ? (
            <>
              <div className="summary-grid">
                <div className="summary-stat"><span className="summary-label">Avg Price</span><span className="summary-value">${avgPrice.toFixed(2)}</span></div>
                <div className="summary-stat"><span className="summary-label">Cheapest Dest</span><span className="summary-value primary">{cheapestDest || "N/A"}</span></div>
                <div className="summary-stat"><span className="summary-label">Wait Signals</span><span className="summary-value amber">{waitCount}</span></div>
                <div className="summary-stat"><span className="summary-label">Buy Signals</span><span className="summary-value green">{buyNowCount}</span></div>
              </div>

              {bestOption && <div className="section-label">Top Recommendation</div>}
              {bestOption && (
                <div className="card flight-card best-flight">
                  <div className="accent-bar" />
                  <div className="flight-body">
                    <div className="flight-price-col">
                      <div className="flight-price">${bestOption.price}</div>
                      <div className="flight-airline">{bestOption.airline}</div>
                      <div className="flight-id-tag">{bestOption.flight_id}</div>
                    </div>
                    <div className="flight-route">
                      <div className="route-end text-right">
                        <div className="route-code">{bestOption.source}</div>
                        <div className="route-time">{bestOption.departure_time || "--:--"}</div>
                        <div className="route-date">{String(bestOption.departure_date)}</div>
                      </div>
                      <div className="route-line">
                        <div className="route-meta">{Number(bestOption.duration_hours).toFixed(1)}h · {bestOption.stops === 0 ? "NONSTOP" : `${bestOption.stops} STOP`}</div>
                        <ArrowRight />
                      </div>
                      <div className="route-end">
                        <div className="route-code">{bestOption.destination}</div>
                      </div>
                    </div>
                    <div className="flight-rec-col">
                      <span className={`badge ${recClass(bestOption.recommendation)}`}>{bestOption.recommendation || "N/A"}</span>
                      {bestOption.confidence != null && (
                        <span className={`conf-tag ${confClass(bestOption.confidence)}`}>CONFIDENCE: {(bestOption.confidence * 100).toFixed(1)}%</span>
                      )}
                      {bestOption.seats_remaining < 10 && (
                        <div className="seats-warning"><AlertIcon size={12} /> {bestOption.seats_remaining} seats remaining</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {summaryTable.length > 0 && (
                <>
                  <div className="section-label" style={{ marginTop: "1.5rem" }}>All Tracked Routes</div>
                  {summaryTable.filter(f => f.to !== bestOption?.destination).map((flight, i) => (
                    <div key={i} className="card flight-card">
                      <div className="flight-body">
                        <div className="flight-price-col">
                          <div className="flight-price sm">${flight.price}</div>
                          <div className="flight-airline">{flight.airline}</div>
                        </div>
                        <div className="flight-route">
                          <div className="route-end text-right">
                            <div className="route-code sm">{flight.from}</div>
                            <div className="route-time">{flight.time || "--:--"}</div>
                          </div>
                          <div className="route-line">
                            <div className="route-meta sm">{Number(flight.duration_hours).toFixed(1)}h · {flight.stops}</div>
                          </div>
                          <div className="route-end">
                            <div className="route-code sm">{flight.to}</div>
                          </div>
                        </div>
                        <div className="flight-rec-col sm">
                          <span className={`badge sm ${recClass(flight.recommendation)}`}>{flight.recommendation || "N/A"}</span>
                          {flight.confidence != null && (
                            <span className={`conf-tag sm ${confClass(flight.confidence)}`}>{(flight.confidence * 100).toFixed(0)}%</span>
                          )}
                          {flight.seats_remaining < 10 && (
                            <div className="seats-warning sm"><AlertIcon size={10} /> {flight.seats_remaining} LEFT</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}