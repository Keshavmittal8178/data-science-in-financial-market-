# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from arch import arch_model
from datetime import timedelta
from math import sqrt
from textblob import TextBlob
from dotenv import load_dotenv
import requests
from pmdarima import auto_arima
import warnings
warnings.filterwarnings('ignore')

# For LSTM
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    LSTM_AVAILABLE = True
except ImportError:
    LSTM_AVAILABLE = False
    print("TensorFlow not available, LSTM analysis will be limited")

# For FinBERT
try:
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    import torch
    FINBERT_AVAILABLE = True
except ImportError:
    FINBERT_AVAILABLE = False
    print("Transformers not available, FinBERT analysis will use TextBlob fallback")

app = Flask(__name__)
CORS(app)

# ============================
#  SYMBOL → REAL COMPANY NAME MAP (for news query)
# ============================
SYMBOL_MAP = {
    "ASIANPAINT": "Asian Paints",
    "HDFCBANK": "HDFC Bank",
    "NTPC": "NTPC",
    "MARUTI": "Maruti Suzuki",
    "WIPRO": "Wipro",
    "SUNPHARMA": "Sun Pharma",
    "ULTRACEMCO": "Ultratech Cement",
    "SHREECEM": "Shree Cement",
    "TECHM": "Tech Mahindra",
    "TATAMTRDVR": "Tata Motors DVR",
    "HINDUNILVR": "Hindustan Unilever",
    "BAJAJAUTO": "Bajaj Auto",
    "MM": "Mahindra and Mahindra",
    "LT": "Larsen and Toubro",
}

# ============================
#  PATHS
# ============================
BASE_DIR = os.path.dirname(__file__)
DATA_CSV = os.path.join(BASE_DIR, "data", "market_data.csv")
HOLDINGS_CSV = os.path.join(BASE_DIR, "data", "holdings.csv")
SENTIMENT_CSV = os.path.join(BASE_DIR, "data", "sentiment_sample.csv")

# ============================
#  HELPERS
# ============================
def read_timeseries():
    """Reads the wide CSV: Date + many tickers."""
    if not os.path.exists(DATA_CSV):
        return pd.DataFrame()

    df = pd.read_csv(DATA_CSV)

    if "Date" not in df.columns:
        return pd.DataFrame()

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(how="all", subset=[c for c in df.columns if c != "Date"])
    df = df.sort_values("Date").reset_index(drop=True)

    # Fill missing stock prices
    df = df.ffill().bfill()
    return df


def latest_and_prev_prices(df):
    """Return last and previous row price series and last date."""
    if df.empty:
        return pd.Series(dtype=float), pd.Series(dtype=float), None

    last_row = df.iloc[-1]
    prev_row = df.iloc[-2] if len(df) >= 2 else df.iloc[-1]

    last_date = last_row["Date"]

    last = pd.to_numeric(last_row.drop("Date"), errors="coerce")
    prev = pd.to_numeric(prev_row.drop("Date"), errors="coerce")

    return last, prev, last_date.strftime("%d-%m-%Y")


def get_price_series(symbol):
    """Return a clean Date + Price series for one symbol."""
    df = read_timeseries()
    if df.empty or symbol not in df.columns:
        return pd.DataFrame()

    df = df[["Date", symbol]].dropna()
    df = df.rename(columns={symbol: "Price"})
    df["Price"] = pd.to_numeric(df["Price"], errors="coerce")
    df = df.dropna()

    return df


# ===========================================================
#  NIFTY API
# ===========================================================
@app.route("/api/nifty")
def api_nifty():
    df = read_timeseries()
    if df.empty:
        return jsonify({"error": "No data"}), 404

    df["NIFTY"] = df.drop(columns=["Date"]).mean(axis=1)
    latest = df.iloc[-1]["NIFTY"]
    prev = df.iloc[-2]["NIFTY"]
    change_pct = (latest - prev) / prev * 100
    date = df.iloc[-1]["Date"].strftime("%d-%m-%Y")

    return jsonify({
        "nifty_value": round(latest, 2),
        "change_pct": round(change_pct, 2),
        "date": date
    })


# ===========================================================
#  STOCK API (single symbol snapshot)
# ===========================================================
@app.route("/api/stock/<symbol>")
def api_stock(symbol):
    df = read_timeseries()
    if df.empty or symbol not in df.columns:
        return jsonify({"error": "Symbol not found"}), 404

    df = df.dropna(subset=[symbol])
    df["Date"] = pd.to_datetime(df["Date"])

    latest = df.iloc[-1][symbol]
    prev = df.iloc[-2][symbol]

    change = latest - prev
    change_pct = change / prev * 100

    return jsonify({
        "symbol": symbol,
        "latest_value": round(latest, 2),
        "change": round(change, 2),
        "change_pct": round(change_pct, 2),
        "date": df.iloc[-1]["Date"].strftime("%d-%m-%Y")
    })


# ===========================================================
#  MARKET MOVERS (TOP GAINERS / LOSERS)
# ===========================================================
@app.route("/api/market-movers")
def api_market_movers():
    df = read_timeseries()
    last, prev, last_date = latest_and_prev_prices(df)
    if last.empty:
        return jsonify({"gainers": [], "losers": []})

    movers = []
    for sym in last.index:
        if pd.isna(last[sym]) or pd.isna(prev[sym]):
            continue

        pct = (last[sym] - prev[sym]) / prev[sym] * 100
        movers.append({
            "symbol": sym,
            "ltp": float(last[sym]),
            "pct_change": round(pct, 2)
        })

    movers_df = pd.DataFrame(movers)
    gainers = movers_df.sort_values("pct_change", ascending=False).head(10).to_dict("records")
    losers = movers_df.sort_values("pct_change", ascending=True).head(10).to_dict("records")

    return jsonify({"date": last_date, "gainers": gainers, "losers": losers})


# ===========================================================
#  PORTFOLIO (synthetic)
# ===========================================================
@app.route("/api/portfolio")
def api_portfolio():
    df = read_timeseries()
    if df.empty:
        return jsonify({"holdings": [], "totals": {}})

    last, prev, date = latest_and_prev_prices(df)

    rows = []
    for sym in last.index:
        ltp = float(last[sym])
        series = pd.to_numeric(df[sym], errors="coerce").dropna()
        if series.empty:
            continue

        first_price = series.iloc[0]

        invested = first_price * 1
        current_value = ltp * 1

        today_pl = (ltp - float(prev[sym])) if not pd.isna(prev[sym]) else 0
        profit_loss = current_value - invested
        profit_loss_pct = (profit_loss / invested * 100) if invested != 0 else 0

        rows.append({
            "symbol": sym,
            "quantity": 1,
            "avg_cost": round(first_price, 2),
            "ltp": ltp,
            "invested": round(invested, 2),
            "current_value": round(current_value, 2),
            "profit_loss": round(profit_loss, 2),
            "profit_loss_pct": round(profit_loss_pct, 2),
            "today_pl": round(today_pl, 2)
        })

    totals = {
        "total_invested": sum(r["invested"] for r in rows),
        "total_current_value": sum(r["current_value"] for r in rows),
        "total_profit_loss": sum(r["profit_loss"] for r in rows),
        "total_today_pl": sum(r["today_pl"] for r in rows),
        "date": date
    }

    return jsonify({"holdings": rows, "totals": totals})


# ===========================================================
#  NIFTY HISTORY FOR CHART
# ===========================================================
@app.route("/api/nifty/history")
def api_nifty_history():
    df = read_timeseries()
    df["NIFTY"] = df.drop(columns=["Date"]).mean(axis=1)
    df = df[["Date", "NIFTY"]].tail(200)
    return jsonify(df.to_dict("records"))


# ===========================================================
#  DSFM TOP STOCKS  (Sharpe / Volatility)
# ===========================================================
def compute_risk_metrics():
    df = read_timeseries()
    if df.empty:
        return []

    df = df.sort_values("Date")
    price_cols = [c for c in df.columns if c != "Date"]

    trading_days = 252
    results = []

    for sym in price_cols:
        series = pd.to_numeric(df[sym], errors="coerce").dropna()
        if len(series) < 300:
            continue

        daily = series.pct_change().dropna()
        if daily.empty:
            continue

        mean_ret = daily.mean()
        vol = daily.std()

        annual_return = (1 + mean_ret) ** trading_days - 1
        annual_vol = vol * sqrt(trading_days)
        sharpe = (annual_return / annual_vol) if annual_vol != 0 else 0

        results.append({
            "symbol": sym,
            "annual_return": round(annual_return * 100, 2),
            "volatility": round(annual_vol * 100, 2),
            "sharpe": round(sharpe, 2)
        })

    return sorted(results, key=lambda x: x["sharpe"], reverse=True)


@app.route("/api/dsfm/top-stocks")
def api_dsfm_top_stocks():
    metrics = compute_risk_metrics()
    return jsonify({
        "top_10": metrics[:10],
        "top_5": metrics[:5],
        "all_ranked": metrics
    })


# ===========================================================
#  FORECAST MODELS (ARIMA, SARIMA, GARCH on log-returns)
# ===========================================================
forecast_cache = {}


def forecast_models(symbol, steps=30):
    if symbol in forecast_cache:
        return forecast_cache[symbol]

    s = get_price_series(symbol)
    if s.empty or len(s) < 2:
        return None

    prices = s["Price"]
    if prices.empty or len(prices) < 2:
        return None

    last_date = s["Date"].iloc[-1]

    # Log returns (stationary)
    returns = np.log(prices).diff().dropna()
    if returns.empty:
        return None

    # Use values to avoid weird index warnings
    r_values = returns.values

    # ---------- ARIMA ----------
    arima_model = auto_arima(
        r_values,
        seasonal=False,
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore"
    )
    arima_r = arima_model.predict(n_periods=steps)
    arima_prices = prices.iloc[-1] * np.exp(np.cumsum(arima_r))
    arima_prices = np.asarray(arima_prices)

    # ---------- SARIMA ----------
    sarima_model = auto_arima(
        r_values,
        seasonal=True,
        m=12,
        stepwise=True,
        suppress_warnings=True,
        error_action="ignore"
    )
    sarima_r = sarima_model.predict(n_periods=steps)
    sarima_prices = prices.iloc[-1] * np.exp(np.cumsum(sarima_r))
    sarima_prices = np.asarray(sarima_prices)

    # ---------- GARCH ----------
    garch_mod = arch_model(r_values, vol="Garch", p=1, q=1, mean="Zero")
    garch_fit = garch_mod.fit(disp="off")

    # Forecast variance specific to the stock
    garch_forecast = garch_fit.forecast(horizon=steps)
    garch_var = garch_forecast.variance.values[-1]

    # Generate random noise based on stock-specific variance
    garch_r = np.random.normal(0, np.sqrt(garch_var), steps)

    # Convert log returns to prices
    garch_prices = prices.iloc[-1] * np.exp(np.cumsum(garch_r))
    garch_prices = np.asarray(garch_prices)

    future_dates = [last_date + timedelta(days=i + 1) for i in range(steps)]

    direction = "UP" if len(arima_prices) > 0 and arima_prices[-1] > prices.iloc[-1] else "DOWN"

    forecast_cache[symbol] = {
        "arima": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, arima_prices)
        ],
        "sarima": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, sarima_prices)
        ],
        "garch": [
            {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
            for d, p in zip(future_dates, garch_prices)
        ],
        "direction": direction
    }
    return forecast_cache[symbol]


@app.route("/api/dsfm/forecast/<symbol>")
def api_dsfm_forecast(symbol):
    forecast = forecast_models(symbol)
    if not forecast:
        return jsonify({"error": "No forecast"}), 404

    return jsonify({
        "symbol": symbol,
        "forecast_direction": forecast["direction"],
        "forecast_arima": forecast["arima"],
        "forecast_sarima": forecast["sarima"],
        "forecast_garch": forecast["garch"],
    })


# ===========================================================
#  SENTIMENT (newsdata.io + TextBlob)
# ===========================================================
load_dotenv()
NEWS_API_KEY = os.getenv("NEWSCATCHER_API_KEY")  # make sure .env has this


def get_dynamic_sentiment(symbol):
    clean_symbol = symbol.split("_")[-1].upper()
    keyword = SYMBOL_MAP.get(clean_symbol, clean_symbol)

    url = "https://newsdata.io/api/1/news"
    params = {
        "apikey": NEWS_API_KEY,
        "q": keyword,
        "language": "en",
        "country": "in",
    }

    try:
        res = requests.get(url, params=params, timeout=10)
        data = res.json()

        if "results" not in data or len(data["results"]) == 0:
            return {
                "symbol": symbol,
                "score": 0.0,
                "label": "NEUTRAL",
                "news": []
            }

        sentiments = []
        news_list = []

        for article in data["results"]:
            title = article.get("title", "")
            desc = article.get("description", "") or ""
            published = article.get("pubDate", "")

            text = f"{title} {desc}"
            polarity = TextBlob(text).sentiment.polarity
            sentiments.append(polarity)

            news_list.append({
                "title": title,
                "description": desc,
                "published": published,
                "sentiment_score": round(polarity, 3)
            })

        score = sum(sentiments) / len(sentiments) if sentiments else 0.0
        if score > 0.1:
            label = "POSITIVE"
        elif score < -0.1:
            label = "NEGATIVE"
        else:
            label = "NEUTRAL"

        return {
            "symbol": symbol,
            "score": round(score, 3),
            "label": label,
            "news": news_list
        }

    except Exception as e:
        print("Sentiment Error:", e)
        return {
            "symbol": symbol,
            "score": 0.0,
            "label": "NEUTRAL",
            "news": []
        }


@app.route("/api/dsfm/sentiment/<symbol>")
def api_dsfm_sentiment(symbol):
    return jsonify(get_dynamic_sentiment(symbol))


# ===========================================================
#  MOST BOUGHT STOCK (simple proxy)
# ===========================================================
@app.route("/api/most-bought")
def api_most_bought():
    df = read_timeseries()
    if df.empty:
        return jsonify({"most_bought": None})

    last, prev, date = latest_and_prev_prices(df)

    changes = []
    for sym in last.index:
        if pd.isna(last[sym]) or pd.isna(prev[sym]):
            continue
        pct = (last[sym] - prev[sym]) / prev[sym] * 100
        changes.append({
            "symbol": sym,
            "ltp": float(last[sym]),
            "pct_change": round(pct, 2)
        })

    if not changes:
        return jsonify({"most_bought": None})

    df_changes = pd.DataFrame(changes)
    most_bought = df_changes.sort_values("pct_change", ascending=False).iloc[0]

    return jsonify({
        "date": date,
        "symbol": most_bought["symbol"],
        "ltp": most_bought["ltp"],
        "pct_change": most_bought["pct_change"]
    })


# ========= helpers for market insights =========
def _pct_change_over_days(df: pd.DataFrame, sym: str, days: int):
    series = pd.to_numeric(df[sym], errors="coerce").dropna()
    if len(series) <= days:
        return None

    latest = series.iloc[-1]
    past = series.iloc[-(days + 1)]
    if past == 0 or pd.isna(latest) or pd.isna(past):
        return None

    return float((latest - past) / past * 100.0)


@app.route("/api/market-insights")
def api_market_insights():
    df = read_timeseries()
    if df.empty:
        return jsonify({"error": "No data"}), 404

    last, prev, last_date = latest_and_prev_prices(df)
    advancers = decliners = unchanged = 0
    breadth_rows = []

    for sym in last.index:
        if pd.isna(last[sym]) or pd.isna(prev[sym]):
            continue

        change = last[sym] - prev[sym]
        pct = (change / prev[sym]) * 100.0 if prev[sym] != 0 else 0.0

        if change > 0:
            advancers += 1
        elif change < 0:
            decliners += 1
        else:
            unchanged += 1

        breadth_rows.append({"symbol": sym, "pct_change": pct})

    adv_decl_ratio = (advancers / decliners) if decliners != 0 else None

    sector_stats = {}
    for row in breadth_rows:
        sym = row["symbol"]
        pct = row["pct_change"]
        sector = sym.split("_", 1)[0] if "_" in sym else "OTHER"

        if sector not in sector_stats:
            sector_stats[sector] = {
                "sector": sector,
                "advancers": 0,
                "decliners": 0,
                "unchanged": 0,
                "sum_pct_change": 0.0,
                "count": 0,
            }

        stat = sector_stats[sector]
        if pct > 0:
            stat["advancers"] += 1
        elif pct < 0:
            stat["decliners"] += 1
        else:
            stat["unchanged"] += 1

        stat["sum_pct_change"] += pct
        stat["count"] += 1

    sectors = []
    for sec, stat in sector_stats.items():
        avg_move = stat["sum_pct_change"] / stat["count"] if stat["count"] > 0 else 0.0
        sectors.append({
            "sector": sec,
            "advancers": stat["advancers"],
            "decliners": stat["decliners"],
            "unchanged": stat["unchanged"],
            "avg_move": round(avg_move, 2),
        })

    price_cols = [c for c in df.columns if c != "Date"]
    momentum_rows = []

    for sym in price_cols:
        pct_5d = _pct_change_over_days(df, sym, 5)
        pct_20d = _pct_change_over_days(df, sym, 20)
        if pct_5d is None or pct_20d is None:
            continue

        score = 2 * pct_5d + pct_20d
        momentum_rows.append({
            "symbol": sym,
            "pct_5d": round(pct_5d, 2),
            "pct_20d": round(pct_20d, 2),
            "momentum_score": round(score, 2),
        })

    momentum_rows = sorted(momentum_rows, key=lambda x: x["momentum_score"], reverse=True)[:10]

    return jsonify({
        "date": last_date,
        "breadth": {
            "advancers": advancers,
            "decliners": decliners,
            "unchanged": unchanged,
            "adv_decl_ratio": adv_decl_ratio,
        },
        "sectors": sectors,
        "momentum": momentum_rows,
    })


# ===========================================================
#  FINAL DECISION ENGINE (history + ARIMA/SARIMA/GARCH + sentiment)
# ===========================================================
@app.route("/api/dsfm/decision/<symbol>")
def api_dsfm_decision(symbol):
    forecast = forecast_models(symbol)
    if not forecast:
        return jsonify({"error": "No forecast"}), 404

    sentiment = get_dynamic_sentiment(symbol)
    s_label = sentiment["label"]
    direction = forecast["direction"]

    # History for last ~800 days
    history_df = get_price_series(symbol).tail(800)
    history = [
        {"date": d.strftime("%Y-%m-%d"), "price": float(p)}
        for d, p in zip(history_df["Date"], history_df["Price"])
    ]

    # Simple rule
    if direction == "UP" and s_label == "POSITIVE":
        signal = "BUY"
    elif direction == "UP" and s_label == "NEGATIVE":
        signal = "WAIT"
    elif direction == "DOWN" and s_label == "NEGATIVE":
        signal = "AVOID"
    else:
        signal = "HOLD"

    return jsonify({
        "symbol": symbol,
        "signal": signal,
        "forecast_direction": direction,
        "sentiment_label": s_label,
        "sentiment_score": sentiment["score"],
        "news": sentiment.get("news", []),

        "forecast": forecast["arima"],        # main forecast
        "forecast_arima": forecast["arima"],
        "forecast_sarima": forecast["sarima"],
        "forecast_garch": forecast["garch"],
        "history": history,
    })


# ===========================================================
#  DSFM ANALYSIS ENDPOINTS
# ===========================================================

@app.route("/api/dsfm/available-symbols")
def api_dsfm_available_symbols():
    """Get list of available symbols from market data CSV."""
    try:
        df = read_timeseries()
        if df.empty:
            return jsonify({"symbols": []})
        
        # Get all columns except Date
        symbols = [col for col in df.columns if col != "Date" and not df[col].isna().all()]
        
        # Create display names (remove prefix)
        symbol_list = []
        for sym in symbols:
            # Extract the main symbol name (after last underscore or hyphen)
            display_name = sym.split("_")[-1].split("-")[-1]
            symbol_list.append({
                "value": sym,
                "display": display_name,
                "full": sym
            })
        
        return jsonify({
            "symbols": symbol_list,
            "total": len(symbol_list)
        })
    except Exception as e:
        return jsonify({"error": str(e), "symbols": []}), 500


def find_symbol_in_data(symbol):
    """Find matching symbol in CSV columns, handles various formats."""
    df = read_timeseries()
    if df.empty:
        return None
    
    # Direct match
    if symbol in df.columns:
        return symbol
    
    # Try uppercase
    symbol_upper = symbol.upper()
    for col in df.columns:
        if col.upper() == symbol_upper:
            return col
    
    # Try matching after underscore (e.g., ASIANPAINT matches CDUR_ASIANPAINT)
    symbol_clean = symbol.replace("_", "").replace("-", "").upper()
    for col in df.columns:
        col_clean = col.replace("_", "").replace("-", "").upper()
        if symbol_clean in col_clean or col_clean.endswith(symbol_clean):
            return col
    
    # Try partial match (symbol at end)
    for col in df.columns:
        if col.endswith(symbol) or col.endswith(f"_{symbol}") or col.endswith(f"-{symbol}"):
            return col
    
    return None


def read_sentiment_data():
    """Read sentiment CSV file."""
    if not os.path.exists(SENTIMENT_CSV):
        return pd.DataFrame()
    try:
        df = pd.read_csv(SENTIMENT_CSV)
        return df
    except Exception as e:
        print(f"Error reading sentiment data: {e}")
        return pd.DataFrame()


@app.route("/api/dsfm/garch-analysis/<symbol>")
def api_dsfm_garch_analysis(symbol):
    """GARCH analysis for volatility forecasting."""
    try:
        # Find the actual symbol in CSV
        actual_symbol = find_symbol_in_data(symbol)
        if not actual_symbol:
            return jsonify({"error": f"Symbol '{symbol}' not found in data. Available symbols can be fetched from /api/dsfm/available-symbols"}), 404
        
        s = get_price_series(actual_symbol)
        if s.empty or len(s) < 100:
            return jsonify({"error": f"Insufficient data for symbol '{actual_symbol}' (need at least 100 data points, got {len(s)})"}), 404

        prices = s["Price"].values
        
        # Remove any NaN or infinite values
        prices = prices[~np.isnan(prices)]
        prices = prices[np.isfinite(prices)]
        
        if len(prices) < 100:
            return jsonify({"error": f"Insufficient valid data for symbol '{actual_symbol}' (need at least 100 valid data points, got {len(prices)})"}), 404
        
        # Calculate log returns using numpy (since prices is already a numpy array)
        log_prices = np.log(prices)
        returns = np.diff(log_prices)  # numpy diff instead of pandas diff
        returns = returns[~np.isnan(returns)]
        returns = returns[np.isfinite(returns)]
        
        if len(returns) < 50:
            return jsonify({"error": f"Insufficient returns data for symbol '{actual_symbol}' (need at least 50 returns, got {len(returns)})"}), 404
        
        # Check for constant returns (variance = 0)
        if np.std(returns) == 0 or np.var(returns) == 0:
            return jsonify({"error": f"Constant returns detected for symbol '{actual_symbol}' - cannot fit GARCH model"}), 400

        # Scale returns for GARCH (multiply by 100 for better numerical stability)
        returns_scaled = returns * 100

        # Fit GARCH(1,1) model
        try:
            # Ensure returns are a numpy array and not a pandas Series
            if hasattr(returns_scaled, 'values'):
                returns_scaled = returns_scaled.values
            
            # Convert to 1D array if needed
            returns_scaled = np.asarray(returns_scaled).flatten()
            
            # Remove any remaining NaN or inf
            returns_scaled = returns_scaled[np.isfinite(returns_scaled)]
            
            if len(returns_scaled) < 50:
                return jsonify({"error": f"Insufficient valid returns after cleaning (got {len(returns_scaled)})"}), 400
            
            # Create GARCH model
            garch_mod = arch_model(returns_scaled, vol="Garch", p=1, q=1, mean="Zero")
            
            # Fit the model - try with different options
            try:
                garch_fit = garch_mod.fit(disp="off")
            except:
                # If that fails, try with different options
                try:
                    garch_fit = garch_mod.fit(disp="off", options={'maxiter': 100})
                except Exception as fit_err:
                    return jsonify({
                        "error": f"GARCH model fitting failed: {str(fit_err)}",
                        "returns_length": len(returns_scaled),
                        "returns_std": float(np.std(returns_scaled)),
                        "returns_mean": float(np.mean(returns_scaled))
                    }), 500
        except Exception as fit_error:
            import traceback
            error_details = traceback.format_exc()
            print(f"GARCH Model Creation Error: {error_details}")
            return jsonify({
                "error": f"GARCH model creation failed: {str(fit_error)}",
                "returns_length": len(returns_scaled) if 'returns_scaled' in locals() else 0
            }), 500

        # Forecast next 30 days
        try:
            forecast = garch_fit.forecast(horizon=30, reindex=False)
            forecast_variance = forecast.variance.values[-1]
            
            # Handle different forecast output formats
            if isinstance(forecast_variance, np.ndarray):
                if forecast_variance.ndim > 1:
                    forecast_variance = forecast_variance.flatten()
                forecast_volatility = np.sqrt(forecast_variance) / 100
            else:
                forecast_volatility = np.array([np.sqrt(float(forecast_variance)) / 100] * 30)
            
            # Ensure it's a list of floats
            forecast_volatility = [float(v) for v in forecast_volatility]
        except Exception as forecast_error:
            import traceback
            error_details = traceback.format_exc()
            print(f"GARCH Forecast Error: {error_details}")
            return jsonify({
                "error": f"GARCH forecast failed: {str(forecast_error)}",
                "details": error_details if app.debug else None
            }), 500

        # Get model parameters
        try:
            if hasattr(garch_fit, 'params'):
                if hasattr(garch_fit.params, 'to_dict'):
                    params = garch_fit.params.to_dict()
                else:
                    # Fallback: extract from params directly
                    params = {}
                    for key in garch_fit.params.index:
                        params[str(key)] = float(garch_fit.params[key])
            else:
                return jsonify({"error": "GARCH fit object has no 'params' attribute"}), 500
        except Exception as param_error:
            import traceback
            error_details = traceback.format_exc()
            print(f"Parameter Extraction Error: {error_details}")
            return jsonify({
                "error": f"Failed to extract GARCH parameters: {str(param_error)}",
                "details": error_details if app.debug else None
            }), 500

        return jsonify({
            "symbol": symbol,
            "actual_symbol": actual_symbol,
            "model_type": "GARCH(1,1)",
            "parameters": {
                "omega": float(params.get("omega", 0)),
                "alpha[1]": float(params.get("alpha[1]", 0)),
                "beta[1]": float(params.get("beta[1]", 0))
            },
            "current_volatility": float(np.std(returns)),
            "forecast_volatility": forecast_volatility,
            "aic": float(garch_fit.aic) if hasattr(garch_fit, 'aic') and garch_fit.aic is not None else None,
            "bic": float(garch_fit.bic) if hasattr(garch_fit, 'bic') and garch_fit.bic is not None else None,
            "data_points": len(prices),
            "returns_count": len(returns),
            "returns_std": float(np.std(returns)),
            "returns_mean": float(np.mean(returns))
        })
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"GARCH Analysis Error for {symbol}: {str(e)}")
        print(error_trace)
        return jsonify({"error": f"GARCH analysis failed: {str(e)}", "details": error_trace if app.debug else None}), 500


@app.route("/api/dsfm/finbert-analysis")
def api_dsfm_finbert_analysis():
    """FinBERT sentiment analysis on sentiment CSV."""
    try:
        df = read_sentiment_data()
        if df.empty:
            return jsonify({
                "error": "No sentiment data available",
                "message": "The sentiment_sample.csv file is empty or could not be read"
            }), 404
        
        # Check if required columns exist
        if "symbol" not in df.columns or "headline" not in df.columns:
            return jsonify({
                "error": "Invalid CSV format",
                "message": "The sentiment CSV must have 'symbol' and 'headline' columns",
                "available_columns": list(df.columns)
            }), 400

        results = []
        
        # Group by symbol
        for symbol, group in df.groupby("symbol"):
            # Filter out empty headlines
            headlines = [h for h in group["headline"].dropna().tolist() if h and str(h).strip()]
            
            if not headlines:
                continue
            
            # Use FinBERT if available, otherwise TextBlob
            if FINBERT_AVAILABLE:
                try:
                    # Load FinBERT model (using a financial sentiment model)
                    # Note: First run will download the model (~500MB)
                    tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
                    model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
                    
                    sentiments = []
                    # Process all headlines (no limit for complete analysis)
                    for headline in headlines:
                        try:
                            inputs = tokenizer(str(headline), return_tensors="pt", truncation=True, max_length=512)
                            outputs = model(**inputs)
                            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                            # FinBERT: 0=positive, 1=negative, 2=neutral
                            sentiment_score = float(probs[0][0] - probs[0][1])  # positive - negative
                            sentiments.append(sentiment_score)
                        except Exception as e:
                            # Fallback to TextBlob for this headline
                            try:
                                sentiment_score = TextBlob(str(headline)).sentiment.polarity
                                sentiments.append(sentiment_score)
                            except:
                                continue
                    
                    avg_sentiment = np.mean(sentiments) if sentiments else 0.0
                except Exception as e:
                    print(f"FinBERT error, using TextBlob: {e}")
                    try:
                        sentiments = [TextBlob(str(h)).sentiment.polarity for h in headlines if h]
                        avg_sentiment = np.mean(sentiments) if sentiments else 0.0
                    except Exception as e2:
                        print(f"TextBlob error: {e2}")
                        avg_sentiment = 0.0
            else:
                try:
                    sentiments = [TextBlob(str(h)).sentiment.polarity for h in headlines if h]
                    avg_sentiment = np.mean(sentiments) if sentiments else 0.0
                except Exception as e:
                    print(f"TextBlob error: {e}")
                    avg_sentiment = 0.0

            label = "POSITIVE" if avg_sentiment > 0.1 else ("NEGATIVE" if avg_sentiment < -0.1 else "NEUTRAL")
            
            results.append({
                "symbol": symbol,
                "headline_count": len(headlines),
                "avg_sentiment": round(avg_sentiment, 3),
                "sentiment_label": label,
                "headlines": headlines[:10]  # First 10 headlines for display
            })

        if not results:
            return jsonify({
                "error": "No valid sentiment data found",
                "message": "All headlines were empty or invalid"
            }), 404
        
        return jsonify({
            "analysis_type": "FinBERT" if FINBERT_AVAILABLE else "TextBlob",
            "results": results,
            "total_symbols": len(results)
        })
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"FinBERT Analysis Error: {str(e)}")
        print(error_trace)
        return jsonify({
            "error": f"FinBERT analysis failed: {str(e)}",
            "details": error_trace if app.debug else None
        }), 500


@app.route("/api/dsfm/lstm-analysis/<symbol>")
def api_dsfm_lstm_analysis(symbol):
    """LSTM time series forecasting."""
    try:
        # Find the actual symbol in CSV
        actual_symbol = find_symbol_in_data(symbol)
        if not actual_symbol:
            return jsonify({"error": f"Symbol '{symbol}' not found in data"}), 404
        
        s = get_price_series(actual_symbol)
        if s.empty or len(s) < 100:
            return jsonify({"error": f"Insufficient data for symbol '{actual_symbol}'"}), 404

        prices = s["Price"].values
        
        if not LSTM_AVAILABLE:
            return jsonify({
                "error": "LSTM not available",
                "message": "TensorFlow/Keras not installed. Using simple forecast instead.",
                "symbol": symbol,
                "forecast": [float(prices[-1])] * 30
            }), 200

        # Prepare data for LSTM
        def create_sequences(data, seq_length=60):
            X, y = [], []
            for i in range(len(data) - seq_length):
                X.append(data[i:i+seq_length])
                y.append(data[i+seq_length])
            return np.array(X), np.array(y)

        # Normalize data
        from sklearn.preprocessing import MinMaxScaler
        scaler = MinMaxScaler(feature_range=(0, 1))
        prices_scaled = scaler.fit_transform(prices.reshape(-1, 1)).flatten()

        seq_length = min(60, len(prices_scaled) // 4)
        if len(prices_scaled) < seq_length + 30:
            return jsonify({"error": "Insufficient data for LSTM"}), 404

        X, y = create_sequences(prices_scaled, seq_length)
        
        # Split data
        train_size = int(len(X) * 0.8)
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]

        # Reshape for LSTM
        X_train = X_train.reshape((X_train.shape[0], X_train.shape[1], 1))
        X_test = X_test.reshape((X_test.shape[0], X_test.shape[1], 1))

        # Build LSTM model
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(seq_length, 1)),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse')

        # Train model (use minimal epochs for speed)
        model.fit(X_train, y_train, epochs=10, batch_size=32, verbose=0, validation_split=0.1)

        # Forecast next 30 days
        last_sequence = prices_scaled[-seq_length:].reshape(1, seq_length, 1)
        forecast_scaled = []
        current_seq = last_sequence.copy()

        for _ in range(30):
            next_pred = model.predict(current_seq, verbose=0)
            forecast_scaled.append(next_pred[0, 0])
            # Update sequence
            current_seq = np.append(current_seq[:, 1:, :], next_pred.reshape(1, 1, 1), axis=1)

        # Inverse transform
        forecast = scaler.inverse_transform(np.array(forecast_scaled).reshape(-1, 1)).flatten()

        # Calculate metrics
        train_pred = model.predict(X_train, verbose=0)
        train_pred = scaler.inverse_transform(train_pred)
        train_actual = scaler.inverse_transform(y_train.reshape(-1, 1))
        mse = float(np.mean((train_pred - train_actual) ** 2))
        mae = float(np.mean(np.abs(train_pred - train_actual)))

        return jsonify({
            "symbol": symbol,
            "actual_symbol": actual_symbol,
            "model_type": "LSTM",
            "forecast": [float(p) for p in forecast],
            "forecast_dates": [
                (s["Date"].iloc[-1] + timedelta(days=i+1)).strftime("%Y-%m-%d")
                for i in range(30)
            ],
            "metrics": {
                "mse": mse,
                "mae": mae,
                "rmse": float(np.sqrt(mse))
            },
            "current_price": float(prices[-1]),
            "forecast_price": float(forecast[-1]),
            "expected_change_pct": float((forecast[-1] - prices[-1]) / prices[-1] * 100)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/dsfm/combined-analysis/<symbol>")
def api_dsfm_combined_analysis(symbol):
    """Combined analysis using GARCH, FinBERT, and LSTM."""
    try:
        results = {}
        
        # Find the actual symbol in CSV
        actual_symbol = find_symbol_in_data(symbol)
        if not actual_symbol:
            return jsonify({"error": f"Symbol '{symbol}' not found in data"}), 404
        
        # GARCH Analysis
        try:
            s = get_price_series(actual_symbol)
            if not s.empty and len(s) >= 100:
                prices = s["Price"].values
                # Remove NaN and infinite values
                prices = prices[~np.isnan(prices)]
                prices = prices[np.isfinite(prices)]
                
                if len(prices) < 100:
                    results["garch"] = {"error": "Insufficient valid data"}
                else:
                    # Calculate log returns using numpy diff
                    log_prices = np.log(prices)
                    returns = np.diff(log_prices)
                    returns = returns[~np.isnan(returns)]
                    returns = returns[np.isfinite(returns)]
                    
                    if len(returns) < 50 or np.std(returns) == 0:
                        results["garch"] = {"error": "Insufficient or constant returns data"}
                    else:
                        try:
                            garch_mod = arch_model(returns * 100, vol="Garch", p=1, q=1, mean="Zero")
                            garch_fit = garch_mod.fit(disp="off")
                            forecast = garch_fit.forecast(horizon=30, reindex=False)
                            forecast_variance = forecast.variance.values[-1]
                            forecast_volatility = np.sqrt(forecast_variance) / 100
                            params = garch_fit.params.to_dict()
                            results["garch"] = {
                                "model_type": "GARCH(1,1)",
                                "current_volatility": float(np.std(returns)),
                                "forecast_volatility": [float(v) for v in forecast_volatility] if isinstance(forecast_volatility, np.ndarray) else [float(forecast_volatility)] * 30,
                                "parameters": {
                                    "omega": float(params.get("omega", 0)),
                                    "alpha[1]": float(params.get("alpha[1]", 0)),
                                    "beta[1]": float(params.get("beta[1]", 0))
                                },
                                "aic": float(garch_fit.aic) if hasattr(garch_fit, 'aic') else None,
                                "bic": float(garch_fit.bic) if hasattr(garch_fit, 'bic') else None
                            }
                        except Exception as garch_err:
                            import traceback
                            error_details = traceback.format_exc()
                            print(f"GARCH Error in Combined Analysis: {error_details}")
                            results["garch"] = {"error": f"GARCH fitting failed: {str(garch_err)}"}
            else:
                results["garch"] = {"error": "Insufficient data"}
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"GARCH Analysis Error in Combined: {error_details}")
            results["garch"] = {"error": str(e)}

        # LSTM Analysis
        try:
            s = get_price_series(actual_symbol)
            if not s.empty and len(s) >= 100 and LSTM_AVAILABLE:
                prices = s["Price"].values
                from sklearn.preprocessing import MinMaxScaler
                scaler = MinMaxScaler(feature_range=(0, 1))
                prices_scaled = scaler.fit_transform(prices.reshape(-1, 1)).flatten()
                seq_length = min(60, len(prices_scaled) // 4)
                
                if len(prices_scaled) >= seq_length + 30:
                    def create_sequences(data, seq_len):
                        X, y = [], []
                        for i in range(len(data) - seq_len):
                            X.append(data[i:i+seq_len])
                            y.append(data[i+seq_len])
                        return np.array(X), np.array(y)
                    
                    X, y = create_sequences(prices_scaled, seq_length)
                    train_size = int(len(X) * 0.8)
                    X_train = X[:train_size].reshape((train_size, seq_length, 1))
                    y_train = y[:train_size]
                    
                    model = Sequential([
                        LSTM(50, return_sequences=True, input_shape=(seq_length, 1)),
                        Dropout(0.2),
                        LSTM(50, return_sequences=False),
                        Dropout(0.2),
                        Dense(1)
                    ])
                    model.compile(optimizer='adam', loss='mse')
                    model.fit(X_train, y_train, epochs=5, batch_size=32, verbose=0)
                    
                    last_sequence = prices_scaled[-seq_length:].reshape(1, seq_length, 1)
                    forecast_scaled = []
                    current_seq = last_sequence.copy()
                    for _ in range(30):
                        next_pred = model.predict(current_seq, verbose=0)
                        forecast_scaled.append(next_pred[0, 0])
                        current_seq = np.append(current_seq[:, 1:, :], next_pred.reshape(1, 1, 1), axis=1)
                    
                    forecast = scaler.inverse_transform(np.array(forecast_scaled).reshape(-1, 1)).flatten()
                    results["lstm"] = {
                        "forecast": [float(p) for p in forecast],
                        "current_price": float(prices[-1]),
                        "forecast_price": float(forecast[-1])
                    }
                else:
                    results["lstm"] = {"error": "Insufficient data for LSTM"}
            else:
                results["lstm"] = {"error": "LSTM not available or insufficient data"}
        except Exception as e:
            results["lstm"] = {"error": str(e)}

        # FinBERT Analysis (for this symbol)
        try:
            df = read_sentiment_data()
            symbol_clean = symbol.replace("_", "").upper()
            symbol_variants = [symbol, symbol_clean]
            
            symbol_sentiment = None
            for variant in symbol_variants:
                matching = df[df["symbol"].str.contains(variant, case=False, na=False)]
                if not matching.empty:
                    headlines = matching["headline"].tolist()
                    if FINBERT_AVAILABLE:
                        try:
                            tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
                            model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
                            sentiments = []
                            for h in headlines[:10]:  # Limit to 10 for speed
                                inputs = tokenizer(h, return_tensors="pt", truncation=True, max_length=512)
                                outputs = model(**inputs)
                                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                                sentiment_score = float(probs[0][0] - probs[0][1])
                                sentiments.append(sentiment_score)
                            avg_sentiment = np.mean(sentiments) if sentiments else 0
                        except:
                            sentiments = [TextBlob(h).sentiment.polarity for h in headlines[:10]]
                            avg_sentiment = np.mean(sentiments) if sentiments else 0
                    else:
                        sentiments = [TextBlob(h).sentiment.polarity for h in headlines[:10]]
                        avg_sentiment = np.mean(sentiments) if sentiments else 0
                    
                    symbol_sentiment = {
                        "symbol": symbol,
                        "avg_sentiment": round(avg_sentiment, 3),
                        "sentiment_label": "POSITIVE" if avg_sentiment > 0.1 else ("NEGATIVE" if avg_sentiment < -0.1 else "NEUTRAL"),
                        "headline_count": len(headlines)
                    }
                    break
            
            results["finbert"] = symbol_sentiment if symbol_sentiment else {"error": "No sentiment data for this symbol"}
        except Exception as e:
            results["finbert"] = {"error": str(e)}

        return jsonify({
            "symbol": symbol,
            "actual_symbol": actual_symbol,
            "analyses": results,
            "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===========================================================
#  RUN SERVER
# ===========================================================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
