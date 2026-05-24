import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date
from typing import List, Optional
from flight_optimizer import run_flight_optimizer
from serpapi import GoogleSearch
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    origin: str
    destinations: List[str]
    trip_type: str = "round_trip"
    start_date: date
    end_date: Optional[date] = None
    flexibility_days: int = 3
    passengers: int = 1
    max_total_time_hours: float = 24
    max_price: Optional[float] = None
    earliest_dep_time: Optional[str] = None
    latest_dep_time: Optional[str] = None
    max_stops: Optional[int] = None

class TrendsRequest(BaseModel):
    origin: str
    destinations: List[str]
    start_date: date
    end_date: Optional[date] = None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/search")
def search(req: SearchRequest):
    result = run_flight_optimizer(
        origin=req.origin,
        destinations=req.destinations,
        trip_type=req.trip_type,
        start_date=req.start_date,
        end_date=req.end_date,
        flexibility_days=req.flexibility_days,
        passengers=req.passengers,
        max_total_time_hours=req.max_total_time_hours,
        max_price=req.max_price or 2000,
    )
    return result

@app.post("/trends")
def trends(req: TrendsRequest):
    SERPAPI_KEY = os.getenv("SERPAPI_KEY")
    results = []

    for dest in req.destinations:
        params = {
            "engine": "google_flights",
            "departure_id": req.origin,
            "arrival_id": dest,
            "outbound_date": req.start_date.strftime("%Y-%m-%d"),
            "type": "2",
            "currency": "USD",
            "hl": "en",
            "api_key": SERPAPI_KEY,
        }

        if req.end_date:
            params["type"] = "1"
            params["return_date"] = req.end_date.strftime("%Y-%m-%d")

        search = GoogleSearch(params)
        data = search.get_dict()

        price_insights = data.get("price_insights", {})
        results.append({
            "destination": dest,
            "lowest_price": price_insights.get("lowest_price"),
            "typical_range": price_insights.get("typical_price_range"),
            "price_level": price_insights.get("price_level"),
        })

    return {"trends": results}