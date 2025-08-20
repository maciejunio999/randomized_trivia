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
let arcadeMode = false;


// Fetch and display a question from the API
async function loadQuestion() {
  // Reset UI state before loading a new question
  nextBtn.disabled = true;
  feedback.textContent = "";
  answersBox.innerHTML = "";
  questionText.textContent = "Loading question...";
  document.getElementById("timer").textContent = "";
  document.getElementById("retry-btn").style.display = "none";

  // Clear any existing timer
  clearInterval(timerInterval);

  // Read selected category and difficulty
  const category = document.getElementById("category").value;
  const difficulty = document.getElementById("difficulty").value;

  // Build request URL with optional filters
  const url = new URL(API_URL);
  if (category) url.searchParams.append("category", category);
  if (difficulty) url.searchParams.append("difficulty", difficulty);

  // In arcade mode, feedback and score are hidden
  if (arcadeMode) {
    feedback.textContent = "";
    document.getElementById("score-counter").style.display = "none";
  }

  try {
    // Fetch question from backend
    const res = await fetch(url.toString());
    const data = await res.json();

    // Validate question data structure
    if (!data || !data.question || !data.correct_answer || !data.answers) {
      throw new Error(data?.error || "Invalid question data");
    }

    // Reset retry counter
    retryCount = 0;

    // Update button text for last question
    nextBtn.textContent = currentQuestion === totalQuestions - 1 ? "Finish" : "Next Question";

    // Decode HTML entities from API response
    const decodedQuestion = decodeHTMLEntities(data.question);
    correctAnswer = decodeHTMLEntities(data.correct_answer);
    const answers = data.answers.map(decodeHTMLEntities);

    // Shuffle answers randomly
    shuffleArray(answers);

    // Display question
    questionText.textContent = decodedQuestion;

    // Create answer buttons
    answers.forEach(answer => {
      const btn = document.createElement("button");
      btn.classList.add("answer-btn");
      btn.textContent = answer;
      btn.addEventListener("click", () => handleAnswer(btn, answer));
      answersBox.appendChild(btn);
    });

    // Update question counter text
    document.getElementById("question-counter").textContent = 
      `Question ${currentQuestion + 1} of ${totalQuestions}`;

    // Start timer if enabled
    if (timerEnabled) startTimer();

    // Update progress bar
    const progressPercent = Math.round((currentQuestion + 1) / totalQuestions * 100);
    document.getElementById("progress-fill").style.width = `${progressPercent}%`;

  } catch (err) {
    // Handle failed API call
    console.error("Error loading question:", err.message || err);
    retryCount++;

    // Retry fetching up to MAX_RETRIES times
    if (retryCount < MAX_RETRIES) {
      return loadQuestion();
    }

    // On failure, show error and retry option
    questionText.textContent = "Failed to load question. 😕";
    nextBtn.disabled = false;
    nextBtn.textContent = currentQuestion + 1 >= totalQuestions ? "Finish" : "Next Question";
    document.getElementById("retry-btn").style.display = "inline-block";
    return;
  }
}


// Handle user's answer selection
function handleAnswer(button, answer) {
  // Ignore if no button or already disabled (e.g. clicked multiple times)
  if (!button || button.disabled) return;

  const allButtons = document.querySelectorAll(".answer-btn");
  clearInterval(timerInterval); // Stop the countdown timer if active

  // === CASE 1: CORRECT ANSWER ===
  if (answer === correctAnswer) {
    button.classList.add("correct");

    // Play sound only if not in learn mode (no rewards there)
    if (!learnMode) {
      document.getElementById("correct-sound").play();
    }

    // Disable all buttons to prevent more input
    allButtons.forEach(btn => btn.disabled = true);

    nextBtn.disabled = false; // Allow moving to the next question
    feedback.textContent = "✅ Correct!";

    // Increase score only if not in test/learn mode
    if (!testMode && !learnMode) {
      score++;
      document.getElementById("score-counter").textContent = `Score: ${score} pts`;
    }

    // Clear the timer display
    document.getElementById("timer").textContent = "";
    return;
  }

  // === CASE 2: INCORRECT ANSWER ===
  button.classList.add("incorrect");  // Mark as incorrect visually
  button.disabled = true;             // Prevent re-clicking
  document.getElementById("wrong-sound").play();  // Play error sound
    // Arcade Mode: End quiz immediately on wrong answer
  if (arcadeMode) {
    showSummary();  // Skip everything else and show result
    return;
  }

  // --- Special logic for Learn Mode ---
  if (learnMode) {
    // Get all remaining (not disabled) answer buttons
    const remaining = [...allButtons].filter(btn => !btn.disabled);

    if (remaining.length === 1) {
      // Last remaining option → auto-reveal its status
      const lastBtn = remaining[0];
      lastBtn.disabled = true;

      if (lastBtn.textContent === correctAnswer) {
        // Show correct but do NOT play sound, as user didn't click it
        lastBtn.classList.add("correct");
        feedback.textContent = "❌ All options tried!";
      } else {
        // Last one was incorrect too (very rare case)
        lastBtn.classList.add("incorrect");
        document.getElementById("wrong-sound").play(); // optional
        feedback.textContent = "❌ All options tried!";
      }

      nextBtn.disabled = false; // Allow going to next question
    } else {
      // Allow user to try again (not all options exhausted)
      feedback.textContent = "❌ Try again!";
    }

  } else {
    // --- Standard mode (normal or test mode) ---
    allButtons.forEach(btn => {
      btn.disabled = true; // Lock all inputs
      if (btn.textContent === correctAnswer) {
        btn.classList.add("correct"); // Reveal the correct one
      }
    });

    // Show feedback only if not in test mode
    if (!testMode) {
      feedback.textContent = `❌ Wrong! Correct answer: ${correctAnswer}`;
      document.getElementById("wrong-sound").play();  // Play again in normal mode
    }

    nextBtn.disabled = false;

    // Update score display if needed
    if (!testMode && !learnMode) {
      document.getElementById("score-counter").textContent = `Score: ${score} pts`;
    }
  }

  // Clear timer display
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
  // Reset quiz state
  currentQuestion = 0;
  score = 0;

  // Get selected game modes
  timerEnabled = document.getElementById("enable-timer")?.checked || false;
  testMode = document.getElementById("test-mode")?.checked || false;
  learnMode = document.getElementById("learn-mode")?.checked || false;
  arcadeMode = document.getElementById("arcade-mode")?.checked || false;

  // Set time per question
  const timeInput = document.getElementById("time-limit").value;
  timeLeft = Math.max(5, parseInt(timeInput) || 15);

  // Determine number of questions
  // If arcade mode is enabled, use a large number and disable the input
  const questionCountInput = document.getElementById("question-count");
  questionCountInput.disabled = arcadeMode;
  totalQuestions = arcadeMode ? 9999 : Math.max(1, parseInt(questionCountInput.value) || 10);

  // Switch UI from config screen to quiz screen
  document.querySelector(".setup").style.display = "none";
  document.querySelector(".quiz-container").style.display = "block";

  // Reset progress bar
  document.getElementById("progress-fill").style.width = "0%";

  // Show score only if not in test, learn, or arcade mode
  const scoreCounter = document.getElementById("score-counter");
  scoreCounter.textContent = `Score: 0 pts`;
  scoreCounter.style.display = (!testMode && !learnMode && !arcadeMode) ? "block" : "none";

  // Start the quiz
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


// Show result summary screen at the end of the quiz
function showSummary() {
  // Hide the main quiz area and show the summary box
  document.querySelector(".quiz-container").style.display = "none";
  document.getElementById("summary-box").style.display = "block";

  // Calculate the percentage of correct answers
  const percent = Math.round((score / totalQuestions) * 100);

  // Display basic result information
  document.getElementById("result-text").textContent = `Your score: ${score} / ${totalQuestions}`;
  document.getElementById("percent-text").textContent = `That's ${percent}% correct.`;

  // Generate a comment based on the performance
  let comment = "";
  if (percent <= 30) comment = "You need more practice! 💡";
  else if (percent <= 60) comment = "Not bad, but you can do better! 🙂";
  else if (percent <= 90) comment = "Great result! 💪";
  else comment = "You're a master! 👑";

  // Special case: Learn Mode – no score or comment is shown
  if (learnMode) {
    document.getElementById("summary-box").style.display = "block";
    document.getElementById("result-text").textContent = "You completed Learn Mode!";
    document.getElementById("percent-text").textContent = "";
    document.getElementById("comment-text").textContent = "";
    return;
  }

  // Special case: Arcade Mode – show streak instead of percentage or comment
  if (arcadeMode) {
    document.getElementById("result-text").textContent = `Streak: ${score} correct answers in a row`;
    document.getElementById("percent-text").textContent = "";
    document.getElementById("comment-text").textContent = "";
    return;
  }

  // Show the performance comment (only for normal/test mode)
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


// Toggle disabling of question count input when Arcade Mode is checked/unchecked
document.getElementById("arcade-mode").addEventListener("change", (e) => {
  const questionCountInput = document.getElementById("question-count");
  questionCountInput.disabled = e.target.checked;
});
