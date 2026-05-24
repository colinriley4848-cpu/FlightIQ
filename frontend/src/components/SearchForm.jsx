import { useState } from "react";

const CABINS = ["economy", "premium_economy", "business", "first"];

export default function SearchForm({ onSearch, loading }) {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    outbound_date: "",
    trip_type: "one-way",
    return_date: "",
    seat_class: "economy",
    adults: 1,
    children: 0,
    max_stops: null,
    max_price: null,
    days_until_travel: 30,
    price_history: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(form);
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="form-row">
        <div className="form-group">
          <label>From</label>
          <input
            value={form.origin}
            onChange={(e) => set("origin", e.target.value.toUpperCase())}
            placeholder="BOS"
            maxLength={3}
            required
          />
        </div>
        <div className="form-group">
          <label>To</label>
          <input
            value={form.destination}
            onChange={(e) => set("destination", e.target.value.toUpperCase())}
            placeholder="LAX"
            maxLength={3}
            required
          />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={form.outbound_date}
            onChange={(e) => set("outbound_date", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Trip Type</label>
          <select value={form.trip_type} onChange={(e) => set("trip_type", e.target.value)}>
            <option value="one-way">One Way</option>
            <option value="round-trip">Round Trip</option>
          </select>
        </div>
        {form.trip_type === "round-trip" && (
          <div className="form-group">
            <label>Return Date</label>
            <input
              type="date"
              value={form.return_date}
              onChange={(e) => set("return_date", e.target.value)}
              required
            />
          </div>
        )}
        <div className="form-group">
          <label>Cabin</label>
          <select value={form.seat_class} onChange={(e) => set("seat_class", e.target.value)}>
            {CABINS.map((c) => (
              <option key={c} value={c}>{c.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Adults</label>
          <input type="number" min={1} max={6} value={form.adults}
            onChange={(e) => set("adults", +e.target.value)} />
        </div>
        <div className="form-group">
          <label>Children</label>
          <input type="number" min={0} max={6} value={form.children}
            onChange={(e) => set("children", +e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Max Stops</label>
          <select
            onChange={(e) => {
              const val = e.target.value;
              set("max_stops", val === "any" ? null : val === "nonstop" ? 0 : 1);
            }}
          >
            <option value="any">Any</option>
            <option value="nonstop">Nonstop</option>
            <option value="max_1">Max 1 Stop</option>
          </select>
        </div>
        <div className="form-group">
          <label>Max Price ($)</label>
          <input
            type="number"
            min={0}
            placeholder="No limit"
            onChange={(e) => set("max_price", e.target.value ? +e.target.value : null)}
          />
        </div>
        <div className="form-group">
          <label>Days Until Travel</label>
          <input
            type="number"
            min={1}
            value={form.days_until_travel}
            onChange={(e) => set("days_until_travel", +e.target.value)}
          />
        </div>
      </div>

      <button type="submit" className="search-btn" disabled={loading}>
        {loading ? "Searching..." : "Find Flights"}
      </button>
    </form>
  );
}