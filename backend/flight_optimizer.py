# -*- coding: utf-8 -*-
import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pulp import *
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from serpapi import GoogleSearch
from dotenv import load_dotenv

load_dotenv()

CSV_PATH = 'flightiq_training_data.csv'
SERPAPI_KEY = os.getenv("SERPAPI_KEY")


def load_flight_data_from_serpapi(origin, destinations, start_date, flexibility_days, trip_type="One way", return_date=None):
    if not SERPAPI_KEY:
        print("ERROR: SERPAPI_KEY not set in environment.")
        return pd.DataFrame()

    all_rows = []

    for dest in destinations:
        for offset in range(-flexibility_days, flexibility_days + 1):
            dep_date = start_date + timedelta(days=offset)

            params = {
                "engine": "google_flights",
                "departure_id": origin,
                "arrival_id": dest,
                "outbound_date": dep_date.strftime("%Y-%m-%d"),
                "type": "1" if trip_type == "Round Trip" else "2",
                "currency": "USD",
                "hl": "en",
                "api_key": SERPAPI_KEY,
            }

            if trip_type == "Round Trip" and return_date:
                params["return_date"] = return_date.strftime("%Y-%m-%d")

            search = GoogleSearch(params)
            results = search.get_dict()

            print("SERPAPI KEYS:", list(results.keys()))
            print("ERROR:", results.get("error"))
            print("FLIGHTS:", len(results.get("best_flights", [])) + len(results.get("other_flights", [])))

            flights = []
            if "best_flights" in results:
                flights.extend(results["best_flights"])
            if "other_flights" in results:
                flights.extend(results["other_flights"])

            for f in flights:
                price = f.get("price")
                if not isinstance(price, (int, float)):
                    continue

                legs = f.get("flights", [])
                if not legs:
                    continue

                first_leg = legs[0]
                airline = first_leg.get("airline", "Unknown")
                dep_time = first_leg.get("departure_airport", {}).get("time")
                total_duration = f.get("total_duration")

                if not isinstance(total_duration, (int, float)):
                    continue

                duration_hours = total_duration / 60.0
                stops = max(len(legs) - 1, 0)
                days_until_departure = (dep_date - datetime.now().date()).days
                is_international = 1 if (origin[0] != dest[0]) else 0
                month = dep_date.month
                is_summer_travel = 1 if month in [6, 7, 8] else 0
                is_holiday_season = 1 if month in [11, 12] else 0

                row = {
                    "flight_id": f.get("departure_token", f"{origin}-{dest}-{dep_date}-{airline}"),
                    "airline": airline,
                    "source": origin,
                    "destination": dest,
                    "departure_date": dep_date,
                    "departure_time": dep_time,
                    "duration_hours": duration_hours,
                    "stops": stops,
                    "price": price,
                    "days_until_departure": days_until_departure,
                    "is_international": is_international,
                    "is_summer_travel": is_summer_travel,
                    "is_holiday_season": is_holiday_season,
                    "seats_remaining": 10,
                    "buy_now_label": 1,
                }
                all_rows.append(row)

    if not all_rows:
        return pd.DataFrame()

    return pd.DataFrame(all_rows).reset_index(drop=True)


def find_cheapest_flight(df, origin, destination, preferred_dep_date,
                         flexibility=0, max_duration=None, max_price=2000):
    filtered = df[
        (df['source'] == origin) &
        (df['destination'] == destination)
    ].copy()

    min_dep = preferred_dep_date - timedelta(days=flexibility)
    max_dep = preferred_dep_date + timedelta(days=flexibility)
    filtered = filtered[
        (filtered['departure_date'] >= min_dep) &
        (filtered['departure_date'] <= max_dep)
    ]

    if max_duration:
        filtered = filtered[filtered['duration_hours'] <= max_duration]

    if max_price:
        filtered = filtered[filtered['price'] <= max_price]

    if not filtered.empty:
        return filtered.loc[filtered['price'].idxmin()]
    return None


def optimize_flights_mip(flight_options_df, destinations, passengers, budget):
    if flight_options_df.empty:
        return pd.DataFrame(), None

    prob = LpProblem("FlightIQ_Optimizer", LpMinimize)
    flight_vars = LpVariable.dicts("Flight", flight_options_df.index, 0, 1, LpBinary)

    prob += lpSum([
        flight_options_df.loc[i, 'price'] * flight_vars[i]
        for i in flight_options_df.index
    ]), "Total_Cost"

    for dest in destinations:
        dest_idx = flight_options_df[flight_options_df['destination'] == dest].index
        if len(dest_idx) > 0:
            prob += lpSum([flight_vars[i] for i in dest_idx]) <= 1, f"MaxOne_{dest}"

    if budget:
        prob += lpSum([
            flight_options_df.loc[i, 'price'] * flight_vars[i]
            for i in flight_options_df.index
        ]) <= budget, "Budget"

    prob.solve(PULP_CBC_CMD(msg=0))

    if prob.status == LpStatusOptimal:
        selected = [
            flight_options_df.loc[i]
            for i in flight_options_df.index
            if flight_vars[i].varValue == 1
        ]
        return pd.DataFrame(selected), value(prob.objective)
    return pd.DataFrame(), None


def _fallback_model():
    np.random.seed(42)
    records = []
    for _ in range(2000):
        days_out = np.random.randint(1, 180)
        price = np.random.randint(80, 1400)
        month = np.random.randint(1, 13)
        is_intl = np.random.randint(0, 2)
        is_summer = int(month in [6, 7, 8])
        is_holiday = int(month in [11, 12])
        seats = np.random.randint(0, 180)
        stops = np.random.randint(0, 2)
        duration = np.random.uniform(1.0, 14.0)
        dow = np.random.randint(0, 7)
        will_rise = (
            (days_out < 14 and np.random.rand() < 0.88) or
            (days_out < 21 and np.random.rand() < 0.72) or
            (days_out < 30 and is_intl and np.random.rand() < 0.60)
        )
        records.append({
            'days_until_departure': days_out, 'price': price, 'month': month,
            'is_international': is_intl, 'is_summer_travel': is_summer,
            'is_holiday_season': is_holiday, 'seats_remaining': seats,
            'stops': stops, 'duration_hours': duration,
            'day_of_week': dow, 'buy_now_label': int(will_rise)
        })
    df = pd.DataFrame(records)
    features = ['days_until_departure', 'price', 'month', 'is_international',
                'is_summer_travel', 'is_holiday_season', 'seats_remaining',
                'stops', 'duration_hours', 'day_of_week']
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(df[features], df['buy_now_label'])
    return model


def train_buy_wait_model(_flights_df_unused):
    features = [
        'days_until_departure', 'price', 'month', 'is_international',
        'is_summer_travel', 'is_holiday_season', 'seats_remaining',
        'stops', 'duration_hours',
    ]
    dow_map = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
    }
    try:
        full_df = pd.read_csv(CSV_PATH)
    except FileNotFoundError:
        return _fallback_model(), features + ['day_of_week']

    full_df = full_df.rename(columns={'price_usd': 'price'})
    full_df['day_of_week'] = full_df['day_of_week'].map(dow_map).fillna(2).astype(int)
    all_features = features + ['day_of_week']
    df_clean = full_df[all_features + ['buy_now_label']].dropna()
    X = df_clean[all_features]
    y = df_clean['buy_now_label']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    return model, all_features


def get_buy_wait_recommendation(model, feature_cols, flight):
    if flight is None:
        return "N/A", 0.0

    days_out = (flight['departure_date'] - datetime.now().date()).days
    if days_out < 0:
        return "N/A", 0.0

    month = flight['departure_date'].month
    dow_num = flight['departure_date'].weekday()

    input_df = pd.DataFrame([{
        'days_until_departure': days_out,
        'price': flight['price'],
        'month': month,
        'is_international': flight.get('is_international', 0),
        'is_summer_travel': flight.get('is_summer_travel', int(month in [6, 7, 8])),
        'is_holiday_season': flight.get('is_holiday_season', int(month in [11, 12])),
        'seats_remaining': flight.get('seats_remaining', 50),
        'stops': flight.get('stops', 0),
        'duration_hours': flight.get('duration_hours', 5.0),
        'day_of_week': dow_num,
    }])[feature_cols]

    pred = model.predict(input_df)[0]
    confidence = model.predict_proba(input_df)[0][pred]
    return ("Buy Now" if pred == 1 else "Wait"), float(round(confidence, 2))


def run_flight_optimizer(origin, destinations, trip_type, start_date, end_date,
                         flexibility_days, passengers, max_total_time_hours, max_price):

    flights_df = load_flight_data_from_serpapi(
        origin, destinations, start_date, flexibility_days, trip_type, end_date
    )

    if flights_df.empty:
        return {
            "status": "no_results",
            "message": "No flights found for your search criteria.",
            "best_option": None,
            "per_destination": [],
            "summary_table": []
        }

    ml_model, ml_features = train_buy_wait_model(flights_df)
    all_cheapest = []

    for dest in destinations:
        cheapest = find_cheapest_flight(
            flights_df, origin, dest, start_date,
            flexibility=flexibility_days,
            max_duration=max_total_time_hours,
            max_price=max_price
        )
        if cheapest is not None:
            all_cheapest.append(cheapest)

    if not all_cheapest:
        selected, cost = optimize_flights_mip(flights_df, destinations, passengers, max_price)
        if selected.empty:
            return {
                "status": "no_solution",
                "message": "MIP could not find a solution within budget.",
                "best_option": None,
                "per_destination": [],
                "summary_table": []
            }
        best_rows = selected.to_dict(orient="records")
        return {
            "status": "mip_only",
            "message": f"MIP found {len(best_rows)} flight(s).",
            "best_option": best_rows[0],
            "per_destination": best_rows,
            "summary_table": best_rows
        }

    best_df = pd.DataFrame(all_cheapest)
    best = best_df.loc[best_df['price'].idxmin()]
    rec, conf = get_buy_wait_recommendation(ml_model, ml_features, best)

    best_dict = best.to_dict()
    best_dict["recommendation"] = rec
    best_dict["confidence"] = conf

    per_dest = best_df.to_dict(orient="records")

    summary_df = best_df[[
        'source', 'destination', 'airline',
        'departure_date', 'departure_time',
        'price', 'duration_hours', 'stops', 'seats_remaining'
    ]].copy()
    summary_df['stops'] = summary_df['stops'].apply(lambda x: 'Nonstop' if x == 0 else f'{int(x)} stop')
    summary_df['price'] = summary_df['price'].apply(float)
    summary_df['duration_hours'] = summary_df['duration_hours'].apply(lambda x: float(round(x, 1)))
    summary_df['seats_remaining'] = summary_df['seats_remaining'].apply(int)
    summary_df.columns = ['from', 'to', 'airline', 'date', 'time', 'price', 'duration_hours', 'stops', 'seats_remaining']

    return {
        "status": "ok",
        "message": "Optimizer ran successfully.",
        "best_option": best_dict,
        "per_destination": per_dest,
        "summary_table": summary_df.to_dict(orient="records")
    }