from fastapi import FastAPI

app = FastAPI(title="UNILIA AI Helpdesk API")

@app.get("/")
def home():
    return {"message": "UNILIA Helpdesk backend is running"}