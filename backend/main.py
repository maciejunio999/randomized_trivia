from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

# CORS dla frontendu
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # możesz ograniczyć np. do ["http://localhost:5500"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/quiz")
def get_question():
    response = requests.get("https://opentdb.com/api.php?amount=1&type=multiple")
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
