/**
 * Utility for simulating human behavior in the Pinterest automation.
 */
const humanBehavior = {
  /**
   * Random delay between min and max milliseconds
   */
  wait: (min, max) => {
    // Check for "Turbo Mode" in global state (we'll implement this)
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise((resolve) => setTimeout(resolve, delay));
  },

  /**
   * Type text slowly into an element
   */
  typeSlowly: async (element, text) => {
    console.log(`[HumanBehavior] Turbo Typing (length: ${text.length})...`);

    if (!element) return;

    element.focus();
    await humanBehavior.wait(50, 200);

    const isContentEditable =
      element.isContentEditable ||
      element.getAttribute("contenteditable") === "true";

    const setDraftSelection = () => {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {}
    };

    if (isContentEditable) setDraftSelection();

    if (isContentEditable) {
      console.log(
        `[HumanBehavior] ContentEditable detected. Using Paste-Simulation for ${text.length} chars...`,
      );
      element.focus();
      await humanBehavior.wait(200, 400);

      // 1. Try a "Paste" simulation - Draft.js loves this
      try {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData("text/plain", text);
        const pasteEvent = new ClipboardEvent("paste", {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(pasteEvent);

        // Wait a bit to see if it worked
        await humanBehavior.wait(500, 1000);

        // Verification: If text is still near empty, fallback
        if (element.innerText.length < text.length * 0.1) {
          console.warn(
            "[HumanBehavior] Paste failed or text too short. Falling back to Char-Mode.",
          );
        } else {
          console.log("[HumanBehavior] Paste-Simulation seems successful.");
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return;
        }
      } catch (e) {
        console.warn("[HumanBehavior] Paste error:", e);
      }
    }

    // fallback / Char-By-Char Mode
    console.log(
      `[HumanBehavior] Typing char-by-char (${text.length} chars)...`,
    );
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      try {
        document.execCommand("insertText", false, char);
      } catch (e) {
        if (!isContentEditable) element.value += char;
      }

      // Tiny variability delay to keep it human-like
      if (i % 20 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    console.log("[HumanBehavior] Typing completed.");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await humanBehavior.wait(100, 200);
  },
  /**
   * Simulate a random scroll on the page
   */
  randomScroll: async () => {
    const scrollAmount = Math.floor(Math.random() * 300) + 100;
    window.scrollBy({
      top: scrollAmount,
      behavior: "smooth",
    });
    await humanBehavior.wait(1000, 2000);
  },

  /**
   * Move mouse randomly (visual simulation for listeners)
   */
  simulateMovement: async (element) => {
    const rect = element.getBoundingClientRect();
    const mouseEvent = new MouseEvent("mousemove", {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: rect.left + Math.random() * rect.width,
      clientY: rect.top + Math.random() * rect.height,
    });
    element.dispatchEvent(mouseEvent);
    await humanBehavior.wait(200, 500);
  },

  /**
   * Add a hesitation pause
   */
  hesitate: async () => {
    await humanBehavior.wait(200, 500);
  },
};

// Export for module usage if needed, or attach to window for content script usage
if (typeof window !== "undefined") {
  window.humanBehavior = humanBehavior;
}
if (typeof module !== "undefined") {
  module.exports = humanBehavior;
}
