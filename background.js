import { scheduler } from "./scheduler.js";

/**
 * Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Pinterest Auto Pin Extension Installed");
});

// Handle alarms for scheduling
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pinSchedulerAlarm") {
    const data = await chrome.storage.local.get(["isAutomationRunning"]);
    if (data.isAutomationRunning) {
      await processNextPin();
    }
  }
});

// Handle all messages in one place to avoid conflicts in Manifest V3
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message.action);

  if (message.action === "startAutomation") {
    processNextPin();
  } else if (message.action === "stopAutomation") {
    scheduler.stop();
  } else if (message.action === "processNextPin") {
    processNextPin();
  } else if (message.action === "pinPostedSuccessfully") {
    handlePinSuccess();
  }
  return true; // Keep channel open for async if needed
});

async function handlePinSuccess() {
  const data = await chrome.storage.local.get(["currentIndex"]);
  const newIndex = (data.currentIndex || 0) + 1;

  console.log(`Pin success! Moving from ${data.currentIndex} to ${newIndex}`);

  await chrome.storage.local.set({
    currentIndex: newIndex,
    lastPostedTime: Date.now(),
  });

  // Schedule next pin (now 10-20 seconds in scheduler.js)
  await scheduler.scheduleNext();

  // Notify popup to refresh UI
  chrome.runtime.sendMessage({ action: "stateUpdated" });
}

async function processNextPin() {
  const data = await chrome.storage.local.get([
    "pins",
    "currentIndex",
    "isAutomationRunning",
  ]);

  if (!data.isAutomationRunning) {
    console.log("Automation not running, stopping loop.");
    return;
  }

  if (!data.pins || data.currentIndex >= data.pins.length) {
    console.log("Reached end of pin queue.");
    await chrome.storage.local.set({ isAutomationRunning: false });
    chrome.runtime.sendMessage({ action: "stateUpdated" });
    return;
  }

  // Calculate 1-hour offset for scheduling
  const oneHour = 60 * 60 * 1000;
  const thirtyMins = 30 * 60 * 1000;
  // Start 30 mins from now for first pin, then 1-hour gaps
  const scheduledTime = Date.now() + thirtyMins + data.currentIndex * oneHour;

  const currentPin = {
    ...data.pins[data.currentIndex],
    scheduledTime: scheduledTime,
  };

  await chrome.storage.local.set({ currentProcessingPin: currentPin });

  console.log(
    `Processing Pin #${data.currentIndex + 1} of ${data.pins.length}. Native Schedule: ${new Date(scheduledTime).toLocaleString()}`,
  );

  // Open Pinterest Create Pin page
  chrome.tabs.create(
    { url: "https://www.pinterest.com/pin-builder/" },
    (tab) => {
      console.log("Opened Pinterest Tab:", tab.id);
    },
  );
}
