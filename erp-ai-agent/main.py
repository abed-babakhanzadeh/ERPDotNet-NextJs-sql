from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.services.agent_runner import run_agent
import uvicorn

app = FastAPI()

# --- بلاک کردن IP مزاحم ---
@app.middleware("http")
async def block_annoying_ip(request: Request, call_next):
    if request.client.host == "192.168.0.233":
        # بلافاصله ارتباط را قطع کن و لاگ نریز (یا یک پاسخ خالی بده)
        return Response(content="Blocked", status_code=403)
    response = await call_next(request)
    return response

# --- تنظیمات CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    response = run_agent(req.message)
    return {"response": response}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)