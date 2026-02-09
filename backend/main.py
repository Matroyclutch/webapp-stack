import os
import smtplib
import socket
from email.message import EmailMessage
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
GEN_MODEL = os.getenv("OLLAMA_GEN_MODEL", "llama3.2:1b-instruct-q3_K_L")
CODE_MODEL = os.getenv("OLLAMA_CODE_MODEL", "qwen2.5-coder:0.5b-instruct")
MAIL_TO = os.getenv("MAIL_TO", "mat.roy@clutch.ca")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "").replace(" ", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@example.com")
SMTP_DRY_RUN = os.getenv("SMTP_DRY_RUN", "false").lower() in {"1", "true", "yes"}
SMTP_TIMEOUT = float(os.getenv("SMTP_TIMEOUT", "20"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

if CORS_ORIGINS.strip() == "*":
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
)
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")


@app.get("/")
async def root() -> FileResponse:
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    return FileResponse(index_path)


class ChatRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "general"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
async def chat(req: ChatRequest) -> dict[str, Any]:
    model = CODE_MODEL if (req.mode or "general") == "code" else GEN_MODEL

    payload = {
        "model": model,
        "prompt": req.prompt,
        "stream": False,
        "options": {"temperature": 0.2 if model == CODE_MODEL else 0.7},
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(f"{OLLAMA_HOST}/api/generate", json=payload)
        r.raise_for_status()
        data = r.json()

    return {"model": model, "response": data.get("response", "")}


def _send_email(
    subject: str,
    body: str,
    attachments: list[tuple[str, str, bytes]],
) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = MAIL_TO
    msg.set_content(body)

    for filename, content_type, data in attachments:
        if not data:
            continue
        maintype, subtype = "application", "octet-stream"
        if content_type and "/" in content_type:
            maintype, subtype = content_type.split("/", 1)
        msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=filename)

    if SMTP_DRY_RUN:
        print("SMTP_DRY_RUN enabled. Email not sent.")
        print(body)
        return

    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("SMTP credentials are not set")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    except (smtplib.SMTPException, socket.timeout) as exc:
        raise RuntimeError(f"SMTP send failed: {exc}") from exc


@app.post("/submit")
async def submit_arbitration(
    dealerName: str = Form(...),
    dealerAcct: str = Form(...),
    contactName: str = Form(...),
    contactEmail: str = Form(...),
    contactPhone: str = Form(...),
    vin: str = Form(...),
    stockNumber: str = Form(""),
    purchaseDate: str = Form(...),
    pickupDate: str = Form(...),
    odometerReading: str = Form(...),
    salePrice: str = Form(...),
    claimType: str = Form(...),
    defectArea: str = Form(...),
    repairCost: str = Form(...),
    defectDescription: str = Form(...),
    signature: str = Form(...),
    files: list[UploadFile] = File(default=[]),
) -> dict[str, Any]:
    body = "\n".join(
        [
            "Clutch Arbitration Request",
            "",
            f"Dealer Name: {dealerName}",
            f"Dealer Account #: {dealerAcct}",
            f"Primary Contact: {contactName}",
            f"Contact Email: {contactEmail}",
            f"Contact Phone: {contactPhone}",
            "",
            f"VIN: {vin}",
            f"Stock/Lot #: {stockNumber}",
            f"Purchase Date: {purchaseDate}",
            f"Pickup Date: {pickupDate}",
            f"Odometer: {odometerReading}",
            f"Sale Price: {salePrice}",
            "",
            f"Claim Type: {claimType}",
            f"Defect Area: {defectArea}",
            f"Repair Cost: {repairCost}",
            "Description:",
            defectDescription,
            "",
            f"Signature: {signature}",
        ]
    )

    subject = f"Arbitration Request - {dealerName} - {vin}"
    attachments: list[tuple[str, str, bytes]] = []
    for f in files:
        data = await f.read()
        attachments.append((f.filename or "attachment", f.content_type or "", data))

    try:
        _send_email(subject, body, attachments)
    except Exception as exc:
        # Return a JSON error so browsers can read it (avoids CORS "Failed to fetch")
        return JSONResponse(
            status_code=502,
            content={"status": "error", "message": str(exc)},
        )

    return {"status": "ok"}
