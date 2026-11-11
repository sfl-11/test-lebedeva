// ===== ССЫЛКА НА ТАБЛИЦУ =====
// Параметр &v=2 обновлен, чтобы подтянуть новые 20 вопросов
const TSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSI6pze7lebJzC6CRwG5A5gsf7F0fKlecbgcSl45_I7DNPbxMlPRcDw3PALnZFvw4kKFBCczAU1PQez/pub?gid=0&single=true&output=tsv&v=2";

// ===== Состояние =====
let allQuestions = [];
let activeQuestions = [];
let currentIndex = 0;
let score = 0;
let timerInterval = null;
let timeLeft = 600; // 10 минут в секундах

// ===== DOM =====
const startBlock = document.getElementById("startBlock");
const quizBlock = document.getElementById("quizBlock");
const resultBlock = document.getElementById("resultBlock");
const themeSelect = document.getElementById("themeSelect");
const startBtn = document.getElementById("startBtn");

const questionBlock = document.getElementById("questionBlock");
const questionText = document.getElementById("questionText");
const questionTheme = document.getElementById("questionTheme");
const answersBlock = document.getElementById("answersBlock");
const feedback = document.getElementById("feedback");

const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const scoreText = document.getElementById("scoreText");
const timerText = document.getElementById("timerText");

const finalScore = document.getElementById("finalScore");
const finalTotal = document.getElementById("finalTotal");
const bestScoreText = document.getElementById("bestScoreText");
const restartBtn = document.getElementById("restartBtn");
const downloadBtn = document.getElementById("downloadBtn");

// ===== Загрузка =====
async function loadQuestions() {
  try {
    const response = await fetch(TSV_URL);
    if (!response.ok) throw new Error("Ошибка сети: " + response.status);
    const text = await response.text();
    
    // Проверка на HTML-страницу (если Google заблокировал)
    if (text.includes("<!DOCTYPE html>")) {
      throw new Error("Google вернул страницу вместо данных. Проверь доступ.");
    }

    allQuestions = parseTSV(text);

    if (allQuestions.length === 0) throw new Error("Вопросы не найдены. Проверь таблицу.");

    // Заполняем фильтр тем
    const themes = [...new Set(allQuestions.map(q => q.theme))];
    
    // Очищаем старые темы (кроме "Все темы")
    while (themeSelect.options.length > 1) {
      themeSelect.remove(1);
    }

    themes.forEach(theme => {
      const option = document.createElement("option");
      option.value = theme;
      option.textContent = theme;
      themeSelect.appendChild(option);
    });

    startBlock.classList.remove("d-none");
  } catch (err) {
    alert("Ошибка загрузки: " + err.message);
    console.error(err);
  }
}

function parseTSV(text) {
  const lines = text.trim().split(/\r?\n/);
  return lines.slice(1) // Пропускаем заголовки
    .filter(line => line.trim() !== "")
    .map(line => {
      const cols = line.split("\t");
      return {
        theme: cols[1]?.trim() || "Без темы",
        question: cols[2]?.trim() || "",
        answers: [cols[3], cols[4], cols[5], cols[6]].map(a => (a || "").trim()),
        correctIndex: parseInt(cols[7]?.trim(), 10) - 1
      };
    })
    .filter(q => q.question && q.answers.every(a => a) && q.correctIndex >= 0 && q.correctIndex <= 3);
}

// ===== Старт теста =====
startBtn.addEventListener("click", () => {
  const selectedTheme = themeSelect.value;
  
  if (selectedTheme === "all") {
    activeQuestions = [...allQuestions];
  } else {
    activeQuestions = allQuestions.filter(q => q.theme === selectedTheme);
  }

  shuffle(activeQuestions);

  startBlock.classList.add("d-none");
  resultBlock.classList.add("d-none");
  quizBlock.classList.remove("d-none");

  currentIndex = 0;
  score = 0;
  timeLeft = 600;
  scoreText.textContent = "Правильно: 0";
  
  startTimer();
  showQuestion();
});

// ===== Таймер =====
function startTimer() {
  clearInterval(timerInterval);
  timerText.classList.replace("bg-warning", "bg-danger"); // Возвращаем красный цвет
  updateTimerDisplay();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      showResult(); // Время вышло!
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s = (timeLeft % 60).toString().padStart(2, '0');
  timerText.textContent = `⏱ ${m}:${s}`;
  
  if (timeLeft <= 60) {
    timerText.classList.replace("bg-danger", "bg-warning");
  }
}

// ===== Показ вопроса =====
function showQuestion() {
  if (currentIndex >= activeQuestions.length) {
    clearInterval(timerInterval);
    return showResult();
  }

  const q = activeQuestions[currentIndex];
  feedback.textContent = "";
  feedback.className = "";

  questionTheme.textContent = q.theme;
  questionText.textContent = q.question;
  progressText.textContent = `Вопрос ${currentIndex + 1} из ${activeQuestions.length}`;
  progressBar.style.width = (currentIndex / activeQuestions.length) * 100 + "%";

  answersBlock.innerHTML = "";
  const labels = ["A", "B", "C", "D"];

  const shuffled = q.answers.map((text, i) => ({
    text,
    isCorrect: i === q.correctIndex
  }));
  shuffle(shuffled);

  shuffled.forEach((ans, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.innerHTML = `<strong>${labels[i]}.</strong> ${ans.text}`;
    btn.addEventListener("click", () => handleAnswer(btn, ans.isCorrect, q));
    answersBlock.appendChild(btn);
  });
}

// ===== Обработка ответа =====
function handleAnswer(btn, isCorrect, q) {
  [...answersBlock.children].forEach(b => (b.disabled = true));

  if (isCorrect) {
    btn.classList.add("correct");
    feedback.textContent = "✅ Верно!";
    feedback.className = "mt-3 fw-bold text-success text-center";
    score++;
  } else {
    btn.classList.add("wrong");
    feedback.textContent = "❌ Неверно";
    feedback.className = "mt-3 fw-bold text-danger text-center";
    [...answersBlock.children].forEach(b => {
      if (b.textContent.includes(q.answers[q.correctIndex])) b.classList.add("correct");
    });
  }

  scoreText.textContent = `Правильно: ${score}`;

  setTimeout(() => {
    currentIndex++;
    showQuestion();
  }, 1300);
}

// ===== Результаты =====
function showResult() {
  quizBlock.classList.add("d-none");
  resultBlock.classList.remove("d-none");
  
  finalScore.textContent = score;
  finalTotal.textContent = activeQuestions.length;

  // Сохранение лучшего результата в LocalStorage
  const bestKey = "csharp_test_best_" + themeSelect.value;
  const best = parseInt(localStorage.getItem(bestKey) || 0, 10);
  
  if (score > best) {
    localStorage.setItem(bestKey, score);
    bestScoreText.textContent = "🏆 Новый рекорд!";
    bestScoreText.className = "text-success fw-bold mb-4";
  } else {
    bestScoreText.textContent = `Ваш лучший результат для этой темы: ${best}`;
    bestScoreText.className = "text-muted mb-4";
  }
}

// ===== Скачивание =====
downloadBtn.addEventListener("click", () => {
  const text = `Тест по C#\nДата: ${new Date().toLocaleString()}\nТема: ${themeSelect.options[themeSelect.selectedIndex].text}\nРезультат: ${score} из ${activeQuestions.length}`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "csharp_test_result.txt";
  a.click();
  URL.revokeObjectURL(url);
});

restartBtn.addEventListener("click", () => {
  resultBlock.classList.add("d-none");
  startBlock.classList.remove("d-none");
});

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

loadQuestions();