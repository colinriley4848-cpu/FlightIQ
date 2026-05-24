import { useState } from "react";
import Home from "./pages/Home";
import Trends from "./pages/Trends";
import "./index.css";

function PlaneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-0.7 0-1.5.3-2 .8L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  );
}

export default function App() {
  const [page, setPage] = useState("home");

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="logo" onClick={() => setPage("home")}>
          <PlaneIcon /> FlightIQ
        </button>
        <nav className="app-nav">
          <button className={`nav-link ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Search</button>
          <button className={`nav-link ${page === "trends" ? "active" : ""}`} onClick={() => setPage("trends")}>Trends</button>
        </nav>
      </header>
      <main className="app-main">
        {page === "home" ? <Home /> : <Trends />}
      </main>
    </div>
  );
}