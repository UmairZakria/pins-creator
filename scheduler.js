export const scheduler = {
  ALARM_NAME: "pinSchedulerAlarm",

  /**
   * Schedule the next pin with a random delay (10-20 seconds for batching)
   */
  scheduleNext: async () => {
    // Reduced to 10-20 seconds for rapid batch processing
    const minDelay = 1;
    const maxDelay = 2;
    const delay = Math.floor(
      Math.random() * (maxDelay - minDelay + 1) + minDelay,
    );

    const nextTime = Date.now() + delay;

    await chrome.storage.local.set({ nextScheduledTime: nextTime });

    chrome.alarms.create(scheduler.ALARM_NAME, {
      when: nextTime,
    });

    console.log(
      `Scheduled next pin in ${Math.round(delay / 1000)} seconds at ${new Date(nextTime).toLocaleTimeString()}`,
    );
  },

  /**
   * Stop the scheduler
   */
  stop: async () => {
    await chrome.alarms.clear(scheduler.ALARM_NAME);
    await chrome.storage.local.set({ nextScheduledTime: null });
  },

  /**
   * Trigger immediate execution (e.g., when starting)
   */
  triggerNow: () => {
    chrome.runtime.sendMessage({ action: "processNextPin" });
  },
};

// Also attach to self for non-module contexts if any (like window)
if (typeof self !== "undefined") {
  self.scheduler = scheduler;
}
