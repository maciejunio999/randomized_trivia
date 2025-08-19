const API_URL = "http://127.0.0.1:8000/quiz";

// UI elements
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
let testMode = false;

let retryCount = 0;
const MAX_RETRIES = 3;

const darkModeToggle = document.getElementById("dark-mode-toggle");
const modeLabel = document.getElementById("mode-label");
let learnMode = false;

// Fetch and display a question
async function loadQuestion() {
  nextBtn.disabled = true;
  feedback.textContent = "";
  answersBox.innerHTML = "";
  questionText.textContent = "Loading question...";
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

    // Validate question data
    if (!data || !data.question || !data.correct_answer || !data.answers) {
      throw new Error(data?.error || "Invalid question data");
    }

    retryCount = 0;

    nextBtn.textContent = currentQuestion === totalQuestions - 1 ? "Finish" : "Next Question";

    // Decode question and answers
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

    document.getElementById("question-counter").textContent = `Question ${currentQuestion + 1} of ${totalQuestions}`;
    if (timerEnabled) startTimer();

    const progressPercent = Math.round((currentQuestion + 1) / totalQuestions * 100);
    document.getElementById("progress-fill").style.width = `${progressPercent}%`;

  } catch (err) {
    console.error("Error loading question:", err.message || err);
    retryCount++;

    if (retryCount < MAX_RETRIES) {
      return loadQuestion();
    }

    questionText.textContent = "Failed to load question. 😕";
    nextBtn.disabled = false;
    nextBtn.textContent = currentQuestion + 1 >= totalQuestions ? "Finish" : "Next Question";
    document.getElementById("retry-btn").style.display = "inline-block";
    return;
  }
}


// Handle user's answer selection
function handleAnswer(button, answer) {
  if (!button || button.disabled) return;

  const allButtons = document.querySelectorAll(".answer-btn");
  clearInterval(timerInterval);

  // If correct
  if (answer === correctAnswer) {
    button.classList.add("correct");

    // Play success sound only if not in learn mode
    if (!learnMode) {
      document.getElementById("correct-sound").play();
    }

    // Disable all buttons
    allButtons.forEach(btn => btn.disabled = true);

    nextBtn.disabled = false;
    feedback.textContent = "✅ Correct!";
    if (!testMode && !learnMode) {
      score++;
      document.getElementById("score-counter").textContent = `Score: ${score} pts`;
    }
    document.getElementById("timer").textContent = "";
    return;
  }

  // If incorrect
  button.classList.add("incorrect");
  button.disabled = true;
  document.getElementById("wrong-sound").play();

  if (learnMode) {
    const remaining = [...allButtons].filter(btn => !btn.disabled);
    if (remaining.length === 1) {
      const lastBtn = remaining[0];
      lastBtn.disabled = true;

      if (lastBtn.textContent === correctAnswer) {
        lastBtn.classList.add("correct");
        // Don't play any sound here – user didn't actively choose the correct answer
        feedback.textContent = "❌ All options tried!";
      } else {
        lastBtn.classList.add("incorrect");
        document.getElementById("wrong-sound").play();  // optional
        feedback.textContent = "❌ All options tried!";
      }

      nextBtn.disabled = false;
    } else {
      feedback.textContent = "❌ Try again!";
    }
  } else {
    // Standard test or quiz mode
    allButtons.forEach(btn => {
      btn.disabled = true;
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct");
      }
    });
    if (!testMode) {
      feedback.textContent = `❌ Wrong! Correct answer: ${correctAnswer}`;
    }
    nextBtn.disabled = false;
    if (!testMode) document.getElementById("wrong-sound").play();
    if (!testMode && !learnMode) {
      document.getElementById("score-counter").textContent = `Score: ${score} pts`;
    }
  }

  document.getElementById("timer").textContent = "";
}


// Utility: Shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Utility: Decode HTML entities (e.g. &amp;)
function decodeHTMLEntities(text) {
  const txt = document.createElement("textarea");
  txt.innerHTML = text;
  return txt.value;
}

// Timer countdown logic
function startTimer() {
  nextBtn.disabled = true;
  const userTime = parseInt(document.getElementById("time-limit")?.value);
  timeLeft = userTime > 0 ? userTime : 15;
  const timerDisplay = document.getElementById("timer");
  timerDisplay.textContent = `Time left: ${timeLeft}s`;

  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `Time left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleAnswer(null, "");
    }
  }, 1000);
}

// Start button logic
document.getElementById("start-btn").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;

  totalQuestions = Math.max(1, parseInt(document.getElementById("question-count").value) || 10);
  timeLeft = Math.max(5, parseInt(document.getElementById("time-limit").value) || 15);
  timerEnabled = document.getElementById("enable-timer")?.checked || false;
  testMode = document.getElementById("test-mode")?.checked || false;
  learnMode = document.getElementById("learn-mode")?.checked || false;  

  document.querySelector(".setup").style.display = "none";
  document.querySelector(".quiz-container").style.display = "block";

  document.getElementById("progress-fill").style.width = "0%";

  const scoreCounter = document.getElementById("score-counter");
  scoreCounter.textContent = `Score: 0 pts`;
  scoreCounter.style.display = (!testMode && !learnMode) ? "block" : "none";

  loadQuestion();
});

// Back button
document.getElementById("back-btn").addEventListener("click", () => {
  document.querySelector(".quiz-container").style.display = "none";
  document.querySelector(".setup").style.display = "block";
  document.getElementById("score-counter").style.display = "none";
});

// Retry fetch button
document.getElementById("retry-btn").addEventListener("click", () => {
  loadQuestion();
});

// Next or Finish button
document.getElementById("next-btn").addEventListener("click", () => {
  currentQuestion++;
  if (currentQuestion >= totalQuestions) {
    showSummary();
    return;
  }
  loadQuestion();
});

// Show result summary
function showSummary() {
  document.querySelector(".quiz-container").style.display = "none";
  document.getElementById("summary-box").style.display = "block";

  const percent = Math.round((score / totalQuestions) * 100);
  document.getElementById("result-text").textContent = `Your score: ${score} / ${totalQuestions}`;
  document.getElementById("percent-text").textContent = `That's ${percent}% correct.`;

  let comment = "";
  if (percent <= 30) comment = "You need more practice! 💡";
  else if (percent <= 60) comment = "Not bad, but you can do better! 🙂";
  else if (percent <= 90) comment = "Great result! 💪";
  else comment = "You're a master! 👑";

  if (learnMode) {
    document.getElementById("summary-box").style.display = "block";
    document.getElementById("result-text").textContent = "You completed Learn Mode!";
    document.getElementById("percent-text").textContent = "";
    document.getElementById("comment-text").textContent = "";
    return;
  }

  document.getElementById("comment-text").textContent = comment;
}

// Restart from summary
document.getElementById("restart-btn").addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;

  document.getElementById("score-counter").style.display = "none";
  document.getElementById("summary-box").style.display = "none";
  document.querySelector(".setup").style.display = "block";
});

// Show/hide time input if timer is enabled
document.getElementById("enable-timer").addEventListener("change", (e) => {
  const timeContainer = document.getElementById("time-container");
  timeContainer.style.display = e.target.checked ? "block" : "none";
});


// get mode from localStorage
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
  darkModeToggle.checked = true;
  modeLabel.textContent = "Light Mode";
} else {
  document.body.classList.remove("dark-mode");
  darkModeToggle.checked = false;
  modeLabel.textContent = "Dark Mode";
}

// chnage toggle
darkModeToggle.addEventListener("change", function () {
  if (this.checked) {
    document.body.classList.add("dark-mode");
    modeLabel.textContent = "Light Mode";
    localStorage.setItem("darkMode", "true");
  } else {
    document.body.classList.remove("dark-mode");
    modeLabel.textContent = "Dark Mode";
    localStorage.setItem("darkMode", "false");
  }
});

