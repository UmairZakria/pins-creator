/**
 * Handles Popup UI interactions and state management
 */

const elements = {
  excelUpload: document.getElementById("excel-upload"),
  pinsRemaining: document.getElementById("pins-remaining"),
  lastPosted: document.getElementById("last-posted"),
  currentStatus: document.getElementById("current-status"),
  startBtn: document.getElementById("start-btn"),
  stopBtn: document.getElementById("stop-btn"),
  countdownContainer: document.getElementById("countdown-container"),
  countdown: document.getElementById("countdown"),
  dropZone: document.getElementById("drop-zone"),
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  await updateUI();

  // Auto-update countdown every second
  setInterval(updateCountdown, 1000);
});

async function updateUI() {
  const data = await chrome.storage.local.get([
    "pins",
    "currentIndex",
    "isAutomationRunning",
    "lastPostedTime",
    "nextScheduledTime",
  ]);

  const pins = data.pins || [];
  const currentIndex = data.currentIndex || 0;
  const remaining = Math.max(0, pins.length - currentIndex);

  elements.pinsRemaining.innerText = remaining;
  elements.lastPosted.innerText = data.lastPostedTime
    ? new Date(data.lastPostedTime).toLocaleTimeString()
    : "Never";
  elements.currentStatus.innerText = data.isAutomationRunning
    ? "Running"
    : "Idle";

  // Toggle buttons
  if (data.isAutomationRunning) {
    elements.startBtn.style.display = "none";
    elements.stopBtn.style.display = "block";
    elements.countdownContainer.style.display = "block";
  } else {
    elements.startBtn.style.display = "block";
    elements.stopBtn.style.display = "none";
    elements.countdownContainer.style.display = "none";

    // Only enable start if there are pins remaining
    elements.startBtn.disabled = remaining === 0;
  }
}

function updateCountdown() {
  chrome.storage.local.get(
    ["nextScheduledTime", "isAutomationRunning"],
    (data) => {
      if (!data.isAutomationRunning || !data.nextScheduledTime) return;

      const now = Date.now();
      const diff = data.nextScheduledTime - now;

      if (diff <= 0) {
        elements.countdown.innerText = "00:00:00";
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      elements.countdown.innerText = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    },
  );
}

// File Upload Handler
elements.excelUpload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  elements.currentStatus.innerText = "Parsing Excel...";

  try {
    const pins = await window.excelReader.parseFile(file);

    await chrome.storage.local.set({
      pins: pins,
      currentIndex: 0,
      isAutomationRunning: false,
      lastPostedTime: null,
      nextScheduledTime: null,
    });

    elements.dropZone.querySelector("span").innerText =
      `Loaded ${pins.length} Pins Successfully!`;
    elements.dropZone.style.borderColor = "#4CAF50";

    await updateUI();
  } catch (error) {
    console.error(error);
    alert(`Error parsing Excel: ${error.message}`);
    elements.currentStatus.innerText = "Error";
  }
});

// Start Automation
elements.startBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ isAutomationRunning: true });

  // Send message to background to start
  chrome.runtime.sendMessage({ action: "startAutomation" });

  await updateUI();
});

// Stop Automation
elements.stopBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({
    isAutomationRunning: false,
    nextScheduledTime: null,
  });

  // Send message to background to stop
  chrome.runtime.sendMessage({ action: "stopAutomation" });

  await updateUI();
});

// Listen for updates from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "stateUpdated") {
    updateUI();
  }
});
