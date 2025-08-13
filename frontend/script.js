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

let testMode = false;

// Ładowanie pytania
async function loadQuestion() {
  // Blokujemy przycisk i czyścimy poprzednie dane
  nextBtn.disabled = true;
  feedback.textContent = "";
  answersBox.innerHTML = "";
  questionText.textContent = "Ładuję pytanie...";
  document.getElementById("timer").textContent = "";
  document.getElementById("retry-btn").style.display = "none";

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

    const progressPercent = Math.round((currentQuestion + 1) / totalQuestions * 100);
    document.getElementById("progress-fill").style.width = `${progressPercent}%`;

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
  });

  if (!testMode) {
    allButtons.forEach(btn => {
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      } else if (btn.textContent === answer) {
        btn.classList.add("incorrect");
      }
    });
  }

  if (!answer) {
    if (!testMode) {
      feedback.textContent = `⏱️ Czas minął! Poprawna odpowiedź to: ${correctAnswer}`;
    }
    document.getElementById("wrong-sound").play();
  } else if (answer === correctAnswer) {
    if (!testMode) {
      feedback.textContent = "✅ Dobrze!";
    }
    score++;
    if (!testMode) document.getElementById("correct-sound").play();
  } else {
    if (!testMode) {
      feedback.textContent = `❌ Źle! Poprawna odpowiedź to: ${correctAnswer}`;
    }
    if (!testMode) document.getElementById("wrong-sound").play();
  }

  const scoreCounter = document.getElementById("score-counter");
  if (!testMode) {
    scoreCounter.textContent = `Wynik: ${score} pkt`;
    scoreCounter.style.display = "block";
  } else {
    scoreCounter.style.display = "none";
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
  nextBtn.disabled = true;const userTime = parseInt(document.getElementById("time-limit")?.value);
  timeLeft = userTime > 0 ? userTime : 15;
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

  // Pobierz wartości z formularza
  const countInput = document.getElementById("question-count").value;
  const timeInput = document.getElementById("time-limit").value;

  totalQuestions = Math.max(1, parseInt(countInput) || 10); // domyślnie 10
  timeLeft = Math.max(5, parseInt(timeInput) || 15);         // domyślnie 15

  timerEnabled = document.getElementById("enable-timer")?.checked || false;
  testMode = document.getElementById("test-mode")?.checked || false;

  document.querySelector(".setup").style.display = "none";
  document.querySelector(".quiz-container").style.display = "block";

  document.getElementById("progress-fill").style.width = "0%";

  document.getElementById("score-counter").textContent = "Wynik: 0 pkt";
  const scoreCounter = document.getElementById("score-counter");
  scoreCounter.textContent = "Wynik: 0 pkt";
  scoreCounter.style.display = testMode ? "none" : "block";

  loadQuestion();
});


// Przycisk powrotu do konfiguracji
document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector(".quiz-container").style.display = "none";
  document.querySelector(".setup").style.display = "block";
  document.getElementById("score-counter").style.display = "none";
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
  const commentText = document.getElementById("comment-text");  // <-- dodany element

  const percent = Math.round((score / totalQuestions) * 100);
  resultText.textContent = `Twój wynik: ${score} / ${totalQuestions}`;
  percentText.textContent = `To ${percent}% poprawnych odpowiedzi.`;

  // Komentarz na podstawie wyniku
  let comment = "";
  if (percent <= 30) {
    comment = "Musisz jeszcze poćwiczyć! 💡";
  } else if (percent <= 60) {
    comment = "Nieźle, ale stać Cię na więcej! 🙂";
  } else if (percent <= 90) {
    comment = "Świetny wynik! 💪";
  } else {
    comment = "Mistrz! 👑";
  }

  commentText.textContent = comment;
}

// Restart quizu z podsumowania
document.getElementById("restart-btn").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;

  document.getElementById("score-counter").style.display = "none";
  document.getElementById("summary-box").style.display = "none";
  document.querySelector(".setup").style.display = "block";
});

// dynamiczne pokazywanie pola limitu czasu
document.getElementById("enable-timer").addEventListener("change", (e) => {
  const timeContainer = document.getElementById("time-container");
  timeContainer.style.display = e.target.checked ? "block" : "none";
});
