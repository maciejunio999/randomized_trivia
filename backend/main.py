from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/quiz")
def get_question(category: int = Query(None), difficulty: str = Query(None)):
    base_url = "https://opentdb.com/api.php?amount=1&type=multiple"

    if category:
        base_url += f"&category={category}"
    if difficulty:
        base_url += f"&difficulty={difficulty}"

    response = requests.get(base_url)
    data = response.json()

    if data["response_code"] != 0:
        return {"error": "Brak pytania"}

    question_data = data["results"][0]
    return {
        "question": question_data["question"],
        "correct_answer": question_data["correct_answer"],
        "answers": question_data["incorrect_answers"] + [question_data["correct_answer"]],
        "category": question_data["category"],
        "difficulty": question_data["difficulty"]
    }

# uvicorn main:app --reload