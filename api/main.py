from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal
import random

app = FastAPI(title="Silent Wallet API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MOCK_PRICES = {
    "ETH": 3824.50,
    "BTC": 67420.00,
    "BNB": 412.30,
    "USDC": 1.00,
}


class SendRequest(BaseModel):
    from_address: str
    to_address: str
    asset: str
    amount: float
    network: Literal["ethereum", "bitcoin", "bsc"]


class SendResponse(BaseModel):
    success: bool
    tx_hash: str
    gas_used: float
    fee_usd: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/prices")
def get_prices():
    return {
        symbol: price * (1 + random.uniform(-0.001, 0.001))
        for symbol, price in MOCK_PRICES.items()
    }


@app.get("/balance/{address}")
def get_balance(address: str):
    return {
        "address": address,
        "assets": [
            {"symbol": "ETH", "network": "ethereum", "balance": 2.481},
            {"symbol": "BTC", "network": "bitcoin", "balance": 0.08234},
            {"symbol": "BNB", "network": "bsc", "balance": 14.72},
            {"symbol": "USDC", "network": "ethereum", "balance": 1240.0},
        ],
    }


@app.post("/send", response_model=SendResponse)
def send_transaction(req: SendRequest):
    fake_hash = "0x" + "".join(random.choices("0123456789abcdef", k=64))
    return SendResponse(
        success=True,
        tx_hash=fake_hash,
        gas_used=21000,
        fee_usd=round(random.uniform(0.8, 2.5), 4),
    )


@app.get("/transactions/{address}")
def get_transactions(address: str, limit: int = 20):
    return {"address": address, "transactions": [], "total": 0}
