/**
 * content.js - Automation logic for Pinterest Pin Builder
 */

const SELECTORS = {
  fileInput: 'input[type="file"], [data-test-id="media-upload-input"]',
  titleInput:
    '[data-test-id="pin-builder-title"] input, [placeholder*="Add your title"], [aria-label*="title"]',
  descriptionInput:
    '.public-DraftEditor-content, [data-test-id="pin-builder-description-typepad"] [contenteditable="true"], [placeholder*="Tell everyone"], [aria-label*="description"]',
  linkInput:
    '[data-test-id="pin-builder-link"] input, [placeholder*="Add a destination link"], [aria-label*="destination link"]',
  boardDropdown:
    '[data-test-id="board-dropdown-select-button"], [data-test-id="board-selection-select"], [aria-label*="Select a board"]',
  boardSearch:
    '[data-test-id="board-dropdown-search-field"] input, [data-test-id="board-picker-search-field"] input, [placeholder*="Search for a board"], .board-picker-search-input',
  boardRow:
    '[role="listitem"], [data-test-id="board-row"], .board-row-selection',
  publishLaterRadio: '[data-test-id="publish-later-radio"]',
  dateInput:
    '[data-test-id="datepicker-input"], [placeholder*="MM/DD/YYYY"], [aria-label*="date"]',
  timeInput:
    '[data-test-id="timepicker-input"] input, input[aria-label*="time"], input[placeholder*="time"]',
  publishButton:
    '[data-test-id="board-dropdown-save-button"], [data-test-id="create-pin-save-button"], [data-test-id="publish-button"]',
  genericPublish: 'button[type="submit"]',
  saveSuccessMessage:
    '[data-test-id="save-success-message"], .toast-success, [aria-label*="Saved"]',
};

/**
 * Force a human-like click using MouseEvents (Mousedown -> Mouseup -> Click)
 * This is often needed for React/Vue components that track focus/active states
 */
async function humanClick(element) {
  if (!element) return;
  console.log(
    "[HumanBehavior] Performing full UI click on:",
    element.tagName,
    element.className,
  );

  element.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
  await new Promise((r) => setTimeout(r, 50));
  element.dispatchEvent(
    new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
  await new Promise((r) => setTimeout(r, 50));

  if (typeof element.click === "function") {
    element.click();
  } else {
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
  }
}

/**
 * Scan the DOM for potential pins/boards elements and log them
 */
function scoutDOM() {
  console.log("--- STARTING DOM SCOUT ---");
  const all = document.querySelectorAll(
    'button, input, [role="button"], [role="listitem"], [contenteditable="true"]',
  );
  all.forEach((el) => {
    const text =
      el.innerText || el.placeholder || el.getAttribute("aria-label") || "";
    const id = el.getAttribute("data-test-id") || "";
    if (
      text.toLowerCase().includes("board") ||
      id.toLowerCase().includes("board") ||
      text.toLowerCase().includes("select") ||
      id.toLowerCase().includes("select") ||
      text.toLowerCase().includes("publish") ||
      id.toLowerCase().includes("publish")
    ) {
      console.log(`[Scout] Found Match:`, {
        tag: el.tagName,
        text: text.substring(0, 50),
        id,
        role: el.getAttribute("role"),
        viewable: el.getBoundingClientRect().width > 0,
      });
    }
  });
  console.log("--- SCOUT FINISHED ---");
}

async function automatePin() {
  console.log("Pinterest Auto Pin: Starting automation...");

  // 1. Get current pin data
  const data = await chrome.storage.local.get(["currentProcessingPin"]);
  const pin = data.currentProcessingPin;

  if (!pin) {
    console.error("No pin data found for index:", data.currentIndex);
    return;
  }

  try {
    // 2. Wait for UI load and scroll randomly
    console.log("Waiting for page load...");
    await waitForElement(SELECTORS.fileInput);
    await humanBehavior.randomScroll();
    await humanBehavior.hesitate();

    // 3. Handle Image Upload
    console.log("Uploading image:", pin.image_url);
    const file = await urlToFile(pin.image_url);
    await uploadFile(file);
    await humanBehavior.wait(3000, 5000);

    // 4. Fill Title
    console.log("Filling title...");
    const titleEl = await waitForElement(SELECTORS.titleInput);
    await humanBehavior.simulateMovement(titleEl);
    await humanBehavior.typeSlowly(titleEl, pin.title);
    await humanBehavior.hesitate();

    // 5. Fill Description
    console.log("Filling description...");
    const descEl = await waitForElement(SELECTORS.descriptionInput);
    if (!descEl) {
      throw new Error("Could not find Description field.");
    }

    await humanBehavior.simulateMovement(descEl);
    descEl.focus();
    await humanBehavior.wait(1000, 2000); // Stabilization delay
    await humanBehavior.typeSlowly(descEl, pin.description);
    await humanBehavior.hesitate();

    // 6. Fill Link
    console.log("Filling destination link...");
    const linkEl = await waitForElement(SELECTORS.linkInput);
    await humanBehavior.simulateMovement(linkEl);
    linkEl.focus();
    await humanBehavior.wait(1000, 1500); // Stabilization delay
    await humanBehavior.typeSlowly(linkEl, pin.link);
    await humanBehavior.hesitate();

    // 7. Select Board
    console.log("Selecting board:", pin.board);
    let boardBtn = await waitForElement(SELECTORS.boardDropdown);
    await humanBehavior.simulateMovement(boardBtn);

    // CHECK: Is the board already selected?
    const currentBoard = boardBtn.innerText?.trim().toLowerCase();
    if (currentBoard.includes(pin.board.toLowerCase())) {
      console.log(
        `Board "${pin.board}" is already selected. Skipping picker...`,
      );
    } else {
      console.log(
        `Current board is "${currentBoard}", switching to "${pin.board}"...`,
      );
      // Multi-click retry strategy for stubborn React components
      await humanClick(boardBtn);
      await humanBehavior.wait(1000, 2000);

      let boardSearch = document.querySelector(SELECTORS.boardSearch);
      if (!boardSearch) {
        console.log("Search field not found, retrying click...");
        await humanClick(boardBtn);
        await humanBehavior.wait(1000, 2000);
        boardSearch = document.querySelector(SELECTORS.boardSearch);
      }

      if (!boardSearch) {
        console.log(
          "Still no search field, searching by tag name as fallback...",
        );
        boardSearch = Array.from(document.querySelectorAll("input")).find(
          (el) =>
            el.placeholder?.toLowerCase().includes("search") ||
            el.getAttribute("aria-label")?.toLowerCase().includes("board"),
        );
      }

      if (!boardSearch) {
        scoutDOM();
        throw new Error("Could not find board search field.");
      }

      await humanBehavior.simulateMovement(boardSearch);
      await humanBehavior.typeSlowly(boardSearch, pin.board);
      await humanBehavior.wait(2000, 3000);

      // Find the board in the list
      console.log("Searching for board in results list...");
      let boardOptions = document.querySelectorAll(SELECTORS.boardRow);
      if (boardOptions.length === 0) {
        boardOptions = Array.from(
          document.querySelectorAll('div, [role="listitem"]'),
        ).filter((el) =>
          el.innerText?.toLowerCase().includes(pin.board.toLowerCase()),
        );
      }

      let found = false;
      for (const opt of boardOptions) {
        if (opt.innerText?.toLowerCase().includes(pin.board.toLowerCase())) {
          console.log(`Found matching board row, clicking...`);
          await humanClick(opt);
          found = true;
          break;
        }
      }

      if (!found && boardOptions.length > 0) {
        await humanClick(boardOptions[0]);
        found = true;
      }

      if (!found) {
        scoutDOM();
        throw new Error(`Could not find board: ${pin.board}.`);
      }
    }

    await humanBehavior.hesitate();

    // 8. Handle Native Pinterest Scheduling
    if (pin.scheduledTime) {
      console.log("Scheduling pin for:", pin.scheduledTime);
      const laterRadio =
        document.querySelector(SELECTORS.publishLaterRadio) ||
        Array.from(document.querySelectorAll("label")).find((el) =>
          el.innerText.includes("at a later date"),
        );

      if (laterRadio) {
        await humanClick(laterRadio);
        await humanBehavior.wait(1000, 2000);

        const pad = (n) => String(n).padStart(2, "0");
        const dateObj = new Date(pin.scheduledTime);

        // Round to nearest 30 mins
        let minutes = dateObj.getMinutes();
        if (minutes > 0 && minutes <= 30) {
          dateObj.setMinutes(30);
        } else if (minutes > 30) {
          dateObj.setMinutes(0);
          dateObj.setHours(dateObj.getHours() + 1);
        }

        const dateStr = `${pad(dateObj.getMonth() + 1)}/${pad(dateObj.getDate())}/${dateObj.getFullYear()}`;
        let h = dateObj.getHours();
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        const timeStr = `${pad(h)}:${pad(dateObj.getMinutes())} ${ampm}`;

        console.log(`[Flow] Target: Date=${dateStr}, Time=${timeStr}`);

        // --- PART 1: DATE ---
        const dateEl =
          document.querySelector(SELECTORS.dateInput) ||
          document.querySelector('[placeholder*="MM/DD/YYYY"]') ||
          document.querySelector('input[aria-label*="date"]');

        if (dateEl) {
          console.log("[Flow] Found Date field, typing...");
          dateEl.focus();
          document.execCommand("selectAll", false, null);
          await humanBehavior.typeSlowly(dateEl, dateStr);
          dateEl.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          );
          await humanBehavior.wait(1000, 1500);
        }

        // --- PART 2: TIME ---
        const timeEl =
          document.querySelector(SELECTORS.timeInput) ||
          document.querySelector('input[placeholder="Time"]') ||
          document.querySelector('input[aria-label*="time" i]') ||
          document.querySelector(
            'input[data-test-id="text-field"][placeholder="Time"]',
          );

        if (timeEl) {
          console.log(
            `[Flow] Found Time field, attempting selection for "${timeStr}"...`,
          );

          // 1. Try Direct Type (Matches successful Date/Title logic)
          timeEl.focus();
          document.execCommand("selectAll", false, null);
          await humanBehavior.typeSlowly(timeEl, timeStr);
          await humanBehavior.wait(300, 500);
          timeEl.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
          );
          await humanBehavior.wait(1000, 1500);

          // 2. Check if Dropdown is still open. If so, hunt for button
          let menuOptions = Array.from(
            document.querySelectorAll(
              'button[data-test-id="time-field-option"], [role="menuitem"], [role="option"]',
            ),
          );

          if (menuOptions.length === 0) {
            console.log(
              "[Flow] No dropdown visible, clicking box to force open...",
            );
            await humanClick(timeEl);
            await humanBehavior.wait(1500, 2000);
            menuOptions = Array.from(
              document.querySelectorAll(
                'button[data-test-id="time-field-option"], [role="menuitem"], [role="option"]',
              ),
            );
          }

          if (menuOptions.length > 0) {
            const cleanTarget = timeStr.replace(/^0/, "");
            const target = menuOptions.find((opt) => {
              const text = opt.textContent?.trim() || opt.innerText?.trim();
              return (
                text && (text.includes(timeStr) || text.includes(cleanTarget))
              );
            });

            if (target) {
              console.log(
                `[Flow] Dropdown found target "${target.textContent.trim()}". Deep clicking inner div...`,
              );
              target.scrollIntoView({ block: "center", behavior: "smooth" });
              await humanBehavior.wait(800, 1200);

              // Click button AND innermost DIV to force React update
              const inner = target.querySelector("div") || target;
              await humanClick(inner);
              await humanBehavior.wait(500, 800);
              await humanClick(target);
            }
          }
        }
        await humanBehavior.wait(1000, 1500);
      }
    }

    // 9. Click Publish/Schedule
    console.log("Attempting to publish/schedule...");
    const publishBtn =
      document.querySelector(SELECTORS.publishButton) ||
      document.querySelector(SELECTORS.genericPublish) ||
      Array.from(document.querySelectorAll("button")).find(
        (b) =>
          b.innerText.toLowerCase().includes("publish") ||
          b.innerText.toLowerCase().includes("save") ||
          b.innerText.toLowerCase().includes("schedule"),
      );

    if (!publishBtn) {
      scoutDOM();
      throw new Error("Could not find Publish button.");
    }

    await humanBehavior.simulateMovement(publishBtn);
    await humanClick(publishBtn);

    console.log("Wait for confirmation message...");
    let confirmed = false;
    for (let i = 0; i < 30; i++) {
      const success =
        document.querySelector(SELECTORS.saveSuccessMessage) ||
        document.body.innerText.includes("Saved") ||
        document.body.innerText.includes("Scheduled");
      if (success) {
        confirmed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (confirmed) {
      console.log("Success! Closing tab.");
      chrome.runtime.sendMessage({ action: "pinPostedSuccessfully" });
      setTimeout(() => window.close(), 1000);
    } else {
      console.warn(
        "No 'Saved' confirmation seen, but publish was clicked. Closing anyway to continue loop.",
      );
      chrome.runtime.sendMessage({ action: "pinPostedSuccessfully" });
      setTimeout(() => window.close(), 2000);
    }
  } catch (error) {
    console.error("CRITICAL AUTOMATION ERROR:", error);
    scoutDOM(); // Always scout on error
    alert(
      "Automation stopped: " +
        error.message +
        "\nCheck console for Scout details.",
    );
  }
}

/**
 * Helpers
 */

async function urlToFile(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  const filename = url.split("/").pop().split("?")[0] || "image.jpg";
  return new File([blob], filename, { type: blob.type });
}

async function uploadFile(file) {
  const input = document.querySelector(SELECTORS.fileInput);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function waitForElement(selector, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

// Start automation if on the pin builder page
if (location.href.includes("pin-builder")) {
  // Initial delay for page load
  setTimeout(automatePin, 3000);
}

function scoutDOM() {
  console.log("--- SCOUT DOM REPORT ---");
  console.log("Date Input:", document.querySelector(SELECTORS.dateInput));
  console.log("Time Input:", document.querySelector(SELECTORS.timeInput));
  console.log(
    "Publish/Schedule Button:",
    Array.from(document.querySelectorAll("button")).find(
      (b) =>
        b.innerText.toLowerCase().includes("publish") ||
        b.innerText.toLowerCase().includes("schedule"),
    ),
  );
  console.log(
    "Active Popups ([role='menu'], [role='listbox']):",
    document.querySelectorAll('[role="menu"], [role="listbox"]').length,
  );
  console.log(
    "All Role Options:",
    document.querySelectorAll(
      '[role="option"], [data-test-id="time-field-option"]',
    ).length,
  );
  console.log("Page Text Snippet:", document.body.innerText.substring(0, 500));
  console.log("-----------------------");
}
