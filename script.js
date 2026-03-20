const days = [
  {
    title: "Day 1: Begin Gently",
    focus: "Intention: Start softly and simply.",
    instruction: "Walk slowly for 5 minutes. Keep your shoulders relaxed and breathe naturally.",
    prompt: "What did it feel like to slow down?"
  },
  {
    title: "Day 2: Breath and Posture",
    focus: "Intention: Notice your breath and stand tall.",
    instruction: "Walk for 6 minutes. Keep your head lifted and your breath steady.",
    prompt: "How did your body respond to better posture?"
  },
  {
    title: "Day 3: Slowing Down",
    focus: "Intention: Move with calm attention.",
    instruction: "Walk for 7 minutes at a slower pace than usual.",
    prompt: "What changed when you slowed your pace?"
  }
];

for (let i = 4; i <= 30; i++) {
  days.push({
    title: `Day ${i}`,
    focus: "Intention: Stay present and keep going.",
    instruction: `Complete your mindful walking practice for ${Math.min(5 + i, 20)} minutes.`,
    prompt: "What did you notice in your mind and body today?"
  });
}

let completedDays = JSON.parse(localStorage.getItem("completedDays")) || [];
let currentDay = completedDays.length + 1;

if (currentDay > 30) currentDay = 30;

const dayTitle = document.getElementById("dayTitle");
const dayFocus = document.getElementById("dayFocus");
const dayInstruction = document.getElementById("dayInstruction");
const dayPrompt = document.getElementById("dayPrompt");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const completeBtn = document.getElementById("completeBtn");
const saveJournalBtn = document.getElementById("saveJournalBtn");
const saveMessage = document.getElementById("saveMessage");

function loadDay() {
  const dayData = days[currentDay - 1];
  dayTitle.textContent = dayData.title;
  dayFocus.textContent = dayData.focus;
  dayInstruction.textContent = dayData.instruction;
  dayPrompt.textContent = dayData.prompt;

  const percent = (completedDays.length / 30) * 100;
  progressFill.style.width = percent + "%";
  progressText.textContent = `${completedDays.length} of 30 days completed`;
}

completeBtn.addEventListener("click", () => {
  if (!completedDays.includes(currentDay)) {
    completedDays.push(currentDay);
    localStorage.setItem("completedDays", JSON.stringify(completedDays));

    if (currentDay < 30) {
      currentDay += 1;
      loadDay();
    } else {
      progressFill.style.width = "100%";
      progressText.textContent = "30 of 30 days completed";
      dayTitle.textContent = "Challenge Complete";
      dayFocus.textContent = "You did it.";
      dayInstruction.textContent = "You completed the Slow Burn Method challenge.";
      dayPrompt.textContent = "What are you most proud of?";
    }
  }
});

saveJournalBtn.addEventListener("click", () => {
  const entry = document.getElementById("journalEntry").value;
  const mood = document.getElementById("mood").value;
  const energy = document.getElementById("energy").value;
  const stress = document.getElementById("stress").value;

  const journalData = {
    entry,
    mood,
    energy,
    stress
  };

  localStorage.setItem(`journalDay${currentDay}`, JSON.stringify(journalData));
  saveMessage.textContent = "Journal saved.";
});

loadDay();
