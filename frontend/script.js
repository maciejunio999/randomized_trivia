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

// Ładowanie pytania
async function loadQuestion() {
  // Blokujemy przycisk i czyścimy poprzednie dane
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

    // Walidacja danych
    if (!data || !data.question || !data.correct_answer || !data.answers) {
      throw new Error(data?.error || "Błąd danych pytania");
    }

    // Reset liczby prób
    retryCount = 0;

    // Ustawienie tekstu przycisku
    if (currentQuestion === totalQuestions - 1) {
      nextBtn.textContent = "Zakończ";
    } else {
      nextBtn.textContent = "Następne pytanie";
    }

    // Dekodujemy pytanie i odpowiedzi
    const decodedQuestion = decodeHTMLEntities(data.question);
    correctAnswer = decodeHTMLEntities(data.correct_answer);
    const answers = data.answers.map(decodeHTMLEntities);
    shuffleArray(answers);

    // Wyświetlamy pytanie i odpowiedzi
    questionText.textContent = decodedQuestion;
    answers.forEach(answer => {
      const btn = document.createElement("button");
      btn.classList.add("answer-btn");
      btn.textContent = answer;
      btn.addEventListener("click", () => handleAnswer(btn, answer));
      answersBox.appendChild(btn);
    });

    // Pokazujemy licznik pytania
    document.getElementById("question-counter").textContent = `Pytanie ${currentQuestion + 1} z ${totalQuestions}`;

    // Odpalamy timer jeśli włączony
    if (timerEnabled) startTimer();

  } catch (err) {
    console.error("Błąd przy pobieraniu pytania:", err.message || err);

    retryCount++;
    if (retryCount < MAX_RETRIES) {
      console.warn(`Ponawiam próbę pobrania pytania... (${retryCount})`);
      return loadQuestion();
    }

    questionText.textContent = "Nie udało się pobrać pytania. 😕";
    nextBtn.disabled = false;
    nextBtn.textContent = currentQuestion + 1 >= totalQuestions ? "Zakończ" : "Następne pytanie";
    document.getElementById("retry-btn").style.display = "inline-block";
    return;
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

  if (!answer) {
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

// Obsługa kliknięcia 'Start'
document.getElementById("start-btn").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;

  document.querySelector(".setup").style.display = "none";
  document.querySelector(".quiz-container").style.display = "block";
  document.getElementById("summary-box").style.display = "none";

  loadQuestion();
});

// Przycisk powrotu do konfiguracji
document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector(".quiz-container").style.display = "none";
  document.querySelector(".setup").style.display = "block";
});

// Przycisk retry (próba ponownego pobrania pytania)
document.getElementById("retry-btn").addEventListener("click", () => {
  loadQuestion();
});

// Przycisk następne pytanie / zakończ quiz
document.getElementById("next-btn").addEventListener("click", () => {
  currentQuestion++;
  if (currentQuestion >= totalQuestions) {
    showSummary();
    return;
  }
  loadQuestion();
});

// Podsumowanie wyniku
function showSummary() {
  document.querySelector(".quiz-container").style.display = "none";
  document.getElementById("summary-box").style.display = "block";

  const resultText = document.getElementById("result-text");
  const percentText = document.getElementById("percent-text");
  resultText.textContent = `Twój wynik: ${score} / ${totalQuestions}`;
  const percent = Math.round((score / totalQuestions) * 100);
  percentText.textContent = `To ${percent}% poprawnych odpowiedzi.`;
}

// Restart quizu z podsumowania
document.getElementById("restart-btn").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;

  document.getElementById("summary-box").style.display = "none";
  document.querySelector(".setup").style.display = "block";
});
