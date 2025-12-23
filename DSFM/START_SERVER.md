# How to Start the Backend Server

## Quick Start

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install required dependencies (if not already installed):**
   ```bash
   pip install flask flask-cors pandas numpy statsmodels arch pmdarima textblob python-dotenv requests
   ```

   For LSTM support (optional):
   ```bash
   pip install tensorflow scikit-learn
   ```

   For FinBERT support (optional):
   ```bash
   pip install transformers torch
   ```

3. **Start the Flask server:**
   ```bash
   python app.py
   ```

   Or from the project root:
   ```bash
   python backend/app.py
   ```

4. **The server will start on:** `http://localhost:8000`

5. **Open the frontend:** Open `dsfm.html` in your browser

## Troubleshooting

- **Port 8000 already in use:** Change the port in `backend/app.py` (line 1129) or stop the process using port 8000
- **Module not found:** Install missing dependencies using pip
- **CSV file not found:** Ensure `market_data.csv` and `sentiment_sample.csv` are in `backend/data/` directory

## Testing the API

Once the server is running, you can test it:
- Open: http://localhost:8000/api/dsfm/available-symbols
- Should return a JSON list of available symbols

