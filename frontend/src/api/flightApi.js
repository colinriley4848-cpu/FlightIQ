const API_BASE = "http://localhost:8000";

export async function searchFlights(payload) {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getPriceTrend(payload) {
  const res = await fetch(`${API_BASE}/trends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Trend fetch failed");
  return res.json();
}