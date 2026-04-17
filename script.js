const STORAGE_KEY = "study-buddy-tasks";
const EXAM_STORAGE_KEY = "study-buddy-exams";
const LEGACY_EXAM_STORAGE_KEY = "study-buddy-exam";
const MAX_SUBTASKS = 30;
const DAILY_GOAL = 3;

const form = document.getElementById("todo-form");
const taskInput = document.getElementById("task-input");
const taskSubheadingInput = document.getElementById("task-subheading");
const todoList = document.getElementById("todo-list");
const template = document.getElementById("todo-item-template");
const remainingCount = document.getElementById("remaining-count");
const completedCount = document.getElementById("completed-count");
const stepCount = document.getElementById("step-count");
const stepsLeftCount = document.getElementById("steps-left-count");
const totalStepsCount = document.getElementById("total-steps-count");
const clearCompletedButton = document.getElementById("clear-completed");
const celebrationLayer = document.getElementById("celebration-layer");
const overallProgressFill = document.getElementById("overall-progress-fill");
const overallProgressText = document.getElementById("overall-progress-text");
const focusMessage = document.getElementById("focus-message");
const xpCount = document.getElementById("xp-count");
const todayGoalCount = document.getElementById("today-goal-count");
const energyLabel = document.getElementById("energy-label");
const energySubtext = document.getElementById("energy-subtext");
const microMessage = document.getElementById("micro-message");
const examForm = document.getElementById("exam-form");
const examNameInput = document.getElementById("exam-name");
const examDateInput = document.getElementById("exam-date");
const examTitleDisplay = document.getElementById("exam-title-display");
const examSubtitle = document.getElementById("exam-subtitle");
const examCountNumber = document.getElementById("exam-count-number");
const examCountLabel = document.getElementById("exam-count-label");
const examList = document.getElementById("exam-list");
const navTabs = document.querySelectorAll(".nav-tab");
const overviewView = document.getElementById("overview-view");
const tasklistView = document.getElementById("tasklist-view");
const goTasklistButton = document.getElementById("go-tasklist-button");

let todos = loadTodos();
let exams = loadExams();

render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = taskInput.value.trim();
  const subheading = taskSubheadingInput.value.trim();
  if (!value) {
    taskInput.focus();
    return;
  }

  todos.unshift({
    id: crypto.randomUUID(),
    text: value,
    subtasks: buildSubtasks(subheading),
    completed: false,
  });

  syncTodoCompletion();
  persistTodos();
  render();
  form.reset();
  taskInput.focus();
});

clearCompletedButton.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.completed);
  persistTodos();
  render();
});

examForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = examNameInput.value.trim();
  const date = examDateInput.value;

  if (!name || !date) {
    return;
  }

  exams.push({
    id: crypto.randomUUID(),
    name,
    date,
  });
  sortExams();
  persistExams();
  render();
  examForm.reset();
});

navTabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

goTasklistButton.addEventListener("click", () => setView("tasklist"));

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeTodo) : [];
  } catch {
    return [];
  }
}

function normalizeTodo(todo) {
  const legacySubheading = typeof todo.subheading === "string" ? todo.subheading.trim() : "";
  const normalizedSubtasks = Array.isArray(todo.subtasks)
    ? todo.subtasks
        .map((subtask) => ({
          id: typeof subtask.id === "string" ? subtask.id : crypto.randomUUID(),
          text: typeof subtask.text === "string" ? subtask.text.trim() : "",
          completed: Boolean(subtask.completed),
        }))
        .filter((subtask) => subtask.text)
    : buildSubtasks(legacySubheading);

  return {
    id: typeof todo.id === "string" ? todo.id : crypto.randomUUID(),
    text: typeof todo.text === "string" ? todo.text.trim() : "Untitled task",
    subtasks: normalizedSubtasks,
    completed: Boolean(todo.completed),
  };
}

function persistTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function loadExams() {
  try {
    const raw = localStorage.getItem(EXAM_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (Array.isArray(parsed)) {
      return parsed
        .map((exam) => normalizeExam(exam))
        .filter(Boolean)
        .sort(compareExams);
    }

    const legacyRaw = localStorage.getItem(LEGACY_EXAM_STORAGE_KEY);
    const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : null;
    const migrated = legacyParsed ? [normalizeExam(legacyParsed)].filter(Boolean) : [];

    if (migrated.length > 0) {
      localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_EXAM_STORAGE_KEY);
    }

    return migrated.sort(compareExams);
  } catch {
    return [];
  }
}

function normalizeExam(exam) {
  if (!exam || typeof exam !== "object") {
    return null;
  }

  if (typeof exam.name !== "string" || typeof exam.date !== "string") {
    return null;
  }

  const name = exam.name.trim();
  const date = exam.date;

  if (!name || !date) {
    return null;
  }

  return {
    id: typeof exam.id === "string" ? exam.id : crypto.randomUUID(),
    name,
    date,
  };
}

function persistExams() {
  localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(exams));
}

function sortExams() {
  exams.sort(compareExams);
}

function compareExams(left, right) {
  return new Date(left.date).getTime() - new Date(right.date).getTime();
}

function render() {
  todoList.innerHTML = "";

  if (todos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Your study list is empty. Add your first task to get started.";
    todoList.appendChild(empty);
  } else {
    todos.forEach((todo) => {
      const item = template.content.firstElementChild.cloneNode(true);
      const tickButton = item.querySelector(".tick-button");
      const text = item.querySelector(".todo-text");
      const progress = item.querySelector(".todo-progress");
      const progressFill = item.querySelector(".task-progress-fill");
      const subtaskList = item.querySelector(".subtask-list");
      const subtaskForm = item.querySelector(".subtask-form");
      const subtaskInput = item.querySelector(".subtask-input");
      const deleteButton = item.querySelector(".delete-button");

      text.textContent = todo.text;
      item.classList.toggle("completed", todo.completed);
      tickButton.setAttribute(
        "aria-label",
        todo.completed ? "Mark full task as not complete" : "Mark full task as complete"
      );
      progress.textContent = getProgressLabel(todo);
      progressFill.style.width = `${getTaskPercent(todo)}%`;

      tickButton.addEventListener("click", () => toggleTodo(todo.id, tickButton));
      deleteButton.addEventListener("click", () => deleteTodo(todo.id));
      subtaskForm.addEventListener("submit", (event) => {
        event.preventDefault();
        addSubtask(todo.id, subtaskInput.value);
      });

      if (todo.subtasks.length > 0) {
        todo.subtasks.forEach((subtask) => {
          const subtaskItem = document.createElement("li");
          const subtaskButton = document.createElement("button");
          const subtaskText = document.createElement("span");

          subtaskItem.className = "subtask-item";
          subtaskItem.classList.toggle("completed", subtask.completed);
          subtaskButton.className = "subtask-button";
          subtaskButton.type = "button";
          subtaskButton.setAttribute(
            "aria-label",
            subtask.completed ? "Mark step as not complete" : "Mark step as complete"
          );
          subtaskText.className = "subtask-text";
          subtaskText.textContent = subtask.text;

          subtaskButton.addEventListener("click", () =>
            toggleSubtask(todo.id, subtask.id, subtaskButton)
          );

          subtaskItem.appendChild(subtaskButton);
          subtaskItem.appendChild(subtaskText);
          subtaskList.appendChild(subtaskItem);
        });
      }

      todoList.appendChild(item);
    });
  }

  const completed = todos.filter((todo) => todo.completed).length;
  const remaining = todos.length - completed;
  const metrics = getMetrics();

  remainingCount.textContent = String(remaining);
  completedCount.textContent = String(completed);
  stepCount.textContent = String(metrics.completedSteps);
  stepsLeftCount.textContent = String(metrics.totalSteps - metrics.completedSteps);
  totalStepsCount.textContent = String(metrics.totalSteps);
  clearCompletedButton.disabled = completed === 0;
  clearCompletedButton.style.opacity = completed === 0 ? "0.55" : "1";

  overallProgressFill.style.width = `${metrics.progressPercent}%`;
  overallProgressText.textContent = `${metrics.progressPercent}%`;
  xpCount.textContent = String(metrics.xp);
  todayGoalCount.textContent = `${Math.min(metrics.completedSteps, DAILY_GOAL)}/${DAILY_GOAL}`;
  focusMessage.textContent = getFocusMessage(metrics);
  microMessage.textContent = getMicroMessage(metrics);

  const energy = getEnergyState(metrics);
  energyLabel.textContent = energy.label;
  energySubtext.textContent = energy.subtext;
  document.body.classList.toggle("energy-high", energy.mode === "high");

  renderExamCountdown();
}

function toggleTodo(id, triggerButton) {
  const todo = todos.find((entry) => entry.id === id);
  if (!todo) {
    return;
  }

  const nowCompleted = !todo.completed;
  if (todo.subtasks.length > 0) {
    todo.subtasks = todo.subtasks.map((subtask) => ({
      ...subtask,
      completed: nowCompleted,
    }));
  }

  todo.completed = nowCompleted;
  persistTodos();
  render();

  if (nowCompleted) {
    playCelebration(triggerButton, "task");
  }
}

function toggleSubtask(todoId, subtaskId, triggerButton) {
  const todo = todos.find((entry) => entry.id === todoId);
  if (!todo) {
    return;
  }

  const subtask = todo.subtasks.find((entry) => entry.id === subtaskId);
  if (!subtask) {
    return;
  }

  subtask.completed = !subtask.completed;
  const wasCompleted = todo.completed;
  todo.completed = todo.subtasks.length > 0 && todo.subtasks.every((entry) => entry.completed);

  persistTodos();
  render();

  if (subtask.completed) {
    playCelebration(triggerButton, "step");
  }

  if (!wasCompleted && todo.completed) {
    playCelebration(triggerButton, "task");
  }
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  persistTodos();
  render();
}

function addSubtask(todoId, value) {
  const todo = todos.find((entry) => entry.id === todoId);
  const text = value.trim();

  if (!todo || !text || todo.subtasks.length >= MAX_SUBTASKS) {
    render();
    return;
  }

  todo.subtasks.push({
    id: crypto.randomUUID(),
    text,
    completed: false,
  });

  syncTodoCompletion();
  persistTodos();
  render();
}

function buildSubtasks(rawValue) {
  return rawValue
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, MAX_SUBTASKS)
    .map((text) => ({
      id: crypto.randomUUID(),
      text,
      completed: false,
    }));
}

function syncTodoCompletion() {
  todos.forEach((todo) => {
    todo.completed = todo.subtasks.length > 0
      ? todo.subtasks.every((subtask) => subtask.completed)
      : Boolean(todo.completed);
  });
}

function getProgressLabel(todo) {
  const percent = getTaskPercent(todo);

  if (todo.subtasks.length === 0) {
    return `${percent}% done. Left: 0 | Done: ${todo.completed ? 1 : 0} | Total: 0. Add smaller steps below to break this down.`;
  }

  const finishedSteps = todo.subtasks.filter((subtask) => subtask.completed).length;
  const stepsLeft = todo.subtasks.length - finishedSteps;
  if (finishedSteps === todo.subtasks.length) {
    return `${percent}% done. Left: ${stepsLeft} | Done: ${finishedSteps} | Total: ${todo.subtasks.length}. Beautiful.`;
  }

  return `${percent}% done. Left: ${stepsLeft} | Done: ${finishedSteps} | Total: ${todo.subtasks.length}.`;
}

function getTaskPercent(todo) {
  if (todo.subtasks.length === 0) {
    return todo.completed ? 100 : 0;
  }

  const finishedSteps = todo.subtasks.filter((subtask) => subtask.completed).length;
  return Math.round((finishedSteps / todo.subtasks.length) * 100);
}

function renderExamCountdown() {
  examList.innerHTML = "";

  if (exams.length === 0) {
    examTitleDisplay.textContent = "No exams set yet";
    examSubtitle.textContent = "Add your exam dates and keep every finish line in sight.";
    examCountNumber.textContent = "--";
    examCountLabel.textContent = "next exam";
    return;
  }

  sortExams();

  const nextUpcomingExam = exams.find((entry) => getDaysUntil(entry.date) >= 0) ?? exams[0];
  const daysLeft = getDaysUntil(nextUpcomingExam.date);

  examTitleDisplay.textContent = nextUpcomingExam.name;
  examCountNumber.textContent = formatExamCountNumber(daysLeft);
  examCountLabel.textContent = formatExamCountLabel(daysLeft);
  examSubtitle.textContent = getExamSubtitle(nextUpcomingExam.name, daysLeft);

  exams.forEach((exam, index) => {
    const item = document.createElement("li");
    const copy = document.createElement("div");
    const name = document.createElement("p");
    const date = document.createElement("p");
    const countdown = document.createElement("span");
    const removeButton = document.createElement("button");
    const examDaysLeft = getDaysUntil(exam.date);

    item.className = "exam-item";
    item.classList.toggle("is-next", exam.id === nextUpcomingExam.id || (index === 0 && exams.length === 1));

    copy.className = "exam-item-copy";
    name.className = "exam-item-name";
    date.className = "exam-item-date";
    countdown.className = "exam-item-countdown";
    removeButton.className = "exam-delete-button";
    removeButton.type = "button";

    name.textContent = exam.name;
    date.textContent = formatExamDate(exam.date);
    countdown.textContent = formatCountdownText(examDaysLeft);
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => deleteExam(exam.id));

    copy.appendChild(name);
    copy.appendChild(date);
    item.appendChild(copy);
    item.appendChild(countdown);
    item.appendChild(removeButton);
    examList.appendChild(item);
  });
}

function getDaysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(`${dateString}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  const difference = target.getTime() - today.getTime();
  return Math.round(difference / 86400000);
}

function formatExamCountNumber(daysLeft) {
  if (daysLeft === 0) {
    return "Today";
  }

  return String(Math.abs(daysLeft));
}

function formatExamCountLabel(daysLeft) {
  if (daysLeft > 1) {
    return "days left";
  }

  if (daysLeft === 1) {
    return "day left";
  }

  if (daysLeft === 0) {
    return "exam day";
  }

  return "days since";
}

function getExamSubtitle(name, daysLeft) {
  if (daysLeft > 1) {
    return `Your next exam is ${name}. Keep chipping away now so future you feels calmer.`;
  }

  if (daysLeft === 1) {
    return `Last full day before ${name}. Keep it focused and kind on yourself.`;
  }

  if (daysLeft === 0) {
    return `${name} is today. You’ve done more than you think.`;
  }

  return `${name} has passed. Set your next one when you're ready.`;
}

function formatCountdownText(daysLeft) {
  if (daysLeft > 1) {
    return `${daysLeft} days left`;
  }

  if (daysLeft === 1) {
    return "1 day left";
  }

  if (daysLeft === 0) {
    return "Today";
  }

  return `${Math.abs(daysLeft)} days since`;
}

function formatExamDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function deleteExam(id) {
  exams = exams.filter((exam) => exam.id !== id);
  persistExams();
  render();
}

function setView(view) {
  const isOverview = view === "overview";

  overviewView.classList.toggle("active", isOverview);
  tasklistView.classList.toggle("active", !isOverview);

  navTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === view);
  });
}

function getMetrics() {
  const totalTasks = todos.length;
  const completedTasks = todos.filter((todo) => todo.completed).length;
  const allSubtasks = todos.flatMap((todo) => todo.subtasks);
  const totalSteps = allSubtasks.length;
  const completedSteps = allSubtasks.filter((subtask) => subtask.completed).length;
  const bonusSteps = completedTasks * 2;
  const xp = completedSteps * 15 + completedTasks * 40;
  const denominator = totalSteps + totalTasks || 1;
  const numerator = completedSteps + bonusSteps;
  const progressPercent = Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));

  return {
    totalTasks,
    completedTasks,
    totalSteps,
    completedSteps,
    xp,
    progressPercent,
  };
}

function getFocusMessage(metrics) {
  if (metrics.totalTasks === 0) {
    return "Start with one small step and let the wins stack up.";
  }

  if (metrics.progressPercent === 100) {
    return "Everything on your board is complete. That is a seriously good feeling.";
  }

  if (metrics.completedSteps === 0) {
    return "Pick the easiest step first. Momentum beats pressure.";
  }

  if (metrics.completedSteps < DAILY_GOAL) {
    return `You're ${DAILY_GOAL - metrics.completedSteps} step${DAILY_GOAL - metrics.completedSteps === 1 ? "" : "s"} away from today's mini goal.`;
  }

  if (metrics.completedTasks > 0) {
    return "You’re converting small actions into finished work. Keep riding that wave.";
  }

  return "Your board is moving now. A few more taps and this will really build momentum.";
}

function getMicroMessage(metrics) {
  if (metrics.totalTasks === 0) {
    return "Build your first study mission.";
  }

  if (metrics.progressPercent >= 85) {
    return "Final stretch. You’re almost there.";
  }

  if (metrics.completedTasks > 0) {
    return `${metrics.completedTasks} full task${metrics.completedTasks === 1 ? "" : "s"} already conquered.`;
  }

  if (metrics.completedSteps > 0) {
    return "Little wins are stacking up nicely.";
  }

  return "Small progress still counts.";
}

function getEnergyState(metrics) {
  if (metrics.progressPercent >= 80) {
    return {
      mode: "high",
      label: "On fire",
      subtext: "Your board is glowing. Keep pushing through the last few items.",
    };
  }

  if (metrics.progressPercent >= 40) {
    return {
      mode: "medium",
      label: "In motion",
      subtext: "You’ve got real momentum now. Keep turning steps into finished tasks.",
    };
  }

  return {
    mode: "low",
    label: "Warming up",
    subtext: "A few taps and this board will wake right up.",
  };
}

function playCelebration(triggerButton, kind) {
  const effects = kind === "task"
    ? [confettiBlast, burstRing, flashBanner, starBurst]
    : [burstRing, flashBanner, shakeScreen, starBurst];
  const randomEffect = effects[Math.floor(Math.random() * effects.length)];
  randomEffect(triggerButton);
}

function confettiBlast() {
  const colors = ["#df6d3b", "#2f8f62", "#f5b942", "#5c8ef0", "#ef476f"];

  for (let index = 0; index < 28; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 180}px`);
    piece.style.animationDelay = `${Math.random() * 120}ms`;
    celebrationLayer.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

function shakeScreen() {
  document.body.classList.remove("shake");
  void document.body.offsetWidth;
  document.body.classList.add("shake");
  window.setTimeout(() => document.body.classList.remove("shake"), 500);
}

function burstRing(triggerButton) {
  const ring = document.createElement("span");
  const rect = triggerButton.getBoundingClientRect();
  ring.className = "burst-ring";
  ring.style.left = `${rect.left + rect.width / 2}px`;
  ring.style.top = `${rect.top + rect.height / 2}px`;
  celebrationLayer.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
}

function flashBanner() {
  const messages = ["Nice work!", "Task crushed!", "Study win!", "Done and dusted!", "Momentum up!"];
  const banner = document.createElement("div");
  banner.className = "flash-banner";
  banner.textContent = messages[Math.floor(Math.random() * messages.length)];
  celebrationLayer.appendChild(banner);
  banner.addEventListener("animationend", () => banner.remove(), { once: true });
}

function starBurst(triggerButton) {
  const stars = ["+15 XP", "Level up!", "Study streak!", "Step cleared!"];
  const star = document.createElement("div");
  const rect = triggerButton.getBoundingClientRect();

  star.className = "star-burst";
  star.textContent = stars[Math.floor(Math.random() * stars.length)];
  star.style.left = `${rect.left + rect.width / 2}px`;
  star.style.top = `${rect.top + rect.height / 2}px`;

  celebrationLayer.appendChild(star);
  star.addEventListener("animationend", () => star.remove(), { once: true });
}
