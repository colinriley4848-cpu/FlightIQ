import { useState } from "react";
import { getPriceTrend } from "../api/flightApi";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from "recharts";

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-value">${payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function Trends() {
  const [form, setForm] = useState({ origin: "BOS", destination: "SFO", departureDate: today(30) });
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setChartData([]);
    try {
      const data = await getPriceTrend({
        origin: form.origin.toUpperCase(),
        destination: form.destination.toUpperCase(),
        departure_date: form.departureDate,
      });
      setChartData(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const prices = chartData.map(d => d.price);
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const volatility = minPrice > 0 ? (((maxPrice - minPrice) / minPrice) * 100).toFixed(1) : "0.0";

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Pricing Telemetry</h1>
          <p className="page-subtitle">Historical Trajectory & Volatility Analysis</p>
        </div>
      </div>

      <div className="card form-card">
        <form onSubmit={handleSubmit} className="trend-form">
          <div className="field">
            <label className="field-label">Origin</label>
            <input className="field-input mono upper" placeholder="BOS" value={form.origin} onChange={e => set("origin", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Destination</label>
            <input className="field-input mono upper" placeholder="SFO" value={form.destination} onChange={e => set("destination", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Departure Date</label>
            <input type="date" className="field-input mono" value={form.departureDate} onChange={e => set("departureDate", e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Trend"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="card chart-loading">
          <div className="chart-loading-inner pulsing">
            <p className="chart-loading-label">Aggregating historical data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="error-card"><span>ERR_DATA_FETCH: {error}</span></div>
      ) : chartData.length > 0 ? (
        <>
          <div className="summary-grid three-col">
            <div className="summary-stat"><span className="summary-label">Historical Low</span><span className="summary-value green">${minPrice.toFixed(0)}</span></div>
            <div className="summary-stat"><span className="summary-label">Historical High</span><span className="summary-value red">${maxPrice.toFixed(0)}</span></div>
            <div className="summary-stat"><span className="summary-label">Volatility</span><span className="summary-value amber">{volatility}%</span></div>
          </div>
          <div className="card chart-card">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} dx={-10} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceArea y1={avgPrice + (maxPrice - avgPrice) / 2} y2={maxPrice * 1.1} fill="#ef4444" fillOpacity={0.06} />
                <ReferenceArea y1={0} y2={minPrice + (avgPrice - minPrice) / 2} fill="#22c55e" fillOpacity={0.06} />
                <Line type="monotone" dataKey="price" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: "#0a0f1e", strokeWidth: 2, stroke: "#0ea5e9" }} activeDot={{ r: 6 }} animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              <div className="legend-item"><div className="legend-swatch red-swatch" /> Wait Zone (Overpriced)</div>
              <div className="legend-item"><div className="legend-swatch green-swatch" /> Buy Zone (Value)</div>
            </div>
          </div>
        </>
      ) : (
        <div className="card empty-card">Awaiting query parameters to generate telemetry chart.</div>
      )}
    </div>
  );
}