const API_URL = "http://127.0.0.1:8000/quiz";

const questionText = document.getElementById("question-text");
const answersBox = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const nextBtn = document.getElementById("next-btn");

let correctAnswer = "";

async function loadQuestion() {
  nextBtn.disabled = true;
  feedback.textContent = "";
  answersBox.innerHTML = "";
  questionText.textContent = "Ładuję pytanie...";

  const category = document.getElementById("category").value;
  const difficulty = document.getElementById("difficulty").value;

  const url = new URL(API_URL);
  if (category) url.searchParams.append("category", category);
  if (difficulty) url.searchParams.append("difficulty", difficulty);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.error) {
      questionText.textContent = "Nie udało się pobrać pytania.";
      return;
    }

    const decodedQuestion = decodeHTMLEntities(data.question);
    correctAnswer = decodeHTMLEntities(data.correct_answer);
    const answers = data.answers.map(decodeHTMLEntities);
    shuffleArray(answers);

    questionText.textContent = decodedQuestion;

    answers.forEach(answer => {
      const btn = document.createElement("button");
      btn.classList.add("answer-btn");
      btn.textContent = answer;
      btn.addEventListener("click", () => handleAnswer(btn, answer));
      answersBox.appendChild(btn);
    });

  } catch (err) {
    questionText.textContent = "Wystąpił błąd.";
    console.error(err);
  }
}

function handleAnswer(button, answer) {
  const allButtons = document.querySelectorAll(".answer-btn");

  allButtons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correctAnswer) {
      btn.classList.add("correct");
    } else if (btn.textContent === answer) {
      btn.classList.add("incorrect");
    }
  });

  feedback.textContent = answer === correctAnswer ? "✅ Dobrze!" : `❌ Źle! Poprawna odpowiedź to: ${correctAnswer}`;
  nextBtn.disabled = false;
}

nextBtn.addEventListener("click", () => {
  loadQuestion();
});

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function decodeHTMLEntities(text) {
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
}

document.getElementById("start-btn").addEventListener("click", () => {
  document.querySelector(".setup").style.display = "none";
  document.querySelector(".quiz-container").style.display = "block";
  loadQuestion();
});

document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector(".quiz-container").style.display = "none";
  document.querySelector(".setup").style.display = "block";
});
