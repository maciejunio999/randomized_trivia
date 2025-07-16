const API_URL = "http://127.0.0.1:8000/quiz";

const questionText = document.getElementById("question-text");
const answersBox = document.getElementById("answers");
const feedback = document.getElementById("feedback");
const nextBtn = document.getElementById("next-btn");

let currentQuestion = 0;
let totalQuestions = 10;
let score = 0;

let timerInterval = null;
let timerEnabled = false;
let timeLeft = 15;

let correctAnswer = "";

let retryCount = 0;
const MAX_RETRIES = 3;

async function loadQuestion() {
  if (currentQuestion >= totalQuestions) {
    showSummary();
    return;
  }

  nextBtn.disabled = true;
  feedback.textContent = "";
  answersBox.innerHTML = "";
  questionText.textContent = "Ładuję pytanie...";
  document.getElementById("timer").textContent = "";
  document.getElementById("retry-btn").style.display = "none";

  timerEnabled = document.getElementById("enable-timer").checked;
  clearInterval(timerInterval);

  const category = document.getElementById("category").value;
  const difficulty = document.getElementById("difficulty").value;

  const url = new URL(API_URL);
  if (category) url.searchParams.append("category", category);
  if (difficulty) url.searchParams.append("difficulty", difficulty);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    console.log("ODEBRANE:", data);

    if (
      data.error ||
      !data.question ||
      !data.correct_answer ||
      !Array.isArray(data.answers) ||
      data.answers.length === 0
    ) {
      throw new Error(data.error || "Błąd danych pytania");
    }

    retryCount = 0;

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

    document.getElementById("question-counter").textContent =
      `Pytanie ${currentQuestion + 1} z ${totalQuestions}`;

    if (timerEnabled) startTimer();

    currentQuestion++;

  } catch (err) {
    console.error("Błąd przy pobieraniu pytania:", err.message || err);

    retryCount++;
    if (retryCount < MAX_RETRIES) {
      console.warn(`Ponawiam próbę pobrania pytania... (${retryCount})`);
      return loadQuestion();
    }

    questionText.textContent = "Nie udało się pobrać pytania. 😕";
    if (currentQuestion + 1 === totalQuestions) {
      nextBtn.textContent = "Zakończ quiz";
    } else {
      nextBtn.textContent = "Następne pytanie";
    }

    document.getElementById("retry-btn").style.display = "inline-block";
  }
}

function handleAnswer(button, answer) {
  clearInterval(timerInterval);

  const allButtons = document.querySelectorAll(".answer-btn");

  allButtons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correctAnswer) {
      btn.classList.add("correct");
    } else if (btn.textContent === answer) {
      btn.classList.add("incorrect");
    }
  });

  if (!answer || answer === "") {
    feedback.textContent = `⏱️ Czas minął! Poprawna odpowiedź to: ${correctAnswer}`;
  } else if (answer === correctAnswer) {
    feedback.textContent = "✅ Dobrze!";
    score++;
  } else {
    feedback.textContent = `❌ Źle! Poprawna odpowiedź to: ${correctAnswer}`;
  }

  nextBtn.disabled = false;
  document.getElementById("timer").textContent = "";
}

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
  currentQuestion = 0;
  score = 0;

  document.querySelector(".setup").style.display = "none";
  document.querySelector(".quiz-container").style.display = "block";
  loadQuestion();
});

document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector(".quiz-container").style.display = "none";
  document.querySelector(".setup").style.display = "block";
});

function startTimer() {
  nextBtn.disabled = true;
  timeLeft = 15;
  const timerDisplay = document.getElementById("timer");
  timerDisplay.textContent = `Pozostało: ${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `Pozostało: ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleAnswer(null, "");
    }
  }, 1000);
}

nextBtn.addEventListener("click", () => {
  if (nextBtn.textContent === "Zakończ quiz") {
    showSummary();
  } else {
    loadQuestion();
  }
});

document.getElementById("retry-btn").addEventListener("click", () => {
  loadQuestion();
});

function showSummary() {
  const quizBox = document.querySelector(".quiz");
  if (!quizBox) {
    console.error("Brakuje elementu .quiz na stronie!");
    return;
  }

  quizBox.innerHTML = `
    <h2>Koniec quizu!</h2>
    <p>Twój wynik: ${score} / ${totalQuestions}</p>
    <button onclick="restartQuiz()">Zagraj ponownie</button>
  `;
}


function restartQuiz() {
  currentQuestion = 0;
  score = 0;
  document.getElementById("setup").style.display = "block";
  document.querySelector(".quiz").style.display = "none";
}
