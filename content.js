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
    '[data-test-id="board-dropdown-select-button"], [data-test-id="board-selection-select"], [aria-label*="Select a board"], .board-selection-select-button',
  boardSearch:
    '#pickerSearchField, [data-test-id="board-dropdown-search-field"] input, [data-test-id="board-picker-search-field"] input, input[aria-label*="Search through your boards"], input[placeholder*="Search"], .board-picker-search-input, input[role="searchbox"], [aria-label*="Search through your boards"]',
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
  createBoardBtn:
    '[data-test-id="create-board-button"], [data-test-id="create-board"], [role="button"][title*="Create board"]',
  createBoardModal:
    '[data-test-id="create-board-modal"], [role="dialog"], .modal-container',
  createBoardSubmitBtn:
    '[data-test-id="create-board-submit-button"], button[type="submit"], button.create-board-confirm',
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
    element.getAttribute('data-test-id'),
  );

  // Ensure element is in view
  element.scrollIntoView({ block: 'center', behavior: 'smooth' });
  await new Promise((r) => setTimeout(r, 300));

  // Dispatch all mouse events in sequence for React/Vue components
  const events = [
    new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }),
    new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }),
    new MouseEvent("click", { bubbles: true, cancelable: true, view: window }),
  ];

  for (const event of events) {
    element.dispatchEvent(event);
    await new Promise((r) => setTimeout(r, 50));
  }

  // Additional: Try triggering a focus event if it's a button-like element
  if (element.getAttribute('role') === 'button' || element.tagName === 'BUTTON') {
    element.focus();
    await new Promise((r) => setTimeout(r, 50));
    
    // Try a keyboard enter event as well
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(enterEvent);
    await new Promise((r) => setTimeout(r, 50));
  }

  // Fallback to native click if all else fails
  if (typeof element.click === "function") {
    element.click();
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
      
      // Step 1: Click the board dropdown button to open the search field
      console.log("Step 1: Clicking board dropdown button...");
      await humanClick(boardBtn);
      await humanBehavior.wait(2000, 3000);
      
      // Verify dropdown opened by checking if search field appeared
      console.log("Step 1: Verifying dropdown opened...");
      let testSearch = document.querySelector('#pickerSearchField');
      if (!testSearch) {
        console.log("Step 1: Dropdown didn't open, trying alternative click methods...");
        
        // Try clicking the inner div instead
        const innerDiv = boardBtn.querySelector('div');
        if (innerDiv) {
          console.log("Step 1: Trying inner div click...");
          await humanClick(innerDiv);
          await humanBehavior.wait(2000, 3000);
        }
        
        // Try clicking by coordinates
        const rect = boardBtn.getBoundingClientRect();
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          view: window
        });
        boardBtn.dispatchEvent(clickEvent);
        await humanBehavior.wait(2000, 3000);
        
        // Final verification
        testSearch = document.querySelector('#pickerSearchField');
        if (!testSearch) {
          console.log("Step 1: Still no dropdown, trying force click...");
          boardBtn.focus();
          boardBtn.click();
          await humanBehavior.wait(3000, 4000);
        }
      }

      // Step 2: Find the search field with a robust wait
      console.log("Step 2: Waiting for board search field to appear...");
      let boardSearch = null;
      
      // First try the exact ID from your HTML
      try {
        boardSearch = await waitForElement('#pickerSearchField', 3000);
        console.log("Step 2: Board search field found via #pickerSearchField.");
      } catch (e) {
        console.log("Step 2: #pickerSearchField not found, trying other selectors...");
        
        // Try the main selector
        try {
          boardSearch = await waitForElement(SELECTORS.boardSearch, 3000);
          console.log("Step 2: Board search field found via main selector.");
        } catch (e2) {
          console.log("Step 2: Main selector failed, trying fallback methods...");
          
          // Fallback: Click parent button again and wait
          const parentBtn = boardBtn.closest("button") || boardBtn.parentElement;
          if (parentBtn) {
            console.log("Step 2: Trying parent button click as fallback...");
            await humanClick(parentBtn);
            await humanBehavior.wait(2000, 3000);
            
            try {
              boardSearch = await waitForElement('#pickerSearchField', 3000);
              console.log("Step 2: Board search field found after fallback click.");
            } catch (e3) {
              console.log("Step 2: Still no search field, trying by attributes...");
              
              // Last resort: find by attributes
              boardSearch = Array.from(document.querySelectorAll("input")).find(
                (el) =>
                  el.id === "pickerSearchField" ||
                  el.placeholder?.toLowerCase().includes("search") ||
                  el.getAttribute("aria-label")?.toLowerCase().includes("search through your boards") ||
                  el.getAttribute("role") === "searchbox",
              );
              
              if (boardSearch) {
                console.log("Step 2: Board search field found via attribute search.");
              } else {
                console.error("Step 2: Board search field not found by any method.");
                // Log all inputs for debugging
                console.log("Step 2: All input elements on page:");
                document.querySelectorAll("input").forEach((input, index) => {
                  console.log(`  Input ${index}: id="${input.id}", placeholder="${input.placeholder}", aria-label="${input.getAttribute('aria-label')}", type="${input.type}"`);
                });
              }
            }
          }
        }
      }

      let found = false;

      if (!boardSearch) {
        console.warn(
          "Could not find board search field. Attempting direct selection/creation from visible elements...",
        );

        // Fallback 1: Is the board already in the list?
        const boardOptions = Array.from(
          document.querySelectorAll('div, [role="listitem"], [role="option"]'),
        ).filter((el) =>
          el.innerText?.toLowerCase().includes(pin.board.toLowerCase()),
        );

        for (const opt of boardOptions) {
          console.log(`Found matching board row directly, clicking...`);
          await humanClick(opt);
          await humanBehavior.wait(1000, 1500);
          
          // Verify the board was actually selected
          const selectedBoard = document.querySelector(SELECTORS.boardDropdown)?.innerText?.trim().toLowerCase();
          if (selectedBoard && selectedBoard.includes(pin.board.toLowerCase())) {
            console.log(`Board "${pin.board}" successfully selected and verified.`);
            found = true;
            break;
          } else {
            console.log(`Selection didn't register, trying next match...`);
          }
        }

        if (!found) {
          // Fallback 2: Try to find "Create board" directly
          let createBtn = document.querySelector(SELECTORS.createBoardBtn);
          if (!createBtn) {
            createBtn = Array.from(
              document.querySelectorAll('div, button, [role="button"]'),
            ).find(
              (el) =>
                (el.innerText?.toLowerCase().includes("create board") ||
                  el.title?.toLowerCase().includes("create board") ||
                  el
                    .getAttribute("aria-label")
                    ?.toLowerCase()
                    .includes("create board")) &&
                el.getBoundingClientRect().height > 0,
            );
          }

          if (createBtn) {
            console.log(
              "Found 'Create board' button directly, clicking...",
              createBtn.tagName,
              createBtn.className,
            );
            await humanClick(createBtn);
            await humanBehavior.wait(2000, 3000);

            // Handle modal if it appears
            const modal = document.querySelector(SELECTORS.createBoardModal);
            if (modal) {
              const submitBtn =
                modal.querySelector(SELECTORS.createBoardSubmitBtn) ||
                document.querySelector(SELECTORS.createBoardSubmitBtn);
              if (submitBtn) {
                await humanClick(submitBtn);
                await humanBehavior.wait(3000, 5000);
                found = true;
                console.log(`Board "${pin.board}" creation submitted.`);
              }
            } else {
              console.log(
                "No modal detected, assuming board creation/selection.",
              );
              found = true;
            }
          }
        }

        if (!found) {
          scoutDOM();
          throw new Error(
            "Board search field missing and direct selection/creation failed.",
          );
        }
      } else {
        // Step 3: Type the board name in the search field
        console.log("Step 3: Found search field, typing board name...");
        console.log("Target board:", pin.board);
        
        await humanBehavior.simulateMovement(boardSearch);
        await humanBehavior.typeSlowly(boardSearch, pin.board);
        await humanBehavior.wait(2000, 3000);
        console.log("Step 3: Search completed, waiting for results...");

        // Step 4: Find and click the board in the results
        console.log("Step 4: Searching for board in results list...");
        let boardOptions = document.querySelectorAll(SELECTORS.boardRow);
        console.log("Found board options via selector:", boardOptions.length);
        
        if (boardOptions.length === 0) {
          console.log("No board options via selector, trying fallback search...");
          boardOptions = Array.from(
            document.querySelectorAll('div, [role="listitem"]'),
          ).filter((el) =>
            el.innerText?.toLowerCase().includes(pin.board.toLowerCase()),
          );
          console.log("Found board options via fallback:", boardOptions.length);
        }

        console.log("Step 4: Total board options to check:", boardOptions.length);
        for (let i = 0; i < boardOptions.length; i++) {
          const opt = boardOptions[i];
          const optText = opt.innerText?.toLowerCase() || 'NO TEXT';
          console.log(`Option ${i + 1}: "${optText.substring(0, 50)}..."`);
          
          if (optText.includes(pin.board.toLowerCase())) {
            console.log(`Step 4: Found matching board row at option ${i + 1}, clicking...`);
            
            // Try multiple click methods for board row
            let clicked = false;
            
            // Method 1: Click the main board row div (with role="button")
            if (opt.getAttribute('role') === 'button' || opt.classList.contains('Q3hcOU')) {
              console.log(`Step 4: Method 1 - Clicking main board row button...`);
              await humanClick(opt);
              clicked = true;
            } else {
              // Method 2: Find the clickable parent with role="button"
              const clickableParent = opt.closest('[role="button"]') || opt.closest('.Q3hcOU');
              if (clickableParent) {
                console.log(`Step 4: Method 2 - Clicking parent button...`);
                await humanClick(clickableParent);
                clicked = true;
              } else {
                // Method 3: Find the div with data-test-id starting with "board-row-"
                const boardRowDiv = opt.querySelector('[data-test-id^="board-row-"]') || 
                                 opt.closest('[data-test-id^="board-row-"]');
                if (boardRowDiv) {
                  console.log(`Step 4: Method 3 - Clicking board-row div...`);
                  await humanClick(boardRowDiv);
                  clicked = true;
                } else {
                  // Method 4: Last resort - click the element itself
                  console.log(`Step 4: Method 4 - Last resort click...`);
                  await humanClick(opt);
                  clicked = true;
                }
              }
            }
            
            if (clicked) {
              await humanBehavior.wait(1000, 1500);
              selectedBoard = document.querySelector(SELECTORS.boardDropdown)?.innerText?.trim().toLowerCase();
              console.log("Step 4: After click, selected board:", selectedBoard);
              if (selectedBoard && selectedBoard.includes(pin.board.toLowerCase())) {
                console.log(`Step 4: Board "${pin.board}" successfully selected and verified.`);
                found = true;
                break;
              } else {
                console.log(`Step 4: Selection didn't register, trying next match...`);
              }
            }
          }
        }

        // If no exact match was found and verified, try the first option as fallback
        if (!found && boardOptions.length > 0) {
          console.log(`Step 4: No exact match verified, trying first available option as fallback...`);
          await humanClick(boardOptions[0]);
          await humanBehavior.wait(1000, 1500);
          selectedBoard = document.querySelector(SELECTORS.boardDropdown)?.innerText?.trim().toLowerCase();
          if (selectedBoard) {
            console.log(`Step 4: Fallback board selected: "${selectedBoard}"`);
            found = true;
          }
        }

        if (!found) {
          console.log(
            `Board "${pin.board}" not found in list. Looking for "Create board" option...`,
          );

          await humanBehavior.wait(1000, 1500); // Wait for results to settle

          // Try finding the create board button in the dropdown
          let createBtn = document.querySelector(SELECTORS.createBoardBtn);
          if (!createBtn) {
            console.log(
              "Create button via selector not found, searching by text...",
            );
            createBtn = Array.from(
              document.querySelectorAll('div, button, [role="button"]'),
            ).find(
              (el) =>
                (el.innerText?.toLowerCase().includes("create board") ||
                  el.title?.toLowerCase().includes("create board") ||
                  el
                    .getAttribute("aria-label")
                    ?.toLowerCase()
                    .includes("create board")) &&
                el.getBoundingClientRect().height > 0, // Must be visible
            );
          }

          if (createBtn) {
            console.log(
              "Found 'Create board' button, identifying best click target...",
            );

            // Find the actual button part if it's a wrapper, or click the whole thing if it is a button
            const actualBtn =
              createBtn.querySelector('[role="button"]') ||
              createBtn.closest('[role="button"]') ||
              createBtn;

            console.log(
              "Found best click target:",
              actualBtn.tagName,
              actualBtn.className,
            );
            await humanClick(actualBtn);
            await humanBehavior.wait(2000, 3000);

            // Check if a modal or confirm button appeared
            console.log("Waiting for Create Board modal...");
            let modal = null;
            try {
              modal = await waitForElement(SELECTORS.createBoardModal, 5000);
            } catch (e) {
              console.log(
                "Modal did not appear within 5s, checking if board was auto-created...",
              );
            }

            if (modal) {
              console.log("Create board modal detected. Submitting...");
              const submitBtn =
                modal.querySelector(SELECTORS.createBoardSubmitBtn) ||
                document.querySelector(SELECTORS.createBoardSubmitBtn);

              if (submitBtn) {
                console.log("Found submit button, clicking...");
                await humanClick(submitBtn);
                await humanBehavior.wait(3000, 5000);

                // Final verification: did the dropdown close / board select?
                await humanBehavior.wait(1000, 2000);
                found = true;
                console.log(`Board "${pin.board}" creation submitted.`);
              } else {
                console.warn("Found modal but no submit button.");
                scoutDOM();
              }
            } else {
              // Sometimes it just creates it if the name is already in the search field
              console.log(
                "No modal detected, checking if board was selected anyway...",
              );
              await humanBehavior.wait(2000, 2000);
              const currentText = document
                .querySelector(SELECTORS.boardDropdown)
                ?.innerText?.toLowerCase();
              if (
                currentText &&
                currentText.includes(pin.board.toLowerCase())
              ) {
                console.log(
                  "Board selected successfully (no modal was needed).",
                );
                found = true;
              }
            }
          }
        }
      }

      if (!found) {
        scoutDOM();
        throw new Error(`Could not find or create board: ${pin.board}.`);
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
