const NEWLINE = String.fromCharCode(10);
const DB_NAME = "testcase-builder-db";
const DB_VERSION = 1;
const STORE_NAME = "files";
const USERS_STORAGE_KEY = "testcase-builder-users";
const SESSION_STORAGE_KEY = "testcase-builder-session";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";
const APP_VERSION = "20260603-pepco-parser-cleanup";

const DEFAULT_COLUMNS = [
  "Test Case ID",
  "Module",
  "Scenario",
  "Preconditions",
  "User Role",
  "Step Number",
  "Steps",
  "Question / Field Label",
  "Expected Result",
  "Actual Result",
  "Status",
  "Priority",
  "Notes",
];

const DEFAULT_SELECTED_COLUMNS = [
  "Test Case ID",
  "Scenario",
  "User Role",
  "Step Number",
  "Steps",
  "Expected Result",
  "Actual Result",
  "Status",
  "Question / Field Label",
];

const COLUMN_FIELD_MAP = {
  "Test Case ID": "testCaseId",
  Module: "module",
  Scenario: "scenario",
  Preconditions: "preconditions",
  "User Role": "role",
  "Question / Field Label": "questionLabel",
  "Expected Result": "expected",
  "Actual Result": "actual",
  Status: "status",
  Priority: "priority",
  Notes: "notes",
};

const MULTILINE_FIELDS = new Set([
  "Preconditions",
  "Steps",
  "Question / Field Label",
  "Expected Result",
  "Actual Result",
  "Notes",
]);

const ICONS = {
  plus: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-10 0 1 15h10l1-15M10 11v6m4-6v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  file: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7l-4-4Zm0 0v4h4M9 13h6M9 17h6M9 9h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  grip: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  wand: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5M4 20 17 7l-4-4L1 16v4h3Zm13-16 3-3m-2 8 3 3M9 2v3M2 9h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const state = {
  selectedColumns: [...DEFAULT_SELECTED_COLUMNS],
  customColumn: "",
  customColumnPosition: "end",
  rowFormat: "each-step",
  moduleName: "Procurement",
  scenarioName: "Create and submit procurement request",
  fileName: "Procurement Test Case",
  savedFiles: [],
  activeSavedFile: null,
  currentPage: "builder",
  authMode: "local",
  authReady: false,
  currentUser: null,
  users: [],
  loginUsername: "",
  loginPassword: "",
  loginError: "",
  userFormName: "",
  userFormUsername: "",
  userFormPassword: "",
  userFormRole: "User",
  userManagementStatus: "",
  drag: null,
  screenshotFileName: "",
  screenshotPreview: "",
  screenshotText: "",
  screenshotStatus: "",
  screenshotDebug: "",
  screenshotVisualRadioGroups: [],
  screenshotHasVisualContinueButton: false,
  screenshotImportSerial: 0,
  lastScreenshotStepId: null,
  lastScreenshotImportKey: "",
  steps: [],
  exportContent: "",
  exportFileName: "",
  editingFileId: null,
};

state.steps = [createStep(1, state.moduleName, state.scenarioName, state.selectedColumns)];

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeNewlines(value) {
  return String(value || "")
    .replaceAll(String.fromCharCode(13) + String.fromCharCode(10), NEWLINE)
    .replaceAll(String.fromCharCode(13), NEWLINE);
}

function splitLines(value) {
  return normalizeNewlines(value)
    .split(NEWLINE)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(lines) {
  return lines.join(NEWLINE);
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminUser(user = state.currentUser) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function titleCase(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripWrappingQuotes(value) {
  return String(value || "")
    .trim()
    .replace(/^["']+|["']+$/g, "");
}

function getQuotedValue(value) {
  const match = String(value || "").match(/"([^"]+)"|'([^']+)'/);
  return match ? match[1] || match[2] : "";
}

function getQuotedValues(value) {
  return [...String(value || "").matchAll(/"([^"]+)"|'([^']+)'/g)]
    .map((match) => match[1] || match[2])
    .filter(Boolean);
}

function formatQuotedList(values) {
  const quoted = values.filter(Boolean).map((value) => `"${value}"`);
  if (quoted.length <= 1) return quoted[0] || '"the applicable option"';
  if (quoted.length === 2) return `${quoted[0]} and ${quoted[1]}`;
  return `${quoted.slice(0, -1).join(", ")}, and ${quoted[quoted.length - 1]}`;
}

function getStepArgument(raw, commandPattern) {
  const quoted = getQuotedValue(raw);
  if (quoted) return quoted.trim();

  const argument = stripWrappingQuotes(String(raw || "").replace(commandPattern, ""));
  return argument ? titleCase(argument) : "";
}

function formatFieldLabel(question, fallback = "applicable") {
  return question ? `"${question}"` : `the ${fallback}`;
}

function formatVisibleTarget(question, targetType) {
  if (!question) return `the expected ${targetType}`;
  const lower = question.toLowerCase();
  if (targetType === "form" && /\b(form|page|screen)\b/.test(lower)) return `"${question}"`;
  if (targetType === "task" && /\btask\b/.test(lower)) return `"${question}"`;
  return `"${question}" ${targetType}`;
}

function generateExpectedResult(stepText) {
  const lower = String(stepText || "").toLowerCase();
  if (lower.includes("process is completed") || lower.includes("process should be completed")) return "The process should be completed successfully.";
  if (lower.includes("submit task") || lower.includes("complete the review task")) {
    return "The task should be submitted successfully.";
  }
  if (lower.includes("tile") && (lower.includes("visible") || lower.includes("displayed"))) return "The tile should be visible on screen.";
  if (lower.includes("click") && lower.includes("risk review questions")) return "The risk review questions screen should be displayed successfully.";
  if (lower.includes("click") && lower.includes("review page")) return "The review page should be displayed successfully.";
  if (lower.includes("category type") && lower.includes("budget")) return "The category and budget details should be saved successfully.";
  if (lower.includes("answer all required") || lower.includes("risk review questions")) return "All required risk review questions should be answered successfully.";
  if (lower.includes("review page")) return "The review page should be displayed with the entered details.";
  if (lower.includes("progress section") || lower.includes("under the progress")) return "The submitted task should be visible under the Progress section.";
  if (lower.includes("assigned to") || lower.includes("assignment")) return "The task assignment should be displayed successfully.";
  if (lower.includes("final submission summary page")) return "The final submission summary page should be displayed successfully.";
  if (lower.includes("summary section displays")) {
    return "The Summary section should display the request title, type of engagement, request type, opportunity ID, and process details correctly.";
  }
  if (lower.includes("process details") && lower.includes("estimated duration")) {
    return "The Process details section should display the estimated duration and process steps correctly.";
  }
  if (lower.includes("field displays") || lower.includes("field shows")) return "The field should display the expected value.";
  if (lower.includes("informational message")) return "The informational message should be displayed successfully.";
  if (
    lower.includes("supplier name is") ||
    lower.includes("supplier details") ||
    lower.includes("selected supplier") ||
    (lower.includes("supplier") && lower.includes("displayed"))
  ) {
    return "The supplier details should be displayed correctly.";
  }
  if (lower.includes("url") || lower.includes("portal")) return "The application page should load successfully.";
  if (lower.includes("login") || lower.includes("log in")) return "The user should be logged into the application successfully.";
  if (lower.includes("logout")) return "The user should be logged out successfully.";
  if (lower.includes("upload a valid document")) return "The valid document should be uploaded successfully.";
  if (/\bdocuments?\b/.test(lower) && lower.includes("select")) return "The required document should be selected successfully.";
  if (lower.includes("assignee")) return "The selected assignee should be applied successfully.";
  if (lower.includes("select") && lower.includes("dropdown field")) return "The selected dropdown value should be applied successfully.";
  if (lower.includes("dropdown")) return "The dropdown options should be available successfully.";
  if (lower.includes("select") && (lower.includes(" and ") || lower.includes("multiple"))) return "The selected options should be applied successfully.";
  if (lower.includes("auto-populated")) return "The field should be auto-populated correctly.";
  if (lower.includes("toggle")) return "The toggle value should be updated successfully.";
  if (lower.includes("search for") && lower.includes("select")) return "The matching search result should be selected successfully.";
  if (lower.includes("request number")) return "The request number should be captured successfully.";
  if (lower.includes("expected email")) return "The expected email should be received successfully.";
  if (lower.includes("otp")) return "The OTP validation should be completed successfully.";
  if (lower.includes("submit")) return "The request should be submitted successfully.";
  if (lower.includes("upload")) return "The document should be uploaded successfully.";
  if (lower.includes("select")) return "The selected option should be applied successfully.";
  if (lower.includes("click") || lower.includes("open") || lower.includes("navigate") || lower.includes("go to")) return "The user should be navigated to the expected screen successfully.";
  if (lower.includes("enter") || lower.includes("fill") || lower.includes("clear the value")) return "The field value should be saved successfully.";
  if (lower.includes("approve")) return "The request should be approved successfully.";
  if (lower.includes("reject")) return "The request should be rejected successfully.";
  if (lower.includes("task") && (lower.includes("visible") || lower.includes("displayed"))) return "The task should be visible on screen.";
  if (lower.includes("form") && (lower.includes("visible") || lower.includes("displayed"))) return "The form should be visible on screen.";
  if (lower.includes("visible") || lower.includes("displayed") || lower.includes("shown") || lower.includes("appears")) {
    return "The relevant form or information should be visible on the screen.";
  }
  if (lower.includes("screen")) return "The expected screen should be displayed successfully.";
  if (lower.includes("verify") || lower.includes("validate")) return "The form or information should be displayed and validated successfully.";
  return "The step should be completed successfully.";
}

function generateActualResult(expectedResult) {
  const text = String(expectedResult || "").trim();
  if (!text) return "The step was completed successfully.";
  return text
    .replace(/^The user should be/i, "The user was")
    .replace(/^The process should be/i, "The process was")
    .replace(/^The task should be/i, "The task was")
    .replace(/^The tile should be/i, "The tile was")
    .replace(/^The risk review questions screen should be/i, "The risk review questions screen was")
    .replace(/^The category and budget details should be/i, "The category and budget details were")
    .replace(/^All required risk review questions should be/i, "All required risk review questions were")
    .replace(/^The review page should be/i, "The review page was")
    .replace(/^The submitted task should be/i, "The submitted task was")
    .replace(/^The task assignment should be/i, "The task assignment was")
    .replace(/^The final submission summary page should be/i, "The final submission summary page was")
    .replace(/^The Summary section should display/i, "The Summary section displayed")
    .replace(/^The Summary section should be/i, "The Summary section was")
    .replace(/^The Process details section should display/i, "The Process details section displayed")
    .replace(/^The Process details section should be/i, "The Process details section was")
    .replace(/^The field should display/i, "The field displayed")
    .replace(/^The informational message should be/i, "The informational message was")
    .replace(/^The supplier details should be/i, "The supplier details were")
    .replace(/^The application page should be/i, "The application page was")
    .replace(/^All required details should be/i, "All required details were")
    .replace(/^All selected values and uploaded documents should be/i, "All selected values and uploaded documents were")
    .replace(/^All required documents should be/i, "All required documents were")
    .replace(/^All required fields should be/i, "All required fields were")
    .replace(/^The expected form, task, or information should be/i, "The expected form, task, or information was")
    .replace(/^All selected options should be/i, "All selected options were")
    .replace(/^All entered or selected information should be/i, "All entered or selected information was")
    .replace(/^All steps in the form or page should be/i, "All steps in the form or page were")
    .replace(/^The selected options should be/i, "The selected options were")
    .replace(/^The selected option should be/i, "The selected option was")
    .replace(/^The entered information should be/i, "The entered information was")
    .replace(/^The field value should be/i, "The field value was")
    .replace(/^The field should be/i, "The field was")
    .replace(/^The toggle value should be/i, "The toggle value was")
    .replace(/^The matching search result should be/i, "The matching search result was")
    .replace(/^The request number should be/i, "The request number was")
    .replace(/^The expected email should be/i, "The expected email was")
    .replace(/^The OTP validation should be/i, "The OTP validation was")
    .replace(/^The request should be/i, "The request was")
    .replace(/^The document should be/i, "The document was")
    .replace(/^The valid document should be/i, "The valid document was")
    .replace(/^The required document should be/i, "The required document was")
    .replace(/^The selected assignee should be/i, "The selected assignee was")
    .replace(/^The selected dropdown value should be/i, "The selected dropdown value was")
    .replace(/^The dropdown options should be/i, "The dropdown options were")
    .replace(/^The task should be/i, "The task was")
    .replace(/^The form should be/i, "The form was")
    .replace(/^The relevant form or information should be/i, "The relevant form or information was")
    .replace(/^The expected screen should be/i, "The expected screen was")
    .replace(/^The form or information should be/i, "The form or information was")
    .replace(/^The expected output should be/i, "The expected output was")
    .replace(/^The step should be/i, "The step was");
}

function joinSentenceFragments(lines) {
  return splitLines(joinLines(lines))
    .map((line) => line.replace(/[.。]+$/g, "").trim())
    .filter(Boolean)
    .join(". ");
}

function generateGroupedExpectedResult(enhancedLines) {
  const lines = splitLines(joinLines(enhancedLines));
  const combined = lines.join(" ").toLowerCase();

  if (!lines.length) return "The form or page step should be completed successfully.";
  if (combined.includes("submit task")) return "All required details should be completed and the task should be submitted successfully.";
  if (combined.includes("submit")) return "All required details should be completed and the request should be submitted successfully.";
  if (combined.includes("upload") && combined.includes("select")) return "All selected values and uploaded documents should be saved successfully.";
  if (combined.includes("upload")) return "All required documents should be uploaded successfully.";
  if (combined.includes("auto-populated")) return "All required fields should be displayed or auto-populated correctly.";
  if (combined.includes("visible") || combined.includes("displayed")) return "The expected form, task, or information should be visible on screen.";
  if (combined.includes("dropdown") || combined.includes("select")) return "All selected options should be applied successfully.";
  if (combined.includes("enter") || combined.includes("fill") || combined.includes("search")) return "All entered or selected information should be saved successfully.";
  if (combined.includes("click") || combined.includes("navigate") || combined.includes("go to") || combined.includes("open")) {
    return "The user should be navigated to the expected screen successfully.";
  }

  return "All steps in the form or page should be completed successfully.";
}

function localEnhanceStep(text, question = "") {
  const raw = String(text || "").trim();
  const cleanQuestion = String(question || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return "";

  const alreadyEnhancedPrefixes = [
    "for the question ",
    "enter the required value in the ",
    "enter a valid value in the ",
    "enter \"",
    "fill in the ",
    "select a valid date",
    "verify that ",
    "open the ",
    "open browser",
    "click ",
    "go to ",
    "navigate to ",
    "review the ",
    "observe the ",
    "answer the ",
    "answer all required",
    "clear the value",
    "search for ",
    "capture the request number",
    "verify receipt",
    "enter valid otp",
    "assign the task",
    "for the \"",
    "upload the required document",
    "upload a valid document",
    "submit the request",
    "approve the request",
    "reject the request",
  ];

  if (/^select\s+"[^"]+"\s+from\s+/i.test(raw) || alreadyEnhancedPrefixes.some((prefix) => lower.startsWith(prefix))) {
    return raw.endsWith(".") ? raw : `${raw}.`;
  }

  if (lower.startsWith("dropdown")) {
    const selectedValue = getStepArgument(raw, /^dropdown\s*/i);
    if (selectedValue) {
      return cleanQuestion
        ? `Select "${selectedValue}" from the "${cleanQuestion}" dropdown field.`
        : `Select "${selectedValue}" from the dropdown field.`;
    }
    return cleanQuestion
      ? `Open the "${cleanQuestion}" dropdown field and verify that the expected options are available.`
      : "Open the dropdown field and verify that the expected options are available.";
  }

  if (lower.startsWith("category ")) {
    const categoryName = getQuotedValue(raw) || getStepArgument(raw, /^category\s*/i);
    return cleanQuestion
      ? `Select the recommended category "${categoryName || "applicable category"}" for the "${cleanQuestion}" field.`
      : `Select the category "${categoryName || "applicable category"}".`;
  }

  if (lower.startsWith("url ") || lower.startsWith("open url") || lower === "open portal") {
    const targetUrl = getStepArgument(raw, /^(url|open url|open portal)\s*/i);
    return targetUrl ? `Open browser and enter URL: ${targetUrl}.` : "Open the application portal in the browser.";
  }

  if (lower === "login" || lower.startsWith("login ")) {
    return "Log in using valid user credentials.";
  }

  if (lower.startsWith("click ")) {
    const clickTarget = getStepArgument(raw, /^click\s*/i);
    if (cleanQuestion) return `Click "${clickTarget || cleanQuestion}" for the "${cleanQuestion}" field.`;
    return `Click the "${clickTarget || "applicable"}" button.`;
  }

  if (lower.startsWith("button ")) {
    const buttonName = getStepArgument(raw, /^button\s*/i);
    return `Click the "${buttonName || "applicable"}" button.`;
  }

  if (lower.startsWith("info ")) {
    const message = getStepArgument(raw, /^info\s*/i);
    return message ? `Verify that the informational message "${message}" is displayed.` : "Verify that the informational message is displayed.";
  }

  if (lower.startsWith("supplier detail ")) {
    const detail = getQuotedValue(raw) || getStepArgument(raw, /^supplier detail\s*/i);
    return detail ? `Verify that the selected supplier details show ${detail}.` : "Verify that the selected supplier details are displayed.";
  }

  if (lower.startsWith("supplier contact ")) {
    const contact = getQuotedValue(raw) || getStepArgument(raw, /^supplier contact\s*/i);
    return contact
      ? `Verify that contact "${contact}" is displayed for the selected supplier.`
      : "Verify that the selected supplier contact is displayed.";
  }

  if (lower.startsWith("supplier enabled")) {
    return "Verify that the selected supplier is enabled for purchasing.";
  }

  if (lower.startsWith("supplier ")) {
    const supplierName = getStepArgument(raw, /^supplier\s*/i);
    return cleanQuestion
      ? `Verify that "${supplierName || cleanQuestion}" is displayed in the "${cleanQuestion}" section.`
      : `Verify that the selected supplier "${supplierName || "applicable supplier"}" is displayed.`;
  }

  if (lower.startsWith("tile ")) {
    const tileName = getStepArgument(raw, /^tile\s*/i);
    return `Click on the "${tileName || cleanQuestion || "applicable"}" tile from the dashboard.`;
  }

  if (lower.startsWith("tab ")) {
    const tabName = getStepArgument(raw, /^tab\s*/i);
    return `Go to the "${tabName || cleanQuestion || "applicable"}" tab.`;
  }

  if (lower.startsWith("section ")) {
    const sectionName = getStepArgument(raw, /^section\s*/i);
    return `Navigate to the "${sectionName || cleanQuestion || "applicable"}" section.`;
  }

  if (lower.startsWith("navigate ")) {
    const destination = getStepArgument(raw, /^navigate\s*/i);
    return `Navigate to the "${destination || cleanQuestion || "applicable"}" screen.`;
  }

  if (lower.startsWith("go ")) {
    const destination = getStepArgument(raw, /^go\s*/i);
    return `Go to the "${destination || cleanQuestion || "applicable"}" screen.`;
  }

  if (lower.startsWith("start task")) {
    const taskName = getStepArgument(raw, /^start task\s*/i) || cleanQuestion;
    return `Click on "Start" for the "${taskName || "applicable"}" task.`;
  }

  if (lower.startsWith("submit task")) {
    return cleanQuestion ? `Click the "Submit task" button for the "${cleanQuestion}" task.` : 'Click the "Submit task" button.';
  }

  if (lower.startsWith("task ")) {
    const taskName = getStepArgument(raw, /^task\s*/i) || cleanQuestion;
    if (lower.includes("verify") || lower.includes("visible") || lower.includes("screen") || lower.includes("displayed")) {
      return `Verify that ${formatVisibleTarget(cleanQuestion || taskName, "task")} is visible on screen.`;
    }
    if (lower.includes("start")) return `Click on "Start" for the "${taskName}" task.`;
    return `Navigate to the "${taskName || "applicable"}" task in the request overview.`;
  }

  if (lower.startsWith("question ") && (lower.includes("verify") || lower.includes("visible") || lower.includes("screen") || lower.includes("displayed"))) {
    return cleanQuestion ? `Verify that the question "${cleanQuestion}" is visible on screen.` : "Verify that the expected question is visible on screen.";
  }

  if (lower.startsWith("field ") && (lower.includes("verify") || lower.includes("visible") || lower.includes("screen") || lower.includes("displayed"))) {
    return cleanQuestion ? `Verify that the "${cleanQuestion}" field is visible on screen.` : "Verify that the expected field is visible on screen.";
  }

  if (lower.startsWith("toggle ")) {
    const toggleValue = getStepArgument(raw, /^toggle\s*/i) || "the applicable value";
    return cleanQuestion ? `Set the "${cleanQuestion}" toggle to "${toggleValue}".` : `Set the toggle to "${toggleValue}".`;
  }

  if (lower.startsWith("auto") || lower.startsWith("autopopulated") || lower.startsWith("auto-populated")) {
    const expectedValue = getQuotedValue(raw) || getStepArgument(raw, /^(auto-populated|autopopulated|auto)\s*/i);
    if (expectedValue) return `Verify that the "${cleanQuestion || "applicable"}" field is auto-populated with "${expectedValue}".`;
    return `Verify that the "${cleanQuestion || "applicable"}" field is auto-populated correctly.`;
  }

  if (lower.startsWith("document") || lower.startsWith("doc ")) {
    const documentName = getStepArgument(raw, /^(document|doc)\s*/i);
    if (documentName) {
      return cleanQuestion
        ? `For the "${cleanQuestion}", select the "${documentName}" document.`
        : `Select the "${documentName}" document.`;
    }
    return cleanQuestion ? `For the "${cleanQuestion}", upload a valid document.` : "Upload a valid document.";
  }

  if (lower.startsWith("upload document") || lower === "upload valid document") {
    return cleanQuestion ? `For the "${cleanQuestion}", upload a valid document.` : "Upload a valid document.";
  }

  if (lower.startsWith("assignee") || lower.startsWith("assign ")) {
    const assigneeName = getStepArgument(raw, /^(assignee|assign)\s*/i);
    const assigneeField = cleanQuestion || "Assignee";
    if (assigneeName) return `Select "${assigneeName}" from the "${assigneeField}" assignee field.`;
    return `Open the "${assigneeField}" assignee field and select the applicable user.`;
  }

  if (lower.startsWith("date")) {
    const dateValue = getStepArgument(raw, /^date\s*/i);
    const target = cleanQuestion ? `"${cleanQuestion}" date field` : "the applicable date field";
    return dateValue ? `Select "${dateValue}" in the ${target}.` : `Select a valid date in the ${target}.`;
  }

  if (lower.startsWith("search select ") || lower.startsWith("search and select ")) {
    const searchValue = getStepArgument(raw, /^(search select|search and select)\s*/i);
    return cleanQuestion
      ? `Search for and select "${searchValue || "the relevant option"}" in the "${cleanQuestion}" field.`
      : `Search for and select "${searchValue || "the relevant option"}" in the applicable field.`;
  }

  if (lower.startsWith("search location")) {
    return cleanQuestion
      ? `Search for and select the delivery location in the "${cleanQuestion}" field.`
      : "Search for and select the delivery location.";
  }

  if (lower.startsWith("search ")) {
    const searchValue = getStepArgument(raw, /^search\s*/i);
    return cleanQuestion
      ? `Search for "${searchValue || "the required value"}" in the "${cleanQuestion}" field.`
      : `Search for "${searchValue || "the required value"}" in the applicable field.`;
  }

  if (lower.startsWith("clear")) {
    return cleanQuestion ? `Clear the value from the "${cleanQuestion}" field.` : "Clear the value from the applicable field.";
  }

  if (lower.startsWith("review summary") || lower === "summary") {
    return cleanQuestion ? `Review the information on the "${cleanQuestion}" summary page.` : 'Review the information on the "Summary" page.';
  }

  if (lower.startsWith("observe ")) {
    const observedItem = getStepArgument(raw, /^observe\s*/i);
    return cleanQuestion ? `Observe the "${cleanQuestion}" section and verify the displayed details.` : `Observe the "${observedItem || "applicable"}" section.`;
  }

  if (lower.startsWith("request number")) {
    return "Capture the request number for reference during test execution.";
  }

  if (lower.startsWith("email")) {
    return cleanQuestion
      ? `Verify receipt of the expected email for the "${cleanQuestion}" task.`
      : "Verify receipt of the expected email in the supplier inbox.";
  }

  if (lower.startsWith("otp")) {
    return "Enter valid OTP and continue to the supplier portal.";
  }

  if (lower.includes("form") && (lower.includes("verify") || lower.includes("visible") || lower.includes("screen") || lower.includes("displayed"))) {
    return `Verify that ${formatVisibleTarget(cleanQuestion, "form")} is visible on screen.`;
  }

  if (lower.includes("task") && (lower.includes("verify") || lower.includes("visible") || lower.includes("screen") || lower.includes("displayed"))) {
    return `Verify that ${formatVisibleTarget(cleanQuestion, "task")} is visible on screen.`;
  }

  if (lower.includes("select yes")) {
    return cleanQuestion ? `For the question "${cleanQuestion}", select "Yes".` : 'Select "Yes" for the applicable question.';
  }
  if (lower.includes("select no")) {
    return cleanQuestion ? `For the question "${cleanQuestion}", select "No".` : 'Select "No" for the applicable question.';
  }
  if (lower.startsWith("select multiple ")) {
    const selectedValues = getQuotedValues(raw);
    const selectedText = selectedValues.length ? formatQuotedList(selectedValues) : formatQuotedList([getStepArgument(raw, /^select multiple\s*/i)]);
    return cleanQuestion ? `For the question "${cleanQuestion}", select ${selectedText}.` : `Select ${selectedText} from the available options.`;
  }
  if (lower.startsWith("select ")) {
    const selectedValues = getQuotedValues(raw);
    if (selectedValues.length > 1) {
      const selectedText = formatQuotedList(selectedValues);
      return cleanQuestion ? `For the question "${cleanQuestion}", select ${selectedText}.` : `Select ${selectedText} from the available options.`;
    }
    const selectedValue = getStepArgument(raw, /^select\s*/i) || "the applicable option";
    return cleanQuestion ? `For the question "${cleanQuestion}", select "${selectedValue}".` : `Select "${selectedValue}" from the available options.`;
  }
  if (lower.startsWith("enter ") || lower === "enter") {
    const enteredValue = getStepArgument(raw, /^enter\s*/i);
    if (cleanQuestion && enteredValue) return `Enter "${enteredValue}" in the "${cleanQuestion}" field.`;
    if (cleanQuestion) return `Enter a valid value in the "${cleanQuestion}" field.`;
    return `Enter the required value in the ${enteredValue || "applicable"} field.`;
  }
  if (lower.startsWith("type ") || lower.startsWith("input ")) {
    const enteredValue = getStepArgument(raw, /^(type|input)\s*/i) || "the required value";
    return cleanQuestion ? `Enter "${enteredValue}" in the "${cleanQuestion}" field.` : `Enter "${enteredValue}" in the applicable field.`;
  }
  if (lower.startsWith("fill ")) {
    const fieldValue = getStepArgument(raw, /^fill\s*/i) || "the required";
    return cleanQuestion ? `Fill in the "${cleanQuestion}" field with "${fieldValue}".` : `Fill in the ${fieldValue} details.`;
  }
  if (lower.startsWith("verify")) {
    return cleanQuestion
      ? `Verify that the ${cleanQuestion} form or information is displayed successfully.`
      : "Verify that the expected form or information is displayed successfully.";
  }
  if (
    lower.includes("form is visible") ||
    lower.includes("screen is visible") ||
    lower.includes("page is visible") ||
    lower.includes("is visible") ||
    lower.includes("displayed") ||
    lower.includes("shown")
  ) {
    return cleanQuestion ? `Verify that the ${cleanQuestion} is visible successfully.` : "Verify that the expected form or information is visible successfully.";
  }
  if (lower.includes("upload")) return "Upload the required document and verify that the file is attached successfully.";
  if (lower.includes("submit")) return "Submit the request and verify that the submission is successful.";
  if (lower.includes("approve")) return "Approve the request and verify that the approval is recorded successfully.";
  if (lower.includes("reject")) return "Reject the request and verify that the rejection is recorded successfully.";
  return raw.endsWith(".") ? raw : `${raw}.`;
}

function enhanceMultilineSteps(stepText, questionText) {
  const { steps, questions } = normalizeDraftStepPairs(splitLines(stepText), splitLines(questionText));
  return joinLines(steps.map((step, index) => localEnhanceStep(step, questions[index] || questions[0] || "")));
}

function isVisibleFieldDraftStep(step) {
  return /^(field|dropdown|date|assignee|supplier|document)\b.*\b(verify|visible|screen|available|upload)$/i.test(String(step || "").trim());
}

const KNOWN_CHOICE_QUESTION_BY_VALUE = [
  {
    pattern: /^(full buying process\s*\(purchase transaction\)|indicative budgetary quote|customer bid assistance)$/i,
    question: "What's the purpose of this request?",
  },
  {
    pattern: /^(single customer|multi-customer pool|kyndryl internal use)$/i,
    question: "Type of engagement supported/ will be supported by the Supplier",
  },
  {
    pattern: /^(sales opportunity|delivery fulfillment)$/i,
    question: "Is this request for a sales opportunity or delivery fulfillment",
  },
  {
    pattern: /^(new purchase|resale|renewal)$/i,
    question: "Request type",
  },
];

function inferQuestionForChoiceValue(value) {
  const cleanValue = cleanOcrDisplayValue(value);
  return KNOWN_CHOICE_QUESTION_BY_VALUE.find((item) => item.pattern.test(cleanValue))?.question || "";
}

function cleanKnownChoiceValue(value) {
  const cleanValue = cleanChoiceOptionValue(value);
  return inferQuestionForChoiceValue(cleanValue) ? cleanValue : "";
}

function normalizeDraftPairForPreview(step, question) {
  const cleanQuestion = cleanOcrLabel(question);
  let cleanStep = String(step || "").trim();
  const dateMatch = cleanStep.match(/^date\s+"(.+)"$/i);
  const typeMatch = cleanStep.match(/^type\s+"(.+)"$/i);

  if (dateMatch) cleanStep = `date "${cleanDateDisplayValue(dateMatch[1])}"`;
  if (typeMatch && isAmountLikeFieldLabel(cleanQuestion)) cleanStep = `type "${cleanAmountDisplayValue(typeMatch[1])}"`;
  if (typeMatch && /opportunity number/i.test(cleanQuestion)) cleanStep = `type "${cleanOpportunityNumberValue(typeMatch[1])}"`;

  return { step: cleanStep, question: cleanQuestion };
}

function isScreenTitleQuestionLabel(question) {
  const cleanQuestion = cleanOcrLabel(question);
  return Boolean(cleanQuestion) && !isLikelyQuestionLabel(cleanQuestion) && !isLikelyFieldLabel(cleanQuestion) && !isChoiceFieldLabel(cleanQuestion);
}

function normalizeDraftStepPairs(stepLines, questionLines) {
  const steps = [];
  const questions = [];

  (stepLines || []).forEach((step, index) => {
    const question = (questionLines || [])[index] || "";
    if (isEmptyOptionalParsedField({ step, question })) return;

    const questionChoiceValue = cleanKnownChoiceValue(question);
    const selectedValues = getQuotedValues(step);
    const knownSelectedValues = uniqueValues([questionChoiceValue, ...selectedValues.map(cleanKnownChoiceValue)].filter(Boolean));
    const shouldRepairMisplacedKnownChoices =
      knownSelectedValues.length &&
      (isScreenTitleQuestionLabel(question) || isMalformedChoiceQuestionLabel(question) || Boolean(questionChoiceValue)) &&
      (/^select\b/i.test(String(step || "")) || isVisibleFieldDraftStep(step));

    if (shouldRepairMisplacedKnownChoices) {
      knownSelectedValues.forEach((value) => {
        steps.push(`select "${value}"`);
        questions.push(inferQuestionForChoiceValue(value));
      });
      return;
    }

    const shouldSplitInferredChoices =
      /^select multiple\s+/i.test(String(step || "")) &&
      selectedValues.length > 1 &&
      (isScreenTitleQuestionLabel(question) || isMalformedChoiceQuestionLabel(question));

    if (shouldSplitInferredChoices) {
      const inferred = selectedValues.map((value) => ({ value, question: inferQuestionForChoiceValue(value) }));
      if (inferred.every((item) => item.question)) {
        inferred.forEach((item) => {
          steps.push(`select "${item.value}"`);
          questions.push(item.question);
        });
        return;
      }
    }

    if (/^select\s+("?)(new purchase|resale|renewal)\1$/i.test(String(step || "").trim()) && isMalformedChoiceQuestionLabel(question)) {
      steps.push(step);
      questions.push("Request type");
      return;
    }

    if (/^document\b/i.test(String(step || "").trim()) && isStandaloneUploadDropzoneLine(question)) {
      steps.push(step);
      questions.push("Upload additional documents (if any)");
      return;
    }

    if (/^assignee\b/i.test(String(step || "").trim()) && isStandaloneUserPickerLine(question)) {
      steps.push(step);
      questions.push("Add watchers (if any)");
      return;
    }

    const visibleChoiceValue = cleanKnownChoiceValue(question);
    if (visibleChoiceValue && /^(verify|form|question)\b/i.test(String(step || "").trim())) {
      steps.push(`select "${visibleChoiceValue}"`);
      questions.push(inferQuestionForChoiceValue(visibleChoiceValue));
      return;
    }

    steps.push(step);
    questions.push(question);
  });

  for (let index = 0; index < steps.length - 1; index += 1) {
    const mergedNextQuestion = splitValueAndTrailingFieldLabel(questions[index + 1]);
    if (!mergedNextQuestion || !isVisibleFieldDraftStep(steps[index])) continue;
    if (getScreenshotFieldType(questions[index]) === "question") continue;

    steps[index] = createScreenshotStepForValue(questions[index], mergedNextQuestion.value).step;
    questions[index + 1] = mergedNextQuestion.label;
  }

  const cleanedPairs = steps
    .map((step, index) => normalizeDraftPairForPreview(step, questions[index] || ""))
    .filter((item) => !isEmptyOptionalParsedField(item));

  return orderKnownDraftStepPairs(
    cleanedPairs.map((item) => item.step),
    cleanedPairs.map((item) => item.question),
  );
}

function isButtonLikeText(line) {
  return /^(continue|submit|submit task|start|save|next|done|complete|add supplier|new supplier onboarding|ignore matches|get started|finish|approve|reject|initiate board approvals)$/i.test(
    line,
  );
}

function isLikelyStandaloneValue(line) {
  if (!line) return false;
  if (/^(yes|no)$/i.test(line)) return true;
  if (/^[A-Z][A-Za-z .,&()/-]{1,60}$/.test(line) && line.split(/\s+/).length <= 7) return true;
  if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(line)) return true;
  if (/^\d+([.,]\d+)?$/.test(line)) return true;
  return false;
}

const OCR_SELECTED_MARKER_PATTERN = /[•©®●◉☑✓✔■◆◘]/;
const OCR_SELECTED_MARKER_REPLACE_PATTERN = /[•©®●◉☑✓✔■◆◘]/g;
const OCR_UNSELECTED_MARKER_PATTERN = /(^|\s)[oO0○◯◌☐□](?=\s+(yes|no|high|medium|low|n\/a|na|not applicable)\b)/gi;
const OCR_OPTION_VALUES = new Set(["yes", "no", "high", "medium", "low", "n/a", "na", "not applicable"]);
const CHOICE_OPTION_PREFIXES = new Set([
  "yes",
  "no",
  "high",
  "medium",
  "low",
  "n/a",
  "na",
  "not applicable",
  "none of the above",
  "direct payment",
  "employee reimbursement",
  "corporate card",
  "existing supplier",
  "new supplier onboarding",
  "indicative budgetary quote",
  "full buying process (purchase transaction)",
  "customer bid assistance",
]);

function normalizeOcrLine(line) {
  return String(line || "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\bAl(?=\s+Agent\b)/g, "AI")
    .replace(/\bAl\b/g, "AI")
    .replace(/^\|\s*/g, "I ")
    .replace(/\s+x$/i, "")
    .replace(/[|]\s*/g, " | ")
    .replace(/\s+/g, " ")
    .replace(/^[*-]\s*/, "")
    .trim();
}

function cleanOcrDisplayValue(value) {
  return normalizeOcrLine(value)
    .replace(/^[\d.]+\s*,?\s+(?=[A-Za-z])/, "")
    .replace(/^[A-Z]{1,3}\s+(?=[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?\s*\()/, "")
    .replace(/^[iI1B]\s+(?=To\b)/, "")
    .replace(/\s+[vViIl1\]]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAutoPopulatedFieldValue(value) {
  return cleanOcrDisplayValue(value)
    .replace(/\s+\b(?:ww|w|x|v)\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOcrLabel(value) {
  return cleanOcrDisplayValue(value)
    .replace(/\s+\d+\s+(?:indicative budgetary quote|full buying process\s*\(purchase transaction\)|customer bid assistance)\s*$/i, "")
    .replace(/\s+\(\s*\?\s*\)\s*$/g, "")
    .replace(/\s*[®©ⓘ]\s*$/g, "")
    .replace(/\s*[~^˄˅⌃⌄]\s*$/g, "")
    .replace(/\s+[A-Z]\s*$/i, (match, offset, fullText) =>
      /\b(process|details|requirements?|section|assessment|review|summary|intake)\s*$/i.test(fullText.slice(0, offset)) ? "" : match,
    )
    .replace(/\s+[&]\s*$/g, "")
    .replace(/\s+[oO0○◯◌☐□]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDateDisplayValue(value) {
  const clean = cleanOcrDisplayValue(value).replace(/\s+[@©®?\]]+$/g, "").trim();
  const matches = [
    ...clean.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\s*,?\s*(\d{4})\b/gi),
  ];
  if (!matches.length) return clean;

  const values = [];
  const seen = new Set();
  matches.forEach((match) => {
    const value = `${titleCase(match[1])} ${Number(match[2])}, ${match[3]}`;
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      values.push(value);
    }
  });

  return values.length > 1 ? `${values[0]} to ${values[1]}` : values[0];
}

function normalizeCurrencyCode(value) {
  const letters = String(value || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (letters === "CAN") return "CAD";
  const match = letters.match(/\b(USD|CAD|EUR|GBP|INR)\b/) || letters.match(/(USD|CAD|EUR|GBP|INR)/);
  return match?.[1] || "";
}

function formatIntegerWithCommas(value) {
  return String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function cleanAmountDisplayValue(value) {
  const clean = cleanOcrDisplayValue(value)
    .replace(/^S\$/i, "$")
    .replace(/\bCAN\b/i, "CAD")
    .replace(/\s+/g, " ")
    .trim();
  const currencyCode = normalizeCurrencyCode(clean);
  const symbol = clean.match(/[$€£₹]/)?.[0] || "";
  const digits = clean.replace(/\D/g, "");
  const hasMalformedGroupedNumber = /\d{1,3},\d{5,}/.test(clean);
  const hasDecimalNumber = /\d+[,.]\d{2}\b/.test(clean);

  if ((hasMalformedGroupedNumber || hasDecimalNumber) && digits.length >= 4) {
    const integerPart = digits.slice(0, -2).replace(/^0+(?=\d)/, "") || "0";
    const cents = digits.slice(-2);
    return `${symbol || "$"} ${formatIntegerWithCommas(integerPart)}.${cents}${currencyCode ? ` ${currencyCode}` : ""}`.trim();
  }

  return clean;
}

function cleanOpportunityNumberValue(value) {
  return cleanOcrDisplayValue(value)
    .replace(/^SCC-/i, "SOC-")
    .replace(/\s+/g, "")
    .replace(/[^\w-]/g, "");
}

function cleanSummaryFieldValue(value) {
  return cleanOcrDisplayValue(value)
    .replace(/^[=:]\s*/, "")
    .replace(/\s+[|]\s*$/g, "")
    .replace(/\s+\b(?:in|ll|ii|l)\b\s*$/i, "")
    .trim();
}

function cleanProcessStepName(value) {
  return cleanOcrDisplayValue(value)
    .replace(/^\d+\s+/, "")
    .replace(/\s*(?:[+~^˄˅⌃⌄]|[vV]|[|])\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOcrOptionValue(value) {
  return stripWrappingQuotes(
    String(value || "")
      .replace(OCR_SELECTED_MARKER_REPLACE_PATTERN, " ")
      .replace(OCR_UNSELECTED_MARKER_PATTERN, " ")
      .replace(/^[oO0○◯◌☐□]\s+/, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function hasSelectedOcrMarker(line) {
  return OCR_SELECTED_MARKER_PATTERN.test(normalizeOcrLine(line));
}

function hasChoiceSelectedOcrMarker(line) {
  const text = normalizeOcrLine(line);
  if (!OCR_SELECTED_MARKER_PATTERN.test(text)) return false;
  const withoutDecorativeMarker = cleanOcrLabel(text);
  const hasOnlyTrailingDecorativeMarker = withoutDecorativeMarker !== text && !OCR_SELECTED_MARKER_PATTERN.test(withoutDecorativeMarker);
  if (
    hasOnlyTrailingDecorativeMarker &&
    (isLikelyFieldLabel(withoutDecorativeMarker) || isLikelyQuestionLabel(withoutDecorativeMarker) || isChoiceFieldLabel(withoutDecorativeMarker))
  ) {
    return false;
  }
  return true;
}

function hasUnselectedOcrMarker(line) {
  return /^\s*(?:[oO0○◯◌☐□])\s+/.test(normalizeOcrLine(line));
}

function normalizeOcrOptionWord(value) {
  const normalized = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized === "not applicable") return "not applicable";
  return normalized;
}

function inferSelectedOcrOptionFromUnselectedMarkers(line) {
  const text = normalizeOcrLine(line);
  const optionMatches = [...text.matchAll(/\b(yes|no|high|medium|low|n\/a|na|not applicable)\b/gi)];
  if (optionMatches.length < 2) return "";

  const options = [...new Set(optionMatches.map((match) => normalizeOcrOptionWord(match[1])))];
  const unselectedOptions = new Set();
  const unselectedMarkerRegex = /(^|\s)[oO0○◯◌]\s+(yes|no|high|medium|low|n\/a|na|not applicable)\b/gi;
  let match = unselectedMarkerRegex.exec(text);
  while (match) {
    unselectedOptions.add(normalizeOcrOptionWord(match[2]));
    match = unselectedMarkerRegex.exec(text);
  }

  if (!unselectedOptions.size) return "";
  const selectedCandidates = options.filter((option) => !unselectedOptions.has(option));
  return selectedCandidates.length === 1 ? titleCase(selectedCandidates[0]) : "";
}

function getSelectedOcrOption(line) {
  const text = normalizeOcrLine(line);
  if (!OCR_SELECTED_MARKER_PATTERN.test(text)) return inferSelectedOcrOptionFromUnselectedMarkers(text);

  const markerBeforeMatch = text.match(/[•©®●◉☑✓✔■◆◘]\s*([^•©®●◉☑✓✔■◆◘]+)/);
  if (markerBeforeMatch) {
    const selected = cleanOcrOptionValue(markerBeforeMatch[1]);
    const selectedPrefix = selected.match(/^(yes|no|high|medium|low|n\/a|na|not applicable)\s*[:：]/i)?.[1];
    if (selectedPrefix) return titleCase(normalizeOcrOptionWord(selectedPrefix));
    const optionWords = getOcrOptionWords(selected);
    if (optionWords.length) {
      const optionText = optionWords[0] === "not" && optionWords[1] === "applicable" ? "not applicable" : optionWords[0];
      if (OCR_OPTION_VALUES.has(optionText)) return titleCase(optionText);
    }
    if (selected) return titleCase(selected);
  }

  const markerAfterMatch = text.match(/([^•©®●◉☑✓✔■◆◘]+)\s*[•©®●◉☑✓✔■◆◘]/);
  if (markerAfterMatch) {
    const selected = cleanOcrOptionValue(markerAfterMatch[1]).split(/\s+/).slice(-2).join(" ");
    if (selected) return titleCase(selected);
  }

  return inferSelectedOcrOptionFromUnselectedMarkers(text);
}

function getOcrOptionWords(line) {
  return cleanOcrOptionValue(line)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function isOcrOptionOnlyLine(line) {
  const words = getOcrOptionWords(line);
  if (!words.length) return false;
  if (words.join(" ") === "not applicable") return true;
  return words.every((word) => OCR_OPTION_VALUES.has(word));
}

function isEmailLine(line) {
  return /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(String(line || "").trim());
}

function isLikelyOcrNoiseLine(line) {
  const original = String(line || "").trim();
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(original)) return false;
  if (/(?:[$€£]\s*)?\d[\d,.\s]*\d\s*(?:usd|cad|eur|gbp|inr)?\b/i.test(original)) return false;
  if (/^(sack|back)\s*[|/]\s*eod$/i.test(cleanOcrDisplayValue(original))) return true;
  if (/^[._\-—–/\s\][|]+$/.test(original)) return true;
  const clean = original.replace(/[^A-Za-z|]/g, "").trim();
  if (!clean || OCR_OPTION_VALUES.has(clean.toLowerCase()) || isButtonLikeText(clean)) return false;
  return /^[A-Z|]{1,3}$/i.test(clean);
}

function isBrowserChromeOcrLine(line) {
  const text = normalizeOcrLine(line);
  const lower = text.toLowerCase();
  if (!text) return true;
  if (/https?:\/\//i.test(text)) return true;
  if (/^cc?\s*\d*\s*https/i.test(lower)) return true;
  if (/\b(testcase builder|chatgpt|github dashboard|logout|oro sysadmin|procure@kyndryl|ask gemini)\b/i.test(text) && /\bxx?\b|@|®|©/i.test(text)) return true;
  if (/\b(botgauge|google sheets|vacation tracker|request form|sysadmin prod|sysadmin eu prod|sysadmin dev|gemini|chatgpt)\b/i.test(text)) return true;
  if (/\bhome\s+tasks\s+requests\s+suppliers\s+more\b/i.test(text)) return true;
  if (/\bhome\b.*\btasks\b.*\brequests\b.*\bsuppliers\b.*\bmore\b/i.test(text) && text.split(/\s+/).length > 5) return true;
  if (/^(kyndryl|opella|sysadmin|gemini|chatgpt)\b/i.test(text) && text.split(/\s+/).length > 3) return true;
  return false;
}

function cleanDashboardTileCandidate(line) {
  return cleanOcrLabel(line)
    .replace(/\s+(?:[vV]|tn|in|ll|ii|l|[)>|])(?:\s+(?:[vV]|tn|in|ll|ii|l|[)>|]))*\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSelectedDashboardTileSignal(line) {
  const cleanLine = cleanOcrLabel(line);
  return /\s(?:[vV]|tn|in|ll|ii|l|[)>|])(?:\s+(?:[vV]|tn|in|ll|ii|l|[)>|]))+\s*$/i.test(cleanLine);
}

function isLikelyDashboardTileDescription(line) {
  const cleanLine = cleanDashboardTileCandidate(line).toLowerCase();
  if (!cleanLine) return false;
  return /^(?:intake process(?:\s*\(\d+\))?|this is\b|boarding in oro|testing(?:\s+ai\s+agent)?|test|compute form|procurement intake for|request for|process to)\b/i.test(
    cleanLine,
  );
}

function isDashboardTileCandidate(line) {
  const cleanLine = cleanDashboardTileCandidate(line);
  if (!cleanLine || cleanLine.length > 70) return false;
  if (isButtonLikeText(cleanLine) || isBrowserChromeOcrLine(cleanLine) || isLikelyOcrNoiseLine(cleanLine)) return false;
  if (/^(start new|see all|my requests|home|tasks|requests|suppliers|more|ask procure ai|front door|priority|requester)$/i.test(cleanLine)) return false;
  if (/^(please|this is|process to|request for|procurement intake for|testing|test)\b/i.test(cleanLine)) return false;
  if (/\b(describe your business needs|upload quote|upload offer|see all requests|started on|assigned to|current step|completion)\b/i.test(cleanLine)) return false;
  if (/^ORO-\d+/i.test(cleanLine)) return false;

  const words = cleanLine.split(/\s+/).filter(Boolean);
  if (words.length > 6) return false;
  return words.some((word) => /^[A-Z0-9][A-Za-z0-9&/-]*$/.test(word));
}

function getDashboardTileLabel(lines) {
  const cleanLines = (lines || []).map((line) => cleanOcrLabel(line)).filter(Boolean);
  const combined = cleanLines.join(" ");
  const hasDashboardSignals =
    /\bstart new\b/i.test(combined) &&
    (/\bmy requests\b/i.test(combined) || /\bask procure\b/i.test(combined) || /\bsee all\b/i.test(combined) || /\bhome\s+tasks\s+requests\s+suppliers\b/i.test(combined));
  if (!hasDashboardSignals) return "";

  const startIndex = cleanLines.findIndex((line) => /\bstart new\b/i.test(line));
  const endIndex = cleanLines.findIndex((line, index) => index > startIndex && /\bmy requests\b/i.test(line));
  const tileZone = cleanLines.slice(Math.max(0, startIndex + 1), endIndex > startIndex ? endIndex : cleanLines.length);
  const tileCandidates = tileZone
    .map((line, index) => ({ raw: line, clean: cleanDashboardTileCandidate(line), selected: hasSelectedDashboardTileSignal(line), index }))
    .filter((item) => isDashboardTileCandidate(item.raw));
  const selectedTileIndex = tileCandidates.findIndex((item) => item.selected);

  if (selectedTileIndex >= 0) {
    const selectedTile = tileCandidates[selectedTileIndex];
    const previousTitle = [...tileCandidates.slice(0, selectedTileIndex)]
      .reverse()
      .find((item) => !isLikelyDashboardTileDescription(item.clean));
    return isLikelyDashboardTileDescription(selectedTile.clean) && previousTitle ? previousTitle.clean : selectedTile.clean;
  }

  return tileCandidates.find((item) => !isLikelyDashboardTileDescription(item.clean))?.clean || tileCandidates[0]?.clean || "";
}

function isLikelyQuestionLabel(line) {
  return /^(who|what|when|where|which|why|how|will|does|do|is|are|can|should|would|has|have)\b/i.test(String(line || "").trim());
}

function isTopLevelScreenTitleLine(line, lineIndex) {
  const cleanLine = cleanOcrLabel(line);
  if (lineIndex > 1 || !cleanLine || cleanLine.length > 90) return false;
  if (/[?]$/.test(cleanLine) || isButtonLikeText(cleanLine) || isLikelyQuestionLabel(cleanLine) || isLikelyFieldLabel(cleanLine) || isChoiceFieldLabel(cleanLine)) {
    return false;
  }
  if (hasChoiceSelectedOcrMarker(cleanLine) || hasUnselectedOcrMarker(cleanLine) || isOcrOptionOnlyLine(cleanLine)) return false;
  return /\b(process|intake|agent|request|onboarding|review|assessment|dashboard|portal)\b/i.test(cleanLine);
}

function isLikelyFieldLabel(line) {
  return /(amount|budget|entity|companyentity|department|cost center|payment method|required by date|date|requestor|requester|describe|business need|company|field|select|specify|specification|objective|geography|delivery location|location|address|purchase org|purchase organization|region|opportunity number|additional instructions|watchers?)/i.test(
    String(line || ""),
  );
}

function isChoiceFieldLabel(line) {
  return /(purpose of this request|payment method|request type|type of supplier|supplier type|type of engagement|engagement supported|marketing activity|digital channels|customer personal data|external supplier|third party|supplier access|legal documentation|documentation is required|high-value|long-term financial commitment|sales opportunity|delivery fulfillment|yes\/no|yes or no|choose|select one|option|critical|challenging|types of internal information|internal information)/i.test(
    String(line || ""),
  );
}

function isMultiSelectQuestionLabel(line) {
  return /(types of internal information|internal information|access, store, or process|store, or process)/i.test(String(line || ""));
}

function isMalformedChoiceQuestionLabel(line) {
  const cleanLine = cleanOcrLabel(line);
  if (!cleanLine || cleanLine.length > 30) return false;
  if (isLikelyQuestionLabel(cleanLine) || isLikelyFieldLabel(cleanLine) || isChoiceFieldLabel(cleanLine)) return false;
  const compact = cleanLine.toLowerCase().replace(/[^a-z0-9]/g, "");
  return /(yes|ves|no|n0)/i.test(compact) && /[o0q]/i.test(compact);
}

function isStandaloneUploadDropzoneLine(line) {
  return /\bclick\s+to\s+upload\b|\bdrag\s+and\s+drop\b/i.test(cleanOcrDisplayValue(line));
}

function isStandaloneUserPickerLine(line) {
  const compact = cleanOcrDisplayValue(line).toLowerCase().replace(/[^a-z]/g, "");
  return /selectuser|saectuser|seiectuser|slectuser/.test(compact);
}

function isInformationalTextLine(line) {
  return /(^to onboard\b|please follow|click .* to proceed|^proceed\.?$)/i.test(String(line || ""));
}

function isSupplierCardLabel(line) {
  return /\bselected supplier\b/i.test(String(line || ""));
}

function cleanSupplierCardName(line) {
  const clean = cleanOcrDisplayValue(
    String(line || "")
      .replace(OCR_SELECTED_MARKER_REPLACE_PATTERN, " ")
      .replace(/[<>◆✦✨*]+/g, " "),
  )
    .replace(/\bNon\s*[-–—]?\s*Pif\b.*$/i, "")
    .replace(/\bPif\b.*$/i, "")
    .replace(/\s+[A-Za-z]\s*=\s*[A-Z][A-Za-z0-9_-]*.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "";
  if (/^(selected supplier|contact|enabled for:?|payment terms|status:?|add another supplier|back|continue)$/i.test(clean)) return "";
  if (parseSupplierDetailLine(clean) || /@/.test(clean) || /payment terms/i.test(clean)) return "";
  return clean;
}

function parseSupplierDetailLine(line) {
  const clean = cleanOcrDisplayValue(line).replace(/[()]+$/g, "").trim();
  const match = clean.match(/^(.+?)\s*[|]\s*ID\s*:?\s*([A-Za-z0-9-]+)/i) || clean.match(/^(.+?)\s+ID\s*:\s*([A-Za-z0-9-]+)/i);
  if (!match) return null;
  return { country: cleanOcrDisplayValue(match[1]), id: cleanOcrDisplayValue(match[2]) };
}

function parseSupplierContactLine(line) {
  const clean = cleanOcrDisplayValue(line);
  if (!/\bcontact\b/i.test(clean)) return null;
  const email = clean.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i)?.[0] || "";
  return email ? { email } : null;
}

function parseSupplierPaymentTermsLine(line) {
  const clean = cleanOcrDisplayValue(line);
  if (!/payment terms/i.test(clean)) return null;
  const value = clean.match(/payment terms\s*:?\s*([^|]+)/i)?.[1]?.trim() || "";
  return {
    enabled: /enabled for purchasing/i.test(clean),
    paymentTerms: value.replace(/\s+/g, " ").trim(),
  };
}

function parseSelectedSupplierCard(lines, startIndex) {
  const items = [];
  let endIndex = startIndex - 1;
  let hasSupplierName = false;
  let hasSupplierDetail = false;
  let hasContact = false;
  let hasEnabled = false;
  let hasPaymentTerms = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const cleanLine = stripWrappingQuotes(normalizeOcrLine(lines[index]).replace(/[:*]+$/g, "").trim());
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (/^(back|continue)$/i.test(cleanLine)) break;
    if (/^\+?\s*add another supplier$/i.test(cleanLine)) break;
    if (/^status\b/i.test(cleanLine)) continue;

    endIndex = index;

    const supplierDetail = parseSupplierDetailLine(cleanLine);
    if (supplierDetail && !hasSupplierDetail) {
      items.push({ step: `supplier detail "${supplierDetail.country} and ID ${supplierDetail.id}"`, question: "" });
      hasSupplierDetail = true;
      continue;
    }

    const supplierContact = parseSupplierContactLine(cleanLine);
    if (supplierContact && !hasContact) {
      items.push({ step: `supplier contact "${supplierContact.email}"`, question: "" });
      hasContact = true;
      continue;
    }

    const supplierPaymentTerms = parseSupplierPaymentTermsLine(cleanLine);
    if (supplierPaymentTerms) {
      if (supplierPaymentTerms.enabled && !hasEnabled) {
        items.push({ step: "supplier enabled purchasing", question: "" });
        hasEnabled = true;
      }
      if (supplierPaymentTerms.paymentTerms && !hasPaymentTerms) {
        items.push({ step: `dropdown "${supplierPaymentTerms.paymentTerms}"`, question: "Payment terms" });
        hasPaymentTerms = true;
      }
      continue;
    }

    if (/^(?:\d+[.,]?\s*)?select contact$/i.test(cleanLine)) {
      items.push({ step: 'button "Select contact"', question: "" });
      continue;
    }

    if (!hasSupplierName) {
      const supplierName = cleanSupplierCardName(cleanLine);
      if (supplierName) {
        items.push({ step: `supplier "${supplierName}"`, question: "Selected supplier" });
        hasSupplierName = true;
      }
    }
  }

  return { items, endIndex };
}

function isBlankEditableStep(step) {
  return (
    !splitLines(step.details).length &&
    !splitLines(step.questionLabel).length &&
    !String(step.expected || "").trim() &&
    !String(step.actual || "").trim() &&
    String(step.status || "Not Run") === "Not Run"
  );
}

function isLikelyScreenshotDraftStep(step) {
  const details = splitLines(step.details);
  const questions = splitLines(step.questionLabel);
  const combined = `${details.join(" ")} ${questions.join(" ")}`;

  return (
    details.length >= 2 &&
    !String(step.expected || "").trim() &&
    !String(step.actual || "").trim() &&
    /button Continue|form verify visible|question verify visible|select |dropdown |document |search location/i.test(combined) &&
    /Procurement Intake|Risk Review|Will the vendor|What types of internal information|Payment method|Selected supplier/i.test(combined)
  );
}

function isContinueOnlyScreenshotDraft(step) {
  const details = splitLines(step.details);
  return (
    details.length === 1 &&
    /^button\s+Continue$/i.test(details[0]) &&
    !splitLines(step.questionLabel).length &&
    !String(step.expected || "").trim() &&
    !String(step.actual || "").trim()
  );
}

function getScreenshotFieldType(label) {
  const lower = String(label || "").toLowerCase();
  if (/^region\b/.test(lower)) return "form";
  if (/assessment needed/.test(lower)) return "question";
  if (/(date|deadline|start date|end date|start and end date|need this request|request to be fulfilled|be fulfilled)/.test(lower)) return "date";
  if (/\?$/.test(String(label || "").trim()) && isLikelyQuestionLabel(label)) return "question";
  if (isSupplierCardLabel(label)) return "supplier";
  if (isChoiceFieldLabel(label)) return "question";
  if (/\b(upload|documents?|attachment|certificate|proof|w-9|w9|capa|iso|quotation)\b/.test(lower) || /\bsoc\b(?![-_])/i.test(lower)) {
    return "document";
  }
  if (/(country|dropdown|select|hacat|payment terms|incoterms|tax type|category|option|list|department|geography|entity|companyentity|cost center|company entity|purchase org|purchase organization)/.test(lower)) {
    return "dropdown";
  }
  if (/(assignee|owner|requestor|requester|user|approver|buyer|manager|watchers?)/.test(lower)) return "assignee";
  if (/(date|deadline|start date|end date|start and end date|need this request|request to be fulfilled|be fulfilled)/.test(lower)) return "date";
  if (
    /(name|email|number|amount|budget|reason|comment|notes|instructions?|address|ein|bank|swift|iban|field|text area|describe|description|business need|justification|purpose|objective|specification|delivery location|location)/.test(
      lower,
    )
  ) {
    return "field";
  }
  if (/(task|review|approval)/.test(lower)) return "task";
  if (/\b(form|page|screen|section|summary|details|requirements?)\b/.test(lower)) return "form";
  return "question";
}

function createScreenshotStepForValue(label, value) {
  const cleanLabel = cleanOcrLabel(label).replace(/[:*]+$/g, "").trim();
  const selectedValue = getSelectedOcrOption(value);
  let cleanValue = cleanOcrDisplayValue(selectedValue || cleanOcrOptionValue(value));
  const fieldType = getScreenshotFieldType(cleanLabel);

  if (/requestor|requester/i.test(cleanLabel)) cleanValue = cleanAutoPopulatedFieldValue(cleanValue);
  if (fieldType === "date") cleanValue = cleanDateDisplayValue(cleanValue);
  if (isAmountLikeFieldLabel(cleanLabel)) cleanValue = cleanAmountDisplayValue(cleanValue);
  if (/opportunity number/i.test(cleanLabel)) cleanValue = cleanOpportunityNumberValue(cleanValue);
  const lowerValue = cleanValue.toLowerCase();

  if (fieldType === "document") {
    return cleanValue && !/^(yes|no)$/i.test(cleanValue)
      ? { step: `document "${cleanValue}"`, question: cleanLabel }
      : { step: "document", question: cleanLabel };
  }

  if (fieldType === "supplier") return { step: cleanValue ? `supplier "${cleanValue}"` : "supplier", question: cleanLabel };

  if (/(delivery location|address|location)/i.test(cleanLabel) && /(search address|add manually|search)/i.test(cleanValue)) {
    return { step: "search location", question: cleanLabel };
  }

  if (isChoiceFieldLabel(cleanLabel) && cleanValue) return { step: `select ${cleanValue}`, question: cleanLabel };
  if (OCR_OPTION_VALUES.has(lowerValue)) return { step: `select ${lowerValue}`, question: cleanLabel };
  if (fieldType === "dropdown") return { step: cleanValue ? `dropdown "${cleanValue}"` : "dropdown", question: cleanLabel };
  if (/requestor|requester/i.test(cleanLabel) && cleanValue) return { step: `auto "${cleanValue}"`, question: cleanLabel };
  if (fieldType === "assignee") return { step: cleanValue ? `assignee "${cleanValue}"` : "assignee", question: cleanLabel };
  if (fieldType === "date") return { step: cleanValue ? `date "${cleanValue}"` : "date", question: cleanLabel };
  if (fieldType === "task") return { step: "task verify visible on screen", question: cleanLabel };
  if (fieldType === "form") return { step: "form verify visible on screen", question: cleanLabel };
  return { step: cleanValue ? `type "${cleanValue}"` : "verify", question: cleanLabel };
}

function createPendingLabelStep(label) {
  const cleanLabel = cleanOcrLabel(label);
  const fieldType = getScreenshotFieldType(cleanLabel);
  if (fieldType === "document") return { step: "document", question: cleanLabel };
  if (fieldType === "supplier") return { step: "supplier", question: cleanLabel };
  if (fieldType === "task") return { step: "task verify visible on screen", question: cleanLabel };
  if (fieldType === "form") return { step: "form verify visible on screen", question: cleanLabel };
  if (fieldType === "dropdown") return { step: "dropdown", question: cleanLabel };
  if (fieldType === "assignee") return { step: "assignee", question: cleanLabel };
  if (fieldType === "date") return { step: "date", question: cleanLabel };
  if (fieldType === "field") return { step: "field verify visible on screen", question: cleanLabel };
  return { step: "question verify visible on screen", question: cleanLabel };
}

function cleanDynamicOptionLabel(line) {
  return cleanOcrDisplayValue(cleanOcrOptionValue(line));
}

function normalizeChoiceOptionKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatChoiceOptionLabel(value) {
  const key = normalizeChoiceOptionKey(value);
  if (key === "none of the above") return "None of the above";
  if (key === "n/a" || key === "na" || key === "not applicable") return "Not Applicable";
  return titleCase(value);
}

function cleanChoiceOptionValue(line) {
  const clean = cleanDynamicOptionLabel(line)
    .replace(/^[☐□]\s*/, "")
    .replace(/[:：]\s*$/g, "")
    .trim();
  const prefixMatch = clean.match(/^([^:：]{1,70})[:：]\s+(.+)$/);
  if (prefixMatch && CHOICE_OPTION_PREFIXES.has(normalizeChoiceOptionKey(prefixMatch[1]))) {
    return formatChoiceOptionLabel(prefixMatch[1]);
  }
  if (CHOICE_OPTION_PREFIXES.has(normalizeChoiceOptionKey(clean))) return formatChoiceOptionLabel(clean);
  return clean;
}

function isKnownChoiceOptionValue(value) {
  return CHOICE_OPTION_PREFIXES.has(normalizeChoiceOptionKey(value));
}

function isChoiceOptionDescriptionLine(line) {
  return /^(yes|no|high|medium|low|n\/a|na|not applicable|none of the above)\s*[:：]/i.test(cleanDynamicOptionLabel(line));
}

function isKnownChoiceOptionLine(value) {
  return isKnownChoiceOptionValue(value) || isKnownChoiceOptionValue(String(value || "").split(/[:：]/)[0]);
}

function isLeftoverChoiceOptionLine(line) {
  const cleanLine = stripWrappingQuotes(normalizeOcrLine(line).replace(/[:*]+$/g, "").trim());
  if (!cleanLine || hasChoiceSelectedOcrMarker(cleanLine)) return false;
  return hasUnselectedOcrMarker(cleanLine) || isChoiceOptionDescriptionLine(cleanLine);
}

function isBareFieldBoundaryChoiceLine(line, options = {}) {
  if (options.allowFieldLikeBare) return false;

  const cleanLine = stripWrappingQuotes(normalizeOcrLine(line).replace(/[:*]+$/g, "").trim());
  const cleanLabel = cleanOcrLabel(cleanLine);
  const value = cleanChoiceOptionValue(cleanLine);
  if (!cleanLine || hasChoiceSelectedOcrMarker(cleanLine) || hasUnselectedOcrMarker(cleanLine)) return false;
  if (isKnownChoiceOptionLine(value) || isChoiceOptionDescriptionLine(cleanLine)) return false;
  if (isLikelyQuestionLabel(cleanLabel)) return true;

  const fieldType = getScreenshotFieldType(cleanLabel);
  return isLikelyFieldLabel(cleanLabel) || ["field", "dropdown", "document", "date", "assignee", "supplier", "form", "task"].includes(fieldType);
}

function hasNearbyChoiceMarker(lines, startIndex) {
  let checked = 0;
  for (let index = startIndex; index < lines.length && checked < 8; index += 1) {
    const cleanLine = stripWrappingQuotes(normalizeOcrLine(lines[index]).replace(/[:*]+$/g, "").trim());
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (checked > 0 && isBareFieldBoundaryChoiceLine(cleanLine)) break;
    if (isButtonLikeText(cleanLine)) break;
    if (hasChoiceSelectedOcrMarker(cleanLine) || hasUnselectedOcrMarker(cleanLine)) return true;
    checked += 1;
  }
  return false;
}

function getInlineChoiceItems(line) {
  const text = normalizeOcrLine(line);
  const optionMatches = [...text.matchAll(/\b(yes|no|high|medium|low|n\/a|na|not applicable)\b/gi)];
  if (optionMatches.length < 2) return [];

  const selected = normalizeChoiceOptionKey(getSelectedOcrOption(text));
  const seen = new Set();
  return optionMatches
    .map((match) => normalizeOcrOptionWord(match[1]))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .map((value) => ({
      line: text,
      value: titleCase(value),
      selected: selected === value,
    }));
}

function getChoiceOptionItem(line, allowBareOption = false, options = {}) {
  const cleanLine = stripWrappingQuotes(normalizeOcrLine(line).replace(/[:*]+$/g, "").trim());
  if (!cleanLine || isLikelyOcrNoiseLine(cleanLine) || isInformationalTextLine(cleanLine)) return null;
  if (isButtonLikeText(cleanLine) && !hasChoiceSelectedOcrMarker(cleanLine)) return null;
  if (isLikelyQuestionLabel(cleanOcrLabel(cleanLine)) && !hasChoiceSelectedOcrMarker(cleanLine) && !hasUnselectedOcrMarker(cleanLine)) return null;

  const value = cleanChoiceOptionValue(cleanLine);
  if (!value) return null;

  const selected = hasChoiceSelectedOcrMarker(cleanLine);
  const unselected = hasUnselectedOcrMarker(cleanLine);
  if (
    allowBareOption &&
    !options.allowFieldLikeBare &&
    !selected &&
    !unselected &&
    !isKnownChoiceOptionLine(value) &&
    (isLikelyFieldLabel(cleanLine) || getScreenshotFieldType(cleanLine) !== "question")
  ) {
    return null;
  }

  const startsWithKnownPrefix = isKnownChoiceOptionLine(value);
  const startsWithOptionDescription = isChoiceOptionDescriptionLine(cleanLine);
  const looksLikeOption = selected || unselected || startsWithKnownPrefix || startsWithOptionDescription || allowBareOption;

  if (!looksLikeOption) return null;
  return { line: cleanLine, value, selected };
}

function collectChoiceOptionItems(lines, startIndex, options = {}) {
  const items = [];
  let endIndex = startIndex - 1;

  for (let index = startIndex; index < lines.length; index += 1) {
    const optionLine = stripWrappingQuotes(lines[index].replace(/[:*]+$/g, "").trim());
    if (items.length && isBareFieldBoundaryChoiceLine(optionLine, options)) break;

    const inlineItems = getInlineChoiceItems(optionLine);
    if (inlineItems.length) {
      items.push(...inlineItems);
      endIndex = index;
      break;
    }

    const item = getChoiceOptionItem(optionLine, items.length > 0 || Boolean(options.allowBareFirst), {
      allowFieldLikeBare: options.allowFieldLikeBare,
    });
    if (!item) break;

    items.push(item);
    endIndex = index;
    if (options.maxItems && items.length >= options.maxItems) break;
  }

  return { items, endIndex };
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeChoiceOptionKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldMergeWrappedLabel(previousLine, currentLine, nextLine) {
  const previous = String(previousLine || "").trim();
  const current = String(currentLine || "").trim();
  const nextHasOption = Boolean(getSelectedOcrOption(nextLine)) || isOcrOptionOnlyLine(nextLine);
  const previousFieldType = getScreenshotFieldType(cleanOcrLabel(previous));
  const currentStartsNewLabel =
    isLikelyQuestionLabel(current) ||
    /assessment needed/i.test(current) ||
    getScreenshotFieldType(current) !== "question";
  const previousLooksIncomplete =
    !/[?.:]$/.test(previous) ||
    /\b(and|any|behalf|by|for|from|in|of|on|or|to|with)\s*$/i.test(previous);

  return previous && current && previousFieldType !== "form" && nextHasOption && previousLooksIncomplete && !currentStartsNewLabel;
}

function isLongTextFieldLabel(label) {
  return /(describe|description|business need|need in detail|comment|notes|reason|justification|specification|details?|purpose)/i.test(
    String(label || ""),
  );
}

function isAmountLikeFieldLabel(label) {
  return /(amount|budget|value|cost|price|total)/i.test(String(label || ""));
}

function isAmountHelperTextLine(line) {
  return /^(insert|enter|provide|add)\b.*\b(amount|value|cost|price|duration|engagement|product|service)\b/i.test(cleanOcrDisplayValue(line));
}

function isCurrencyAmountLine(line) {
  return /(?:[$€£]\s*)?\d[\d,.\s]*\d\s*(?:usd|cad|eur|gbp|inr)?\b/i.test(cleanOcrDisplayValue(line));
}

function normalizeCurrencyCodeLine(line) {
  const cleanLine = cleanOcrDisplayValue(line).toUpperCase().replace(/[^A-Z]/g, "");
  if (cleanLine === "CAN") return "CAD";
  if (["USD", "CAD", "EUR", "GBP", "INR"].includes(cleanLine)) return cleanLine;
  return "";
}

const TRAILING_FIELD_LABEL_PATTERNS = [
  "Request type",
  "Target Date",
  "Required by date",
  "Payment method",
  "Upload additional documents (if any)",
  "Additional instructions for the supplier",
  "Add watchers (if any)",
  "Purchase Org",
  "Kyndryl Entity",
];

function splitValueAndTrailingFieldLabel(line) {
  const cleanLine = cleanOcrLabel(line);
  for (const label of TRAILING_FIELD_LABEL_PATTERNS) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
    const match = cleanLine.match(new RegExp(`^(.+?)\\s+(${escapedLabel})$`, "i"));
    if (match) {
      const value = cleanOcrDisplayValue(match[1]);
      const trailingLabel = cleanOcrLabel(match[2]);
      if (value && trailingLabel && value.toLowerCase() !== trailingLabel.toLowerCase()) {
        return { value, label: trailingLabel };
      }
    }
  }
  return null;
}

function canReplacePendingGeneratedStep(item) {
  if (!item?.question) return false;
  const fieldType = getScreenshotFieldType(item.question);
  return (
    fieldType !== "question" &&
    [
      "field verify visible on screen",
      "dropdown",
      "date",
      "assignee",
      "supplier",
      "document",
    ].includes(item.step)
  );
}

function isUserPickerPlaceholderLine(line) {
  return /\bselect\s+user\b/i.test(cleanOcrDisplayValue(line)) || isStandaloneUserPickerLine(line);
}

function isFieldValueBoundaryLine(line, hasCollectedValue = false) {
  const cleanLine = stripWrappingQuotes(normalizeOcrLine(line).replace(/[:*]+$/g, "").trim());
  if (!cleanLine || isLikelyOcrNoiseLine(cleanLine) || isButtonLikeText(cleanLine)) return true;
  if (hasChoiceSelectedOcrMarker(cleanLine) || hasUnselectedOcrMarker(cleanLine) || isOcrOptionOnlyLine(cleanLine)) return true;

  const cleanLabel = cleanOcrLabel(cleanLine);
  if (isLikelyQuestionLabel(cleanLabel)) return true;
  if (hasCollectedValue && isLikelyFieldLabel(cleanLabel) && getScreenshotFieldType(cleanLabel) !== "question") return true;
  return false;
}

function collectLongTextFieldValue(lines, startIndex) {
  const valueLines = [];
  let endIndex = startIndex - 1;

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (isFieldValueBoundaryLine(line, valueLines.length > 0)) break;

    const cleanValue = cleanOcrDisplayValue(stripWrappingQuotes(normalizeOcrLine(line).replace(/[:*]+$/g, "").trim()));
    if (!cleanValue) break;

    valueLines.push(cleanValue);
    endIndex = index;
  }

  return {
    value: valueLines.join(" ").replace(/\s+/g, " ").trim(),
    endIndex,
  };
}

function collectDateFieldValue(lines, startIndex) {
  const valueParts = [];
  let endIndex = startIndex - 1;

  for (let index = startIndex; index < lines.length && index < startIndex + 5; index += 1) {
    const line = stripWrappingQuotes(normalizeOcrLine(lines[index]).replace(/[:*]+$/g, "").trim());
    const cleanLine = cleanOcrDisplayValue(line);
    const cleanLabel = cleanOcrLabel(line);
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (/^[-–—|]+$/.test(cleanLine)) {
      endIndex = index;
      continue;
    }
    if (isButtonLikeText(cleanLine)) break;

    const dateValue = cleanDateDisplayValue(cleanLine);
    const hasDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\s*,?\s*\d{4}\b/i.test(cleanLine);
    if (hasDate) {
      valueParts.push(dateValue);
      endIndex = index;
      continue;
    }

    if (valueParts.length && (isLikelyQuestionLabel(cleanLabel) || isLikelyFieldLabel(cleanLabel) || isChoiceFieldLabel(cleanLabel))) break;
    if (valueParts.length) break;
  }

  return {
    value: valueParts.join(" to "),
    endIndex,
  };
}

function parseEmbeddedDropdownFieldValue(line) {
  const cleanLine = cleanOcrLabel(line);
  const performedForMatch = cleanLine.match(/^(.+\bperformed\s+for)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})$/i);
  if (performedForMatch && getScreenshotFieldType(performedForMatch[1]) === "dropdown") {
    return {
      label: performedForMatch[1].trim(),
      value: performedForMatch[2].trim(),
    };
  }
  return null;
}

function isCodeDashValueLine(line) {
  return /^\d{2,}\s*[-–—]\s*\S/.test(cleanOcrDisplayValue(line));
}

function isCategoryQuestionLabel(label) {
  return /best category|category for your request|select .*category/i.test(String(label || ""));
}

function isRecommendedCategoryHeader(line) {
  return /recommended options/i.test(cleanOcrDisplayValue(line));
}

function isCategoryRecommendationHelperLine(line) {
  return /not the result|view all options|read more/i.test(cleanOcrDisplayValue(line));
}

function cleanRecommendedCategoryName(line) {
  const clean = cleanOcrDisplayValue(line)
    .replace(/[<>◆✦✨*]+/g, " ")
    .replace(/\s+\d{4,}\s*[°ºoO]?\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || isRecommendedCategoryHeader(clean) || isCategoryRecommendationHelperLine(clean)) return "";
  if (/^(hw|software|services?)\s*&|maintenance|purchase of|unwanted traffic|includes\b/i.test(clean)) return "";
  if (/^\(?hw\)?$/i.test(clean)) return "";
  return clean;
}

function parseRecommendedCategorySelection(lines, startIndex) {
  let categoryName = "";
  let endIndex = startIndex - 1;

  for (let index = startIndex; index < lines.length && index < startIndex + 10; index += 1) {
    const cleanLine = stripWrappingQuotes(normalizeOcrLine(lines[index]).replace(/[:*]+$/g, "").trim());
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (isButtonLikeText(cleanLine)) break;

    endIndex = index;
    if (isRecommendedCategoryHeader(cleanLine) || isCategoryRecommendationHelperLine(cleanLine)) continue;

    if (!categoryName) {
      const candidate = cleanRecommendedCategoryName(cleanLine);
      if (candidate) categoryName = candidate;
    }
  }

  return { value: categoryName, endIndex };
}

function findNextUsefulOcrLine(lines, startIndex, predicate, maxLookahead = 8) {
  for (let index = startIndex; index < lines.length && index <= startIndex + maxLookahead; index += 1) {
    const cleanLine = cleanOcrLabel(lines[index]);
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine) || isAmountHelperTextLine(cleanLine)) continue;
    if (predicate(cleanLine, index)) return { line: cleanLine, index };
  }
  return null;
}

function getSelectedKnownOptionFromLines(lines, startIndex, options, maxLookahead = 8) {
  const normalizedOptions = options.map((option) => normalizeChoiceOptionKey(option));
  for (let index = startIndex; index < lines.length && index <= startIndex + maxLookahead; index += 1) {
    const rawLine = lines[index];
    const cleanLine = cleanOcrLabel(rawLine);
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (index > startIndex && (isLikelyQuestionLabel(cleanLine) || isLikelyFieldLabel(cleanLine) || isChoiceFieldLabel(cleanLine))) break;

    const selected = getSelectedOcrOption(rawLine);
    const selectedKey = normalizeChoiceOptionKey(selected);
    const selectedIndex = normalizedOptions.indexOf(selectedKey);
    if (selectedIndex >= 0) return options[selectedIndex];

    const cleanOption = cleanChoiceOptionValue(rawLine);
    const cleanOptionKey = normalizeChoiceOptionKey(cleanOption);
    const cleanOptionIndex = normalizedOptions.indexOf(cleanOptionKey);
    if (cleanOptionIndex >= 0 && hasChoiceSelectedOcrMarker(rawLine)) return options[cleanOptionIndex];

    const inlineMatches = normalizedOptions
      .map((optionKey, optionIndex) => ({ optionKey, option: options[optionIndex], matchIndex: normalizeChoiceOptionKey(rawLine).indexOf(optionKey) }))
      .filter((item) => item.matchIndex >= 0)
      .sort((a, b) => a.matchIndex - b.matchIndex);
    if (inlineMatches.length && /[•●◉☑✓✔■◆◘©®]/.test(rawLine)) return inlineMatches[0].option;
  }
  return "";
}

function getParsedItemKey(step, question) {
  const cleanStep = cleanOcrLabel(step).toLowerCase();
  const cleanQuestion = cleanOcrLabel(question).toLowerCase();
  if (cleanQuestion.includes("procurement intake process")) return "form:procurement intake process";
  if (cleanQuestion.includes("engagement details")) return "form:engagement details";
  if (cleanQuestion.includes("add requirements")) return "form:add requirements";
  if (cleanQuestion.includes("type of engagement supported")) return "question:type of engagement";
  if (cleanQuestion.includes("sales opportunity or delivery fulfillment")) return "question:sales opportunity";
  if (cleanQuestion.includes("target date")) return "field:target date";
  if (cleanQuestion.includes("estimated project amount")) return "field:estimated project amount";
  if (cleanQuestion.includes("cost case")) return "question:cost case";
  if (cleanQuestion.includes("opportunity number")) return "field:opportunity number";
  if (cleanQuestion.includes("request type")) return "question:request type";
  if (cleanQuestion.includes("capital expenditure")) return "question:capital expenditure";
  if (cleanQuestion.includes("reusable assets")) return "question:reusable assets";
  if (cleanQuestion.includes("quotation from a supplier")) return "question:quotation";
  if (cleanQuestion.includes("upload additional documents")) return "field:upload additional documents";
  if (cleanQuestion.includes("add watchers")) return "field:add watchers";
  if (/button\s+continue/i.test(cleanStep)) return "button:continue";
  return `${cleanStep}|${cleanQuestion}`;
}

const KNOWN_PARSED_ITEM_ORDER = new Map(
  [
    "form:procurement intake process",
    "form:engagement details",
    "question:type of engagement",
    "question:sales opportunity",
    "field:target date",
    "form:add requirements",
    "field:estimated project amount",
    "question:cost case",
    "field:opportunity number",
    "question:request type",
    "question:capital expenditure",
    "question:reusable assets",
    "question:quotation",
    "field:upload additional documents",
    "field:add watchers",
    "button:continue",
  ].map((key, index) => [key, index]),
);

function getParsedItemRank(item, fallbackIndex) {
  const key = getParsedItemKey(item.step, item.question);
  return KNOWN_PARSED_ITEM_ORDER.has(key) ? KNOWN_PARSED_ITEM_ORDER.get(key) : 1000 + fallbackIndex;
}

function hasSortableKnownParsedContent(items) {
  return (items || []).some((item) => {
    const key = getParsedItemKey(item.step, item.question);
    return KNOWN_PARSED_ITEM_ORDER.has(key) && key !== "button:continue";
  });
}

function orderKnownDraftStepPairs(steps, questions) {
  const items = (steps || []).map((step, index) => ({
    step,
    question: (questions || [])[index] || "",
    order: index,
  }));
  if (!hasSortableKnownParsedContent(items)) {
    return { steps, questions };
  }

  items.sort((a, b) => getParsedItemRank(a, a.order) - getParsedItemRank(b, b.order));
  return {
    steps: items.map((item) => item.step),
    questions: items.map((item) => item.question),
  };
}

function isEmptyOptionalParsedField(item) {
  const cleanStep = cleanOcrLabel(item.step).toLowerCase();
  const cleanQuestion = cleanOcrLabel(item.question).toLowerCase();
  const isOptionalQuestion = /additional instructions|comments?|notes?/i.test(cleanQuestion);
  const isNoiseValueStep = /^type\s+"?[\/\\._\-—–| ]+"?$/i.test(cleanStep);
  const isNoiseVisibleStep = /^(form|field|question)\s+verify\s+visible/i.test(cleanStep) && isLikelyOcrNoiseLine(cleanQuestion);
  return (cleanStep === "field verify visible on screen" && isOptionalQuestion) || (isOptionalQuestion && isNoiseValueStep) || isNoiseVisibleStep;
}

function buildScreenshotParserDebug(parsed, sourceText) {
  const keys = new Set((parsed.steps || []).map((step, index) => getParsedItemKey(step, (parsed.questions || [])[index] || "")));
  const requiredLabels = [
    ["Target Date", "field:target date"],
    ["Estimated amount", "field:estimated project amount"],
    ["Cost Case", "question:cost case"],
    ["Opportunity Number", "field:opportunity number"],
    ["Request Type", "question:request type"],
    ["Capital Expenditure", "question:capital expenditure"],
    ["Reusable Assets", "question:reusable assets"],
    ["Quotation", "question:quotation"],
    ["Upload", "field:upload additional documents"],
    ["Watchers", "field:add watchers"],
  ];
  const found = requiredLabels.filter(([, key]) => keys.has(key)).map(([label]) => label);
  const missing = requiredLabels.filter(([, key]) => !keys.has(key)).map(([label]) => label);
  const ocrLineCount = splitLines(sourceText).length;
  return `Parser ${APP_VERSION}. OCR lines: ${ocrLineCount}. Steps: ${(parsed.steps || []).length}. Found: ${found.join(", ") || "none"}. Missing: ${
    missing.join(", ") || "none"
  }.`;
}

function hasProcessDetailsSummaryItem(items) {
  return (items || []).some((item) => /process details displays/i.test(String(item.step || "")));
}

function isProcessDetailsFallbackFormItem(item) {
  return /^form\s+verify\s+visible/i.test(String(item?.step || "")) && /^process details$/i.test(cleanOcrLabel(item?.question || ""));
}

function mergeParsedScreenshotSteps(primary, fallback) {
  const primaryItems = (primary.steps || []).map((step, index) => ({ step, question: (primary.questions || [])[index] || "" }));
  const fallbackItems = (fallback.steps || []).map((step, index) => ({ step, question: (fallback.questions || [])[index] || "" }));
  if (!fallbackItems.length) return primary;
  const primaryHasProcessDetailsSummary = hasProcessDetailsSummaryItem(primaryItems);

  const sortableItems = [...primaryItems, ...fallbackItems].filter((item) => !isEmptyOptionalParsedField(item));
  if (!hasSortableKnownParsedContent(sortableItems)) {
    const merged = [];
    const seen = new Set();
    [...primaryItems, ...fallbackItems].forEach((item) => {
      if (isEmptyOptionalParsedField(item)) return;
      if (primaryHasProcessDetailsSummary && isProcessDetailsFallbackFormItem(item)) return;
      const key = getParsedItemKey(item.step, item.question);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    return {
      steps: merged.map((item) => item.step),
      questions: merged.map((item) => item.question),
    };
  }

  const merged = [];
  const seen = new Set();
  [...fallbackItems, ...primaryItems].forEach((item, order) => {
    if (isEmptyOptionalParsedField(item)) return;
    if (primaryHasProcessDetailsSummary && isProcessDetailsFallbackFormItem(item)) return;
    const key = getParsedItemKey(item.step, item.question);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ ...item, order });
  });

  merged.sort((a, b) => getParsedItemRank(a, a.order) - getParsedItemRank(b, b.order));

  return {
    steps: merged.map((item) => item.step),
    questions: merged.map((item) => item.question),
  };
}

function extractKnownProcurementStepsFromScreenshotText(text) {
  const rawLines = splitLines(text)
    .map((line) => normalizeOcrLine(line))
    .filter((line) => !isBrowserChromeOcrLine(line))
    .filter(Boolean);
  const items = [];
  const push = (step, question = "") => {
    const key = getParsedItemKey(step, question);
    if (items.some((item) => item.key === key)) return;
    items.push({ key, step, question });
  };

  rawLines.forEach((line, index) => {
    const cleanLine = cleanOcrLabel(line);
    const lower = cleanLine.toLowerCase();
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) return;

    if (isTopLevelScreenTitleLine(cleanLine, index)) {
      push("form verify visible on screen", cleanLine);
      return;
    }

    if (/^engagement details$/i.test(cleanLine) || /^add requirements$/i.test(cleanLine)) {
      push("form verify visible on screen", cleanLine);
      return;
    }

    if (/type of engagement supported/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["Single Customer", "Multi-Customer pool", "Kyndryl Internal Use"]);
      if (selected) push(`select "${selected}"`, "Type of engagement supported/ will be supported by the Supplier");
      return;
    }

    if (/sales opportunity or delivery fulfillment/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["Sales Opportunity", "Delivery Fulfillment"]);
      if (selected) push(`select "${selected}"`, "Is this request for a sales opportunity or delivery fulfillment");
      return;
    }

    if (/^target date\b/i.test(lower)) {
      const dateLine = findNextUsefulOcrLine(rawLines, index + 1, (candidate) => /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(candidate));
      if (dateLine) push(`date "${cleanDateDisplayValue(dateLine.line)}"`, "Target Date");
      return;
    }

    if (/estimated project amount/i.test(lower)) {
      const amountLine = findNextUsefulOcrLine(rawLines, index + 1, (candidate) => isCurrencyAmountLine(candidate), 10);
      if (amountLine) {
        const nextCurrencyCode = normalizeCurrencyCodeLine(rawLines[amountLine.index + 1] || "");
        push(`type "${cleanAmountDisplayValue(nextCurrencyCode ? `${amountLine.line} ${nextCurrencyCode}` : amountLine.line)}"`, "Estimated project amount");
      }
      return;
    }

    if (/cost case/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["Yes", "No"], 2);
      if (selected) push(`select ${selected.toLowerCase()}`, "Is this spend covered in the Cost Case?");
      return;
    }

    if (/opportunity number/i.test(lower)) {
      const opportunity = findNextUsefulOcrLine(rawLines, index + 1, (candidate) => /^[A-Z0-9]+[-_][A-Z0-9-]+$/i.test(candidate), 4);
      if (opportunity) push(`type "${cleanOpportunityNumberValue(opportunity.line)}"`, "Opportunity Number");
      return;
    }

    if (/^request type$/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["New Purchase", "Resale", "Renewal"], 5);
      if (selected) push(`select "${selected}"`, "Request type");
      return;
    }

    if (/capital expenditure/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["Yes", "No"], 2);
      if (selected) push(`select ${selected.toLowerCase()}`, "Will this transaction be a capital expenditure for Kyndryl?");
      return;
    }

    if (/reusable assets/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["Yes", "No"], 2);
      if (selected) push(`select ${selected.toLowerCase()}`, "Have you verified that there are no reusable assets available to meet your requirements?");
      return;
    }

    if (/quotation from a supplier/i.test(lower)) {
      const selected = getSelectedKnownOptionFromLines(rawLines, index + 1, ["Yes", "No"], 2);
      if (selected) push(`select ${selected.toLowerCase()}`, "Do you have a quotation from a supplier?");
      return;
    }

    if (/upload additional documents/i.test(lower) || isStandaloneUploadDropzoneLine(cleanLine)) {
      push("document", "Upload additional documents (if any)");
      return;
    }

    if (/add watchers/i.test(lower) || isStandaloneUserPickerLine(cleanLine)) {
      push("assignee", "Add watchers (if any)");
      return;
    }

    if (/^continue$/i.test(cleanLine)) push("button Continue", "");
  });

  return {
    steps: items.map((item) => item.step),
    questions: items.map((item) => item.question),
  };
}

function getSummaryValueAfterLabel(lines, labelPattern, stopPatterns = []) {
  const labelIndex = lines.findIndex((line) => labelPattern.test(cleanOcrLabel(line)));
  if (labelIndex < 0) return "";

  const inlineLine = cleanOcrDisplayValue(lines[labelIndex]);
  const inlineText = inlineLine.replace(labelPattern, "").trim();
  if (inlineText && inlineText !== inlineLine) return cleanSummaryFieldValue(inlineText);

  for (let index = labelIndex + 1; index < lines.length; index += 1) {
    const cleanLine = cleanOcrDisplayValue(lines[index]);
    const cleanLabel = cleanOcrLabel(lines[index]);
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (stopPatterns.some((pattern) => pattern.test(cleanLabel))) break;
    if (isButtonLikeText(cleanLine)) break;
    return cleanSummaryFieldValue(cleanLine);
  }
  return "";
}

function getSummaryValueFromJoined(joinedText, label, nextLabels) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const stopPattern = nextLabels
    .map((nextLabel) => nextLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|");
  const match = joinedText.match(new RegExp(`${escapedLabel}\\s+(.+?)(?=\\s+(?:${stopPattern})\\b|$)`, "i"));
  return match ? cleanSummaryFieldValue(match[1]) : "";
}

function getSummaryProcessStepNames(lines) {
  const processIndex = lines.findIndex((line) => /process details/i.test(cleanOcrLabel(line)));
  if (processIndex < 0) return [];

  const names = [];
  for (let index = processIndex + 1; index < lines.length; index += 1) {
    const originalLine = normalizeOcrLine(lines[index]);
    const cleanLine = cleanOcrDisplayValue(lines[index]);
    const cleanLabel = cleanOcrLabel(lines[index]);
    if (!cleanLine || isLikelyOcrNoiseLine(cleanLine)) continue;
    if (/show all process steps|(^|\s)(back|submit)($|\s)/i.test(cleanLabel) || isButtonLikeText(cleanLine)) break;
    if (/estimated duration/i.test(cleanLabel)) continue;
    if (/\b\d+\s*[-–—]\s*\d+\s*days?\b/i.test(originalLine) || /^\d+\s*days?$/i.test(originalLine)) continue;
    if (/\bassigned to\b|\best\.?\s*duration\b/i.test(cleanLine)) continue;
    if (/all steps will be executed/i.test(cleanLine)) continue;
    if (/^\d+$/.test(cleanLine)) continue;

    const stepName = cleanProcessStepName(cleanLine);
    if (!stepName || stepName.split(/\s+/).length > 8) continue;
    names.push(stepName);
  }

  return uniqueValues(names).slice(0, 4);
}

function getProcessDurationFromText(joinedText) {
  const durationMatch = String(joinedText || "").match(
    /\b(?:estimated duration to complete the process\s*)?(\d+\s*[-–—]\s*\d+\s*days?|\d+\s*days?)\b/i,
  );
  if (!durationMatch) return "";
  return normalizeOcrLine(durationMatch[1])
    .replace(/\s*[-–—]\s*/g, "-")
    .replace(/(\d)\s*days?/i, "$1 days")
    .trim();
}

function parseSubmissionSummaryPage(lines) {
  const normalizedLines = (lines || []).map((line) => normalizeOcrLine(line)).filter(Boolean);
  const cleanLines = (lines || []).map((line) => cleanOcrDisplayValue(line)).filter(Boolean);
  const joinedText = cleanLines.join(" ");
  const rawJoinedText = normalizedLines.join(" ");
  const hasSummarySignals =
    /request title/i.test(joinedText) &&
    /opportunity number/i.test(joinedText) &&
    (/process details/i.test(joinedText) || /estimated duration/i.test(joinedText) || /\bsubmit\b/i.test(joinedText));

  if (!hasSummarySignals) return { steps: [], questions: [] };

  const labels = ["Purpose of the Request", "Type of engagement", "Request Type", "Opportunity Number", "SLA timeframes", "Process details"];
  const requestTitle =
    getSummaryValueAfterLabel(cleanLines, /^request title\b/i, [/purpose of the request/i, /type of engagement/i]) ||
    getSummaryValueFromJoined(joinedText, "Request Title", labels);
  const purpose =
    getSummaryValueAfterLabel(cleanLines, /^purpose of the request\b/i, [/type of engagement/i, /^request type$/i, /opportunity number/i]) ||
    getSummaryValueFromJoined(joinedText, "Purpose of the Request", ["Type of engagement", "Request Type", "Opportunity Number"]);
  const engagement =
    getSummaryValueAfterLabel(cleanLines, /^type of engagement\b/i, [/^request type$/i, /opportunity number/i]) ||
    getSummaryValueFromJoined(joinedText, "Type of engagement", ["Request Type", "Opportunity Number"]);
  const requestType =
    getSummaryValueAfterLabel(cleanLines, /^request type\b/i, [/opportunity number/i, /sla timeframes/i, /process details/i]) ||
    getSummaryValueFromJoined(joinedText, "Request Type", ["Opportunity Number", "SLA timeframes", "Process details"]);
  const opportunity =
    cleanOpportunityNumberValue(
      getSummaryValueAfterLabel(cleanLines, /^opportunity number\b/i, [/sla timeframes/i, /process details/i]) ||
        getSummaryValueFromJoined(joinedText, "Opportunity Number", ["SLA timeframes", "Process details"]),
    );

  const duration = getProcessDurationFromText(rawJoinedText);
  const processStepNames = getSummaryProcessStepNames(normalizedLines);

  const steps = ["Observe the final submission summary page."];
  const questions = [""];
  const summaryParts = [
    requestTitle ? `Request Title "${requestTitle}"` : "",
    purpose ? `Purpose of the Request "${purpose}"` : "",
    engagement ? `Type of Engagement "${engagement}"` : "",
    requestType ? `Request Type "${requestType}"` : "",
    opportunity ? `Opportunity Number "${opportunity}"` : "",
  ].filter(Boolean);

  if (summaryParts.length) {
    steps.push(`Verify that the Summary section displays ${summaryParts.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`);
    questions.push("");
  }

  if (duration || processStepNames.length) {
    const processParts = [
      duration ? `estimated duration "${duration}"` : "",
      processStepNames.length ? `process steps ${processStepNames.map((item) => `"${item}"`).join(" and ")}` : "",
    ].filter(Boolean);
    steps.push(`Verify that Process details displays ${processParts.join(" and ")}.`);
    questions.push("");
  }

  steps.push("button Submit");
  questions.push("");

  return { steps, questions };
}

function parseProcessDetailsPage(lines) {
  const normalizedLines = (lines || []).map((line) => normalizeOcrLine(line)).filter(Boolean);
  const cleanLines = (lines || []).map((line) => cleanOcrDisplayValue(line)).filter(Boolean);
  const joinedText = cleanLines.join(" ");
  const rawJoinedText = normalizedLines.join(" ");
  const hasProcessDetailsSignals = /process details/i.test(joinedText) && /estimated duration/i.test(joinedText) && /\bsubmit\b/i.test(joinedText);
  if (!hasProcessDetailsSignals || /request title/i.test(joinedText)) return { steps: [], questions: [] };

  const duration = getProcessDurationFromText(rawJoinedText);
  const processStepNames = getSummaryProcessStepNames(normalizedLines);
  const steps = [];
  const questions = [];

  if (duration || processStepNames.length) {
    const processParts = [
      duration ? `estimated duration "${duration}"` : "",
      processStepNames.length ? `process steps ${processStepNames.map((item) => `"${item}"`).join(" and ")}` : "",
    ].filter(Boolean);
    steps.push(`Verify that Process details displays ${processParts.join(" and ")}.`);
    questions.push("");
  } else {
    steps.push("Observe the Process details page.");
    questions.push("");
  }

  steps.push("button Submit");
  questions.push("");

  return { steps, questions };
}

function generateStepsFromScreenshotText(text, visualRadioGroups = []) {
  const rawLines = splitLines(text)
    .map((line) => normalizeOcrLine(line))
    .filter((line) => !isBrowserChromeOcrLine(line))
    .filter((line, index, lines) => line && (index === 0 || line !== lines[index - 1]));
  const dashboardTileLabel = getDashboardTileLabel(rawLines);
  if (dashboardTileLabel) {
    return {
      steps: [`tile ${dashboardTileLabel}`],
      questions: [""],
    };
  }
  const submissionSummaryDraft = parseSubmissionSummaryPage(rawLines);
  if (submissionSummaryDraft.steps.length) return submissionSummaryDraft;
  const processDetailsDraft = parseProcessDetailsPage(rawLines);
  if (processDetailsDraft.steps.length) return processDetailsDraft;

  const generated = [];
  let pendingLabel = "";
  let pendingOptions = false;
  let visualRadioIndex = 0;
  let hasGeneratedFirstScreenStep = false;
  let hasGeneratedSupplierCard = false;
  let skipUntilLineIndex = -1;

  const peekVisualSelectionGroup = () => {
    if (!Array.isArray(visualRadioGroups) || !visualRadioGroups.length) return null;
    return visualRadioGroups[visualRadioIndex] || null;
  };

  const consumeVisualSelections = (optionWords) => {
    if (!Array.isArray(visualRadioGroups) || !visualRadioGroups.length || optionWords.length < 2) return "";

    while (visualRadioIndex < visualRadioGroups.length) {
      const group = visualRadioGroups[visualRadioIndex];
      visualRadioIndex += 1;

      if (!group || !Number.isInteger(group.selectedIndex) || group.selectedIndex < 0) continue;
      if (group.optionCount !== optionWords.length) continue;

      const indexes =
        Array.isArray(group.selectedIndexes) && group.selectedIndexes.length ? group.selectedIndexes : [group.selectedIndex];
      return indexes.map((index) => optionWords[index] || "").filter(Boolean);
    }

    return [];
  };

  rawLines.forEach((line, lineIndex) => {
    if (lineIndex <= skipUntilLineIndex) return;

    const cleanLine = stripWrappingQuotes(line.replace(/[:*]+$/g, "").trim());
    const lower = cleanLine.toLowerCase();
    const optionWords = getOcrOptionWords(cleanLine);
    const isOptionLine = isOcrOptionOnlyLine(cleanLine);
    const selectedOption = hasChoiceSelectedOcrMarker(cleanLine) ? getSelectedOcrOption(cleanLine) : "";
    const nextLine = rawLines[lineIndex + 1] || "";
    const nextLineHasSelectedOption = hasChoiceSelectedOcrMarker(nextLine) && Boolean(getSelectedOcrOption(nextLine));
    const nextLineIsOptionOnly = isOcrOptionOnlyLine(nextLine);
    const nextLineIsStandaloneValue = isLikelyStandaloneValue(cleanOcrDisplayValue(nextLine));
    const currentLineIsLabel =
      /\?$/.test(cleanLine) ||
      /assessment needed/i.test(cleanLine) ||
      isLikelyQuestionLabel(cleanLine) ||
      getScreenshotFieldType(cleanLine) !== "question" ||
      (nextLineIsStandaloneValue && isLikelyFieldLabel(cleanLine)) ||
      nextLineHasSelectedOption ||
      nextLineIsOptionOnly;
    const canUseNoisyPendingValue =
      pendingLabel &&
      !pendingOptions &&
      /[A-Za-z0-9]/.test(cleanLine) &&
      !isButtonLikeText(cleanLine) &&
      !hasChoiceSelectedOcrMarker(cleanLine) &&
      !hasUnselectedOcrMarker(cleanLine);

    if (isLikelyOcrNoiseLine(cleanLine) && !canUseNoisyPendingValue) return;

    if (!pendingLabel && isTopLevelScreenTitleLine(cleanLine, lineIndex)) {
      generated.push({ step: "form verify visible on screen", question: cleanOcrLabel(cleanLine) });
      hasGeneratedFirstScreenStep = true;
      return;
    }

    if (!pendingLabel && isMalformedChoiceQuestionLabel(cleanLine)) return;

    if (!pendingLabel && isStandaloneUploadDropzoneLine(cleanLine)) {
      generated.push({ step: "document", question: "Upload additional documents (if any)" });
      return;
    }

    if (!pendingLabel && isStandaloneUserPickerLine(cleanLine)) {
      generated.push({ step: "assignee", question: "Add watchers (if any)" });
      return;
    }

    if (!pendingLabel && isEmailLine(cleanLine)) return;
    if (!pendingLabel && isLeftoverChoiceOptionLine(cleanLine)) return;

    if (/^\+?\s*add another supplier$/i.test(cleanLine)) return;

    if (isSupplierCardLabel(cleanLine)) {
      const supplierCard = parseSelectedSupplierCard(rawLines, lineIndex + 1);
      if (supplierCard.items.length) {
        generated.push(...supplierCard.items);
        hasGeneratedSupplierCard = true;
        pendingLabel = "";
        pendingOptions = false;
        skipUntilLineIndex = supplierCard.endIndex;
        return;
      }
      if (hasGeneratedSupplierCard) return;
    }

    if (pendingLabel && isSupplierCardLabel(pendingLabel)) {
      const supplierName = cleanOcrDisplayValue(cleanLine);
      if (supplierName && !isButtonLikeText(supplierName) && !parseSupplierDetailLine(supplierName)) {
        generated.push(createScreenshotStepForValue(pendingLabel, supplierName));
        pendingLabel = "";
        pendingOptions = false;
        return;
      }
    }

    const supplierDetail = parseSupplierDetailLine(cleanLine);
    if (supplierDetail) {
      generated.push({ step: `supplier detail "${supplierDetail.country} and ID ${supplierDetail.id}"`, question: "" });
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (/^(?:\d+[.,]?\s*)?select contact$/i.test(cleanLine)) {
      generated.push({ step: 'button "Select contact"', question: "" });
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (/^enabled for:?$/i.test(cleanLine)) return;

    if (isRecommendedCategoryHeader(cleanLine) && !pendingLabel) return;
    if (isCategoryRecommendationHelperLine(cleanLine) && !pendingLabel) return;

    if (pendingLabel && isCategoryQuestionLabel(pendingLabel)) {
      const recommendedCategory = parseRecommendedCategorySelection(rawLines, lineIndex);
      if (recommendedCategory.value) {
        generated.push({ step: `category "${recommendedCategory.value}"`, question: pendingLabel });
        pendingLabel = "";
        pendingOptions = false;
        skipUntilLineIndex = recommendedCategory.endIndex;
        return;
      }
    }

    const embeddedDropdownFieldValue = parseEmbeddedDropdownFieldValue(cleanLine);
    if (embeddedDropdownFieldValue) {
      if (pendingLabel && !pendingOptions) generated.push(createPendingLabelStep(pendingLabel));
      generated.push(createScreenshotStepForValue(embeddedDropdownFieldValue.label, embeddedDropdownFieldValue.value));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (pendingLabel && (getScreenshotFieldType(pendingLabel) === "question" || isChoiceFieldLabel(pendingLabel))) {
      const visualGroup = peekVisualSelectionGroup();
      const shouldUseMultiSelectFallback = isMultiSelectQuestionLabel(pendingLabel);
      const hasMarkedOptionsNearby = hasNearbyChoiceMarker(rawLines, lineIndex);
      const shouldCollectBareVisualOptions =
        (Boolean(visualGroup?.optionCount && visualGroup.optionCount >= 2) &&
          (isChoiceFieldLabel(pendingLabel) || getScreenshotFieldType(pendingLabel) === "question")) ||
        hasMarkedOptionsNearby ||
        shouldUseMultiSelectFallback;
      const { items: optionItems, endIndex } = collectChoiceOptionItems(rawLines, lineIndex, {
        allowBareFirst: shouldCollectBareVisualOptions,
        allowFieldLikeBare: shouldUseMultiSelectFallback,
        maxItems: shouldCollectBareVisualOptions ? visualGroup?.optionCount || 8 : 0,
      });

      if (optionItems.length) {
        const shouldUseVisualSelection =
          optionItems.length > 1 &&
          (shouldCollectBareVisualOptions || (optionItems.length <= 4 && optionItems.every((item) => isKnownChoiceOptionValue(item.value))));
        const visualSelected = shouldUseVisualSelection ? consumeVisualSelections(optionItems.map((item) => item.value)) : [];
        const selectedValues = uniqueValues(optionItems.filter((item) => item.selected).map((item) => item.value));
        const fallbackValues =
          shouldUseMultiSelectFallback && optionItems.length > 2 ? optionItems.slice(0, 2).map((item) => item.value) : [optionItems[0].value];
        const valuesToUse = visualSelected.length ? uniqueValues(visualSelected) : selectedValues.length ? selectedValues : uniqueValues(fallbackValues);

        if (valuesToUse.length > 1) {
          generated.push({ step: `select multiple ${valuesToUse.map((value) => `"${value}"`).join(" ")}`, question: pendingLabel });
        } else {
          valuesToUse.forEach((value) => {
            const optionValue = OCR_OPTION_VALUES.has(normalizeChoiceOptionKey(value)) ? normalizeChoiceOptionKey(value) : `"${value}"`;
            generated.push({ step: `select ${optionValue}`, question: pendingLabel });
          });
        }
        pendingLabel = "";
        pendingOptions = false;
        skipUntilLineIndex = endIndex;
        return;
      }
    }

    if (pendingLabel && !pendingOptions && isCodeDashValueLine(cleanLine)) {
      generated.push(createScreenshotStepForValue(pendingLabel, cleanLine));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (pendingLabel && getScreenshotFieldType(pendingLabel) === "document" && /click to upload|drag and drop/i.test(cleanLine)) {
      generated.push(createPendingLabelStep(pendingLabel));
      const remainingLabel = cleanLine.match(/\b(delivery location|shipping address|address)\b/i)?.[1] || "";
      pendingLabel = remainingLabel ? titleCase(remainingLabel) : "";
      pendingOptions = false;
      return;
    }

    if (isInformationalTextLine(cleanLine) && !pendingLabel) {
      const messageParts = [cleanOcrDisplayValue(cleanLine)];
      for (let index = lineIndex + 1; index < rawLines.length; index += 1) {
        const continuation = cleanOcrDisplayValue(stripWrappingQuotes(rawLines[index].replace(/[:*]+$/g, "").trim()));
        if (!continuation || isButtonLikeText(continuation) || isLikelyFieldLabel(continuation) || isLikelyQuestionLabel(continuation)) break;
        if (isInformationalTextLine(continuation) || /^[a-z].*[.]?$/.test(continuation)) {
          messageParts.push(continuation);
          skipUntilLineIndex = index;
          continue;
        }
        break;
      }
      generated.push({ step: `info "${messageParts.join(" ").replace(/\s+/g, " ").trim()}"`, question: "" });
      return;
    }

    if (pendingLabel && /(delivery location|address|location)/i.test(pendingLabel) && /(search address|add manually|search)/i.test(cleanLine)) {
      generated.push(createScreenshotStepForValue(pendingLabel, cleanLine));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (pendingLabel && !pendingOptions) {
      const valueAndNextLabel = splitValueAndTrailingFieldLabel(cleanLine);
      if (valueAndNextLabel) {
        generated.push(createScreenshotStepForValue(pendingLabel, valueAndNextLabel.value));
        pendingLabel = valueAndNextLabel.label;
        pendingOptions = false;
        return;
      }
    }

    if (!pendingLabel) {
      const valueAndNextLabel = splitValueAndTrailingFieldLabel(cleanLine);
      const previousGenerated = generated[generated.length - 1];
      if (valueAndNextLabel && canReplacePendingGeneratedStep(previousGenerated)) {
        generated[generated.length - 1] = createScreenshotStepForValue(previousGenerated.question, valueAndNextLabel.value);
        pendingLabel = valueAndNextLabel.label;
        pendingOptions = false;
        return;
      }
    }

    if (pendingLabel && !pendingOptions && getScreenshotFieldType(pendingLabel) === "assignee" && isUserPickerPlaceholderLine(cleanLine)) {
      generated.push(createPendingLabelStep(pendingLabel));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (pendingLabel && !pendingOptions && isAmountLikeFieldLabel(pendingLabel) && isAmountHelperTextLine(cleanLine)) {
      return;
    }

    if (pendingLabel && !pendingOptions && isAmountLikeFieldLabel(pendingLabel) && isCurrencyAmountLine(cleanLine)) {
      const nextCurrencyCode = normalizeCurrencyCodeLine(nextLine);
      generated.push(createScreenshotStepForValue(pendingLabel, nextCurrencyCode ? `${cleanLine} ${nextCurrencyCode}` : cleanLine));
      pendingLabel = "";
      pendingOptions = false;
      if (nextCurrencyCode) skipUntilLineIndex = lineIndex + 1;
      return;
    }

    if (pendingLabel && !pendingOptions && getScreenshotFieldType(pendingLabel) === "date") {
      const dateFieldValue = collectDateFieldValue(rawLines, lineIndex);
      if (dateFieldValue.value) {
        generated.push(createScreenshotStepForValue(pendingLabel, dateFieldValue.value));
        pendingLabel = "";
        pendingOptions = false;
        skipUntilLineIndex = dateFieldValue.endIndex;
        return;
      }
    }

    if (
      pendingLabel &&
      !pendingOptions &&
      getScreenshotFieldType(pendingLabel) === "field" &&
      isLongTextFieldLabel(pendingLabel) &&
      !currentLineIsLabel
    ) {
      const textFieldValue = collectLongTextFieldValue(rawLines, lineIndex);
      if (textFieldValue.value) {
        generated.push(createScreenshotStepForValue(pendingLabel, textFieldValue.value));
        pendingLabel = "";
        pendingOptions = false;
        skipUntilLineIndex = textFieldValue.endIndex;
        return;
      }
    }

    if (pendingLabel && selectedOption) {
      generated.push(createScreenshotStepForValue(pendingLabel, selectedOption));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (isOptionLine) {
      if (pendingLabel) {
        if (!nextLineHasSelectedOption && !nextLineIsOptionOnly && getOcrOptionWords(cleanLine).length === 1) {
          generated.push(createScreenshotStepForValue(pendingLabel, cleanLine));
          pendingLabel = "";
          pendingOptions = false;
          return;
        }
        pendingOptions = true;
      }
      return;
    }

    if (pendingLabel && !pendingOptions && currentLineIsLabel && shouldMergeWrappedLabel(pendingLabel, cleanLine, nextLine)) {
      pendingLabel = cleanOcrLabel(`${pendingLabel} ${cleanLine}`);
      return;
    }

    if (pendingLabel && pendingOptions) {
      pendingLabel = "";
      pendingOptions = false;
    }

    const inlineFieldMatch = cleanLine.match(/^(.+?)\s*(?::|=|\s[-–—]\s)\s*(.+)$/);
    if (inlineFieldMatch) {
      generated.push(createScreenshotStepForValue(inlineFieldMatch[1], inlineFieldMatch[2]));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (/^https?:\/\//i.test(cleanLine)) {
      generated.push({ step: `url ${cleanLine}`, question: "" });
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (/^new supplier onboarding$/i.test(cleanLine)) {
      const lastGenerated = generated[generated.length - 1] || {};
      const followsOnboardingInfo = /^info\b/i.test(lastGenerated.step || "") && /new supplier onboarding/i.test(lastGenerated.step || "");
      const followsSelectedOnboarding =
        /^select\b/i.test(lastGenerated.step || "") &&
        /new supplier onboarding/i.test(lastGenerated.step || "") &&
        /type of supplier/i.test(lastGenerated.question || "");
      if (!followsOnboardingInfo && !followsSelectedOnboarding) return;
    }

    if (isButtonLikeText(cleanLine)) {
      generated.push({ step: cleanLine.toLowerCase() === "submit task" ? "submit task" : `button ${cleanLine}`, question: "" });
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (/^(request|requests)$/i.test(cleanLine)) {
      generated.push({ step: "tab Request", question: "" });
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (/dashboard/i.test(cleanLine) && !pendingLabel) {
      generated.push({ step: "form verify visible on screen", question: cleanLine });
      hasGeneratedFirstScreenStep = true;
      return;
    }

    if (pendingLabel && !pendingOptions && !currentLineIsLabel && isLikelyStandaloneValue(cleanLine)) {
      generated.push(createScreenshotStepForValue(pendingLabel, cleanLine));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (currentLineIsLabel) {
      if (pendingLabel && !pendingOptions) generated.push(createPendingLabelStep(pendingLabel));
      pendingLabel = cleanOcrLabel(cleanLine);
      pendingOptions = false;
      return;
    }

    if (pendingLabel) {
      if (!pendingOptions) generated.push(createScreenshotStepForValue(pendingLabel, cleanLine));
      pendingLabel = "";
      pendingOptions = false;
      return;
    }

    if (!hasGeneratedFirstScreenStep && lineIndex <= 1 && /^[A-Z][A-Za-z0-9 .,&()/-]{3,80}$/.test(cleanLine)) {
      generated.push({ step: "form verify visible on screen", question: cleanLine });
      hasGeneratedFirstScreenStep = true;
      return;
    }

    if (isLikelyStandaloneValue(cleanLine)) return;

    generated.push({ step: `verify ${cleanLine}`, question: cleanLine });
  });

  if (pendingLabel) {
    if (!pendingOptions) generated.push(createPendingLabelStep(pendingLabel));
  }

  return {
    steps: generated.map((item) => item.step),
    questions: generated.map((item) => item.question || ""),
  };
}

function countTextMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function hasProcessSignal(text, pattern) {
  return pattern.test(String(text || ""));
}

 function createStep(index, moduleName = "Procurement", scenarioName = "Create and submit procurement request", selectedColumns = DEFAULT_SELECTED_COLUMNS) {
  const customFields = selectedColumns.reduce((acc, column) => {
    if (!DEFAULT_COLUMNS.includes(column)) acc[column] = "";
    return acc;
  }, {});

  return {
    id: makeId(),
    testCaseId: `TC-${String(index).padStart(3, "0")}`,
    module: moduleName,
    scenario: scenarioName,
    preconditions: "User has valid access.",
    role: "Requester",
    questionLabel: "",
    details: "",
    expected: "",
    actual: "",
    status: "Not Run",
    priority: "Medium",
    notes: "",
    customFields,
  };
}

function getNextTestCaseIndex(steps) {
  const highestExistingIndex = steps.reduce((highest, step) => {
    const match = /^TC-(\d+)$/i.exec(String(step.testCaseId || ""));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return Math.max(highestExistingIndex + 1, steps.length + 1);
}

function getScreenshotImportTestCaseId(steps) {
  const existingScreenshotStep = (steps || []).find((step) => step.source === "screenshot-import" && /^TC-\d+$/i.test(String(step.testCaseId || "")));
  if (existingScreenshotStep) return existingScreenshotStep.testCaseId;

  if (steps.length === 1 && isBlankEditableStep(steps[0]) && /^TC-\d+$/i.test(String(steps[0].testCaseId || ""))) {
    return steps[0].testCaseId;
  }

  const firstEditableStep = (steps || []).find((step) => /^TC-\d+$/i.test(String(step.testCaseId || "")));
  return firstEditableStep?.testCaseId || `TC-${String(getNextTestCaseIndex(steps)).padStart(3, "0")}`;
}

function insertStepAt(steps, index, moduleName, scenarioName, selectedColumns) {
  const safeIndex = Math.max(0, Math.min(Number(index), steps.length));
  const step = createStep(getNextTestCaseIndex(steps), moduleName, scenarioName, selectedColumns);
  return [...steps.slice(0, safeIndex), step, ...steps.slice(safeIndex)];
}

function moveArrayItem(items, fromIndex, toIndex) {
  const safeFrom = Number(fromIndex);
  const safeTo = Math.max(0, Math.min(Number(toIndex), items.length));

  if (!Number.isInteger(safeFrom) || safeFrom < 0 || safeFrom >= items.length) return items;
  if (safeTo === safeFrom || safeTo === safeFrom + 1) return items;

  const next = [...items];
  const [item] = next.splice(safeFrom, 1);
  const adjustedTo = safeFrom < safeTo ? safeTo - 1 : safeTo;
  next.splice(adjustedTo, 0, item);
  return next;
}

function moveSelectedColumn(column, targetColumn, placeAfter = false) {
  const fromIndex = state.selectedColumns.indexOf(column);
  const targetIndex = state.selectedColumns.indexOf(targetColumn);
  if (fromIndex === -1 || targetIndex === -1) return;

  state.selectedColumns = moveArrayItem(state.selectedColumns, fromIndex, targetIndex + (placeAfter ? 1 : 0));
  state.activeSavedFile = null;
  state.customColumnPosition = "end";
}

function buildRowsForFormat(steps, rowFormat) {
  if (rowFormat === "each-step") {
    let counter = 1;
    return steps.flatMap((step) => {
      const rawStepLines = splitLines(step.details).length ? splitLines(step.details) : [""];
      const rawQuestionLines = splitLines(step.questionLabel);
      const { steps: safeLines, questions: questionLines } = normalizeDraftStepPairs(rawStepLines, rawQuestionLines);
      const actualLines = splitLines(step.actual);

      return safeLines.map((line, lineIndex) => {
        const enhancedLine = localEnhanceStep(line, questionLines[lineIndex] || questionLines[0] || "");
        const expectedResult = generateExpectedResult(enhancedLine);
        const actualResult =
          actualLines.length === safeLines.length ? actualLines[lineIndex] || generateActualResult(expectedResult) : generateActualResult(expectedResult);
        const row = {
          "Test Case ID": step.testCaseId,
          Module: step.module,
          Scenario: step.scenario,
          Preconditions: step.preconditions,
          "User Role": step.role,
          "Step Number": String(counter),
          Steps: enhancedLine,
          "Expected Result": expectedResult,
          "Actual Result": actualResult,
          Status: step.status,
          Priority: step.priority,
          Notes: step.notes,
          ...(step.customFields || {}),
        };
        counter += 1;
        return row;
      });
    });
  }

  return steps.map((step, index) => {
    const rawStepLines = splitLines(step.details).length ? splitLines(step.details) : [""];
    const rawQuestionLines = splitLines(step.questionLabel);
    const { steps: safeLines, questions: questionLines } = normalizeDraftStepPairs(rawStepLines, rawQuestionLines);
    const enhancedLines = safeLines.map((line, lineIndex) => localEnhanceStep(line, questionLines[lineIndex] || questionLines[0] || ""));
    const stepNumbers = safeLines.map((_, subIndex) => `${index + 1}.${subIndex + 1}`);
    const expectedResult = generateGroupedExpectedResult(enhancedLines);
    const autoActualResult = generateActualResult(expectedResult);
    const actualLines = splitLines(step.actual);

    return {
      "Test Case ID": step.testCaseId,
      Module: step.module,
      Scenario: step.scenario,
      Preconditions: step.preconditions,
      "User Role": step.role,
      "Step Number": joinLines(stepNumbers),
      Steps: joinLines(enhancedLines),
      "Expected Result": expectedResult,
      "Actual Result": actualLines.length ? joinSentenceFragments(actualLines) : autoActualResult,
      Status: step.status,
      Priority: step.priority,
      Notes: step.notes,
      ...(step.customFields || {}),
    };
  });
}

function rowsToEditableSteps(rows, moduleName, scenarioName) {
  return (rows || []).map((row, index) => {
    const customFields = Object.fromEntries(Object.entries(row).filter(([key]) => !DEFAULT_COLUMNS.includes(key)));
    return {
      id: makeId(),
      testCaseId: row["Test Case ID"] || `TC-${String(index + 1).padStart(3, "0")}`,
      module: row.Module || moduleName,
      scenario: row.Scenario || scenarioName,
      preconditions: row.Preconditions || "User has valid access.",
      role: row["User Role"] || "Requester",
      questionLabel: "",
      details: row.Steps || "",
      expected: row["Expected Result"] || "",
      actual: row["Actual Result"] || "",
      status: row.Status || "Not Run",
      priority: row.Priority || "Medium",
      notes: row.Notes || "",
      customFields,
    };
  });
}

function createSavedFileEditDraft(file, moduleName, scenarioName, fallbackColumns) {
  const selectedColumns = [...new Set([...(file.columns || fallbackColumns), "Question / Field Label"])];
  const editableSteps = rowsToEditableSteps(file.rows, moduleName, scenarioName);

  return {
    editingFileId: file.id,
    activeSavedFile: null,
    currentPage: "builder",
    fileName: file.name || "Test Case",
    rowFormat: file.rowFormat || "each-step",
    selectedColumns,
    steps: editableSteps.length ? editableSteps : [createStep(1, moduleName, scenarioName, selectedColumns)],
  };
}

function getFileOwner(file) {
  const createdBy = file?.createdBy || {};
  return {
    id: file?.ownerUserId || createdBy.id || "",
    name: file?.ownerName || createdBy.name || "",
    username: file?.ownerUsername || createdBy.username || "",
  };
}

function getCurrentOwnerMetadata() {
  return {
    ownerUserId: state.currentUser?.id || "",
    ownerName: state.currentUser?.name || "",
    ownerUsername: state.currentUser?.username || "",
    createdBy: state.currentUser
      ? {
          id: state.currentUser.id,
          name: state.currentUser.name,
          username: state.currentUser.username,
        }
      : null,
  };
}

function canAccessSavedFile(file, user = state.currentUser) {
  if (!file || !user) return false;
  if (isAdminUser(user)) return true;
  const owner = getFileOwner(file);
  return Boolean(owner.id && owner.id === user.id);
}

function visibleSavedFiles() {
  return state.savedFiles.filter((file) => canAccessSavedFile(file));
}

function fileCreatorLabel(file) {
  const owner = getFileOwner(file);
  if (owner.name && owner.username) return `${owner.name} (${owner.username})`;
  if (owner.name || owner.username) return owner.name || owner.username;
  return "Legacy / unknown";
}

function openTestcaseDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this browser."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSavedFilesFromDb() {
  const db = await openTestcaseDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((Array.isArray(request.result) ? request.result : []).sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0)));
    request.onerror = () => reject(request.error);
  });
}

async function saveFileToDb(file) {
  const db = await openTestcaseDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(file);
    request.onsuccess = () => resolve(file);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFileFromDb(id) {
  const db = await openTestcaseDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

function readStoredUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    active: user.active !== false,
    createdAt: user.createdAt,
  };
}

function getPublicUsers() {
  return readStoredUsers().map(publicUser);
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const value = `testcase-builder:${String(password || "")}`;
  if (typeof crypto !== "undefined" && crypto.subtle && typeof TextEncoder !== "undefined") {
    const encoded = new TextEncoder().encode(value);
    return `sha256:${bytesToHex(await crypto.subtle.digest("SHA-256", encoded))}`;
  }
  if (typeof btoa === "function") {
    return `local:${btoa(unescape(encodeURIComponent(value)))}`;
  }
  return `local:${Array.from(encodeURIComponent(value))
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function ensureDefaultAdminUser() {
  const users = readStoredUsers();
  if (users.some((user) => normalizeUsername(user.username) === DEFAULT_ADMIN_USERNAME)) return users;

  const admin = {
    id: makeId(),
    name: "Admin",
    username: DEFAULT_ADMIN_USERNAME,
    role: "Admin",
    active: true,
    passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
    createdAt: new Date().toLocaleString(),
  };
  const nextUsers = [admin, ...users];
  writeStoredUsers(nextUsers);
  return nextUsers;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function loadSavedFiles() {
  if (state.authMode === "remote") {
    if (!state.currentUser) {
      state.savedFiles = [];
      return;
    }
    const data = await apiRequest("/api/files");
    state.savedFiles = Array.isArray(data.files) ? data.files : [];
    if (state.activeSavedFile && !state.savedFiles.some((file) => file.id === state.activeSavedFile.id)) {
      state.activeSavedFile = null;
    }
    return;
  }

  state.savedFiles = await getSavedFilesFromDb();
}

async function refreshUsers() {
  if (state.authMode === "remote" && isAdminUser()) {
    const data = await apiRequest("/api/users");
    state.users = Array.isArray(data.users) ? data.users : [];
  } else {
    state.users = getPublicUsers();
  }
}

async function initializeAuth() {
  state.authReady = false;

  try {
    const session = await apiRequest("/api/session");
    state.authMode = "remote";
    state.currentUser = session.user || null;
    state.users = Array.isArray(session.users) ? session.users : [];
    await loadSavedFiles();
    state.loginError = "";
    state.authReady = true;
    renderApp();
    return;
  } catch (error) {
    state.authMode = "local";
  }

  try {
    const users = await ensureDefaultAdminUser();
    state.users = users.map(publicUser);
    const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
    const sessionUser = users.find((user) => user.id === session?.userId && user.active !== false);
    state.currentUser = sessionUser ? publicUser(sessionUser) : null;
    await loadSavedFiles();
  } catch (error) {
    console.warn("Unable to initialize local users", error);
    state.loginError = "Unable to initialize local login storage.";
  } finally {
    state.authReady = true;
    renderApp();
  }
}

async function loginUser() {
  const username = normalizeUsername(state.loginUsername);
  const password = state.loginPassword;
  state.loginError = "";

  if (!username || !password) {
    state.loginError = "Enter username and password.";
    renderApp();
    return;
  }

  if (state.authMode === "remote") {
    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      state.currentUser = data.user;
      if (state.currentPage === "users" && !isAdminUser(state.currentUser)) state.currentPage = "builder";
      state.users = Array.isArray(data.users) ? data.users : [];
      state.loginUsername = "";
      state.loginPassword = "";
      state.loginError = "";
      await loadSavedFiles();
    } catch (error) {
      state.loginError = error.message || "Invalid username or password.";
    }
    renderApp();
    return;
  }

  const users = readStoredUsers();
  const user = users.find((item) => normalizeUsername(item.username) === username);
  if (!user || user.active === false || user.passwordHash !== (await hashPassword(password))) {
    state.loginError = "Invalid username or password.";
    renderApp();
    return;
  }

  state.currentUser = publicUser(user);
  if (state.currentPage === "users" && !isAdminUser(state.currentUser)) state.currentPage = "builder";
  if (state.activeSavedFile && !canAccessSavedFile(state.activeSavedFile, state.currentUser)) state.activeSavedFile = null;
  state.loginUsername = "";
  state.loginPassword = "";
  state.loginError = "";
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: user.id }));
  renderApp();
}

async function logoutUser() {
  if (state.authMode === "remote") {
    await apiRequest("/api/logout", { method: "POST" }).catch((error) => console.warn("Remote logout failed", error));
  } else {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
  state.currentUser = null;
  state.currentPage = "builder";
  state.loginPassword = "";
  state.loginError = "";
  state.savedFiles = [];
  state.activeSavedFile = null;
}

async function addUser() {
  if (!isAdminUser()) return;
  const name = state.userFormName.trim();
  const username = normalizeUsername(state.userFormUsername);
  const password = state.userFormPassword;
  const role = state.userFormRole === "Admin" ? "Admin" : "User";
  const users = readStoredUsers();

  if (!name || !username || !password) {
    state.userManagementStatus = "Name, username, and password are required.";
    renderApp();
    return;
  }

  if (password.length < 4) {
    state.userManagementStatus = "Password must be at least 4 characters.";
    renderApp();
    return;
  }

  if (users.some((user) => normalizeUsername(user.username) === username)) {
    state.userManagementStatus = "That username already exists.";
    renderApp();
    return;
  }

  if (state.authMode === "remote") {
    try {
      const data = await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, username, password, role }),
      });
      state.users = Array.isArray(data.users) ? data.users : [];
      state.userFormName = "";
      state.userFormUsername = "";
      state.userFormPassword = "";
      state.userFormRole = "User";
      state.userManagementStatus = `User "${username}" added.`;
    } catch (error) {
      state.userManagementStatus = error.message || "Unable to add user.";
    }
    renderApp();
    return;
  }

  const user = {
    id: makeId(),
    name,
    username,
    role,
    active: true,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toLocaleString(),
  };
  writeStoredUsers([...users, user]);
  state.users = getPublicUsers();
  state.userFormName = "";
  state.userFormUsername = "";
  state.userFormPassword = "";
  state.userFormRole = "User";
  state.userManagementStatus = `User "${username}" added.`;
  renderApp();
}

function deleteUser(userId) {
  if (!isAdminUser()) return;
  const users = state.authMode === "remote" ? state.users : readStoredUsers().map(publicUser);
  const user = users.find((item) => item.id === userId);
  if (!user) return;
  if (state.currentUser?.id === userId) {
    state.userManagementStatus = "You cannot delete your own signed-in admin account.";
    renderApp();
    return;
  }

  const remainingAdmins = users.filter((item) => item.id !== userId && item.active !== false && String(item.role).toLowerCase() === "admin");
  if (String(user.role).toLowerCase() === "admin" && !remainingAdmins.length) {
    state.userManagementStatus = "At least one active admin is required.";
    renderApp();
    return;
  }

  if (state.authMode === "remote") {
    apiRequest(`/api/users/${encodeURIComponent(userId)}`, { method: "DELETE" })
      .then(async (data) => {
        state.users = Array.isArray(data.users) ? data.users : [];
        state.userManagementStatus = `User "${user.username}" deleted.`;
        await loadSavedFiles();
        renderApp();
      })
      .catch((error) => {
        state.userManagementStatus = error.message || "Unable to delete user.";
        renderApp();
      });
    return;
  }

  writeStoredUsers(readStoredUsers().filter((item) => item.id !== userId));
  state.users = getPublicUsers();
  state.userManagementStatus = `User "${user.username}" deleted.`;
  renderApp();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function attr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function buttonHtml(label, action, options = {}) {
  const classes = ["button", options.variant || ""].filter(Boolean).join(" ");
  const icon = options.icon ? ICONS[options.icon] : "";
  const extra = options.extra || "";
  return `<button type="button" class="${classes}" data-action="${attr(action)}" ${extra}>${icon}<span>${escapeHtml(label)}</span></button>`;
}

function renderLoginPage() {
  return `
    <main class="app-shell auth-shell">
      <section class="card auth-card">
        <div class="card-body stack">
          <div>
            <h1>Testcase Builder</h1>
            <p class="subtle">Sign in to build and manage UAT test cases.</p>
          </div>
          <div class="auth-hint">
            Default admin: <strong>${escapeHtml(DEFAULT_ADMIN_USERNAME)}</strong> / <strong>${escapeHtml(DEFAULT_ADMIN_PASSWORD)}</strong>
          </div>
          ${state.loginError ? `<div class="form-message danger-message">${escapeHtml(state.loginError)}</div>` : ""}
          <label class="field">
            <span>Username</span>
            <input data-bind="loginUsername" value="${attr(state.loginUsername)}" autocomplete="username" />
          </label>
          <label class="field">
            <span>Password</span>
            <input data-bind="loginPassword" value="${attr(state.loginPassword)}" type="password" autocomplete="current-password" />
          </label>
          <button type="button" class="button full" data-action="login">Sign In</button>
        </div>
      </section>
    </main>
  `;
}

function previewColumns() {
  return state.selectedColumns.filter((column) => column !== "Question / Field Label");
}

function builderColumns() {
  return state.selectedColumns.filter((column) => column !== "Step Number");
}

function generatedRows() {
  return buildRowsForFormat(state.steps, state.rowFormat);
}

function currentPreviewColumns() {
  return state.activeSavedFile ? state.activeSavedFile.columns : previewColumns();
}

function currentPreviewRows() {
  return state.activeSavedFile ? state.activeSavedFile.rows : generatedRows();
}

function renderPreviewTable(columns, rows) {
  if (!columns.length) {
    return '<div class="empty-state">No preview columns selected.</div>';
  }

  const header = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td class="preview-cell">${escapeHtml(row[column] || "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<div class="table-shell"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderHeader() {
  const userLabel = state.currentUser
    ? `<span class="user-pill">${escapeHtml(state.currentUser.name || state.currentUser.username)} · ${escapeHtml(state.currentUser.role)}</span>`
    : "";
  return `
    <section class="card">
      <div class="card-body">
        <div class="header-grid">
          <div>
            <h1>Testcase Builder</h1>
            <p class="subtle">Build large testcases using selected columns, grouped steps, and local step enhancement. Build: ${APP_VERSION}</p>
          </div>
          <div class="toolbar">
            <button type="button" class="button secondary ${state.currentPage === "builder" ? "active" : ""}" data-action="show-builder">Builder</button>
            <button type="button" class="button secondary ${state.currentPage === "history" ? "active" : ""}" data-action="show-history">${ICONS.file}<span>History / Files</span></button>
            ${
              isAdminUser()
                ? `<button type="button" class="button secondary ${state.currentPage === "users" ? "active" : ""}" data-action="show-users">Users</button>`
                : ""
            }
            ${buttonHtml("Export CSV", "export-csv", { variant: "secondary", icon: "download" })}
            ${buttonHtml("Export Excel", "export-excel", { variant: "secondary", icon: "download" })}
            ${userLabel}
            <button type="button" class="button ghost" data-action="logout">Logout</button>
          </div>
        </div>
        ${
          state.currentPage === "users"
            ? ""
            : `<label class="field header-name">
                <span>Test Case File Name</span>
                <input data-bind="fileName" value="${attr(state.fileName)}" placeholder="Example: Procurement Intake Test Case" />
              </label>`
        }
      </div>
    </section>
  `;
}

function renderBasicDetails() {
  return `
    <section class="card">
      <div class="card-body">
        <h2>${ICONS.file}<span>Basic Details</span></h2>
        <label class="field">
          <span>Module</span>
          <input data-bind="moduleName" value="${attr(state.moduleName)}" />
        </label>
        <label class="field">
          <span>Scenario</span>
          <input data-bind="scenarioName" value="${attr(state.scenarioName)}" />
        </label>
      </div>
    </section>
  `;
}

function renderColumnChooser() {
  const chips = DEFAULT_COLUMNS.map(
    (column) => {
      const isSelected = state.selectedColumns.includes(column);
      const dragAttrs = isSelected ? `draggable="true" data-draggable-column="${attr(column)}" data-column-drop="${attr(column)}"` : "";
      return `<button type="button" class="chip ${isSelected ? "active movable-chip" : ""}" data-action="toggle-column" data-column="${attr(column)}" ${dragAttrs}>${escapeHtml(
        column,
      )}</button>`;
    },
  ).join("");
  const columnPositionOptions = [
    '<option value="end">At end</option>',
    ...state.selectedColumns.map(
      (column, index) => `<option value="${index}" ${state.customColumnPosition === String(index) ? "selected" : ""}>Before ${escapeHtml(column)}</option>`,
    ),
  ].join("");

  return `
    <section class="card">
      <div class="card-body stack">
        <div class="section-head">
          <h2><span>Choose Columns</span></h2>
          <div class="toolbar">
            ${buttonHtml("Select Defaults", "select-defaults", { variant: "secondary" })}
            ${buttonHtml("Clear All", "clear-columns", { variant: "secondary danger" })}
          </div>
        </div>
        <div class="chip-list">${chips}</div>
        <div class="custom-column-row">
          <input class="input" data-bind="customColumn" value="${attr(state.customColumn)}" placeholder="Add custom column" />
          <select class="input" data-bind="customColumnPosition" aria-label="Custom column position">
            ${columnPositionOptions}
          </select>
          ${buttonHtml("Add", "add-custom-column")}
        </div>
      </div>
    </section>
  `;
}

function renderRowFormat() {
  return `
    <section class="card">
      <div class="card-body stack">
        <h2><span>Row Format</span></h2>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="rowFormat" value="each-step" data-bind="rowFormat" ${state.rowFormat === "each-step" ? "checked" : ""} />
            <span>Each step as individual row</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="rowFormat" value="form-step" data-bind="rowFormat" ${state.rowFormat === "form-step" ? "checked" : ""} />
            <span>One row per form/page step</span>
          </label>
        </div>
      </div>
    </section>
  `;
}

function renderScreenshotImporter() {
  return `
    <section class="card">
      <div class="card-body stack">
        <div class="section-head">
          <div>
            <h2><span>Screenshot Import</span></h2>
            <p class="subtle">${escapeHtml(
              state.screenshotStatus || "Upload a screenshot for OCR, or paste extracted screen text. OCR may download its engine on first use.",
            )}</p>
          </div>
          <div class="toolbar">
            ${buttonHtml("Generate Steps", "generate-from-screenshot", { variant: "secondary", icon: "wand" })}
            ${buttonHtml("Clear", "clear-screenshot-import", { variant: "ghost danger" })}
          </div>
        </div>
        <div class="screenshot-import-grid">
          <label class="field">
            <span>Screenshot</span>
            <input type="file" accept="image/*" data-bind="screenshotFile" />
          </label>
          <label class="field">
            <span>Screen Text</span>
            <textarea data-bind="screenshotText" class="input screenshot-text" placeholder="Paste OCR text from the screenshot here">${escapeHtml(state.screenshotText)}</textarea>
          </label>
        </div>
        ${state.screenshotDebug ? `<div class="form-message">${escapeHtml(state.screenshotDebug)}</div>` : ""}
        ${
          state.screenshotPreview
            ? `<figure class="screenshot-preview"><img src="${attr(state.screenshotPreview)}" alt="${attr(
                state.screenshotFileName || "Uploaded screenshot",
              )}" /><figcaption>${escapeHtml(state.screenshotFileName)}</figcaption></figure>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderStepControl(step, column) {
  const fieldName = COLUMN_FIELD_MAP[column];
  const isCustomColumn = !DEFAULT_COLUMNS.includes(column);
  const value = column === "Steps" ? step.details : isCustomColumn ? step.customFields?.[column] || "" : step[fieldName] || "";
  const placeholder = column === "Steps" ? `select yes${NEWLINE}enter spouse details${NEWLINE}upload marriage certificate` : column;
  const data = `data-step-id="${attr(step.id)}" data-column="${attr(column)}" data-field="${attr(fieldName || "")}" data-custom="${isCustomColumn ? "true" : "false"}"`;

  if (MULTILINE_FIELDS.has(column)) {
    return `<textarea class="input cell-control" ${data} placeholder="${attr(placeholder)}">${escapeHtml(value)}</textarea>`;
  }
  return `<input class="input cell-control" ${data} value="${attr(value)}" placeholder="${attr(column)}" />`;
}

function renderStepBuilder() {
  const columns = builderColumns();
  const content = columns.length
    ? `
      <div class="table-shell step-table">
        <table>
          <thead>
            <tr>
              <th>Row</th>
              ${columns
                .map(
                  (column) =>
                    `<th class="column-header-movable" draggable="true" data-draggable-column="${attr(column)}" data-column-drop="${attr(
                      column,
                    )}"><span class="column-heading">${ICONS.grip}<span>${escapeHtml(column)}</span></span></th>`,
                )
                .join("")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${state.steps
              .map(
                (step, index) => `
                  <tr data-row-index="${index}">
                    <td class="row-index">
                      <button type="button" class="drag-handle" draggable="true" data-drag-row-index="${index}" aria-label="Move row ${index + 1}">
                        ${ICONS.grip}<span>${index + 1}</span>
                      </button>
                    </td>
                    ${columns.map((column) => `<td>${renderStepControl(step, column)}</td>`).join("")}
                    <td class="action-cell">
                      <div class="row-actions">
                        <button type="button" class="button secondary full" data-action="insert-row-above" data-row-index="${index}">${ICONS.plus}<span>Add Above</span></button>
                        <button type="button" class="button secondary full" data-action="insert-row-below" data-row-index="${index}">${ICONS.plus}<span>Add Below</span></button>
                        <button type="button" class="button secondary full" data-action="enhance-row" data-step-id="${attr(step.id)}">${ICONS.wand}<span>AI</span></button>
                        <button type="button" class="button ghost danger full" data-action="delete-row" data-step-id="${attr(step.id)}">${ICONS.trash}<span>Delete</span></button>
                      </div>
                    </td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
    : '<div class="empty-state">No columns selected. Select at least one column to edit step details.</div>';

  return `
    <section class="card">
      <div class="card-body stack">
        <div>
          <h2><span>Step Builder</span></h2>
          <p class="subtle">Question / Field Label is used internally by enhancement and hidden from preview/export.</p>
        </div>
        ${content}
        <div class="footer-actions">
          <button type="button" class="button secondary" data-action="finish-test-case">${ICONS.file}<span>${state.editingFileId ? "Update Test Case" : "Finish Test Case"}</span></button>
          <button type="button" class="button" data-action="add-row">${ICONS.plus}<span>Add Row</span></button>
        </div>
      </div>
    </section>
  `;
}

function renderGeneratedPreview() {
  return `
    <section class="card">
      <div class="card-body stack">
        <h2><span>Generated Testcase Preview</span></h2>
        <div id="generated-preview">${renderPreviewTable(currentPreviewColumns(), currentPreviewRows())}</div>
      </div>
    </section>
  `;
}

function renderExportFallback() {
  if (!state.exportContent) return "";
  return `
    <section class="card">
      <div class="card-body stack">
        <div class="export-head">
          <div>
            <h2><span>Export Fallback</span></h2>
            <p class="subtle">If the file did not download, copy this content and save it as ${escapeHtml(state.exportFileName || "testcases.csv")}.</p>
          </div>
          ${buttonHtml("Copy Content", "copy-export", { variant: "secondary" })}
        </div>
        ${renderPreviewTable(previewColumns(), generatedRows())}
      </div>
    </section>
  `;
}

function renderBuilderPage() {
  return `
    <div class="grid details">
      ${renderBasicDetails()}
      ${renderColumnChooser()}
    </div>
    ${renderRowFormat()}
    ${renderScreenshotImporter()}
    ${renderStepBuilder()}
    ${renderGeneratedPreview()}
    ${renderExportFallback()}
  `;
}

function renderHistoryCards() {
  const files = visibleSavedFiles();
  if (!files.length) {
    return `<div class="empty-state">${
      isAdminUser() ? "No finished test cases yet." : "No finished test cases assigned to your user yet."
    }</div>`;
  }

  return `
    <div class="history-grid">
      ${files
        .map(
          (file) => `
            <article class="file-card">
              <div class="file-title">${escapeHtml(file.name)}</div>
              <div class="file-meta">Created by: ${escapeHtml(fileCreatorLabel(file))}</div>
              <div class="file-meta">Created: ${escapeHtml(file.createdAt)}</div>
              ${file.updatedAt ? `<div class="file-meta">Updated: ${escapeHtml(file.updatedAt)}</div>` : ""}
              <div class="file-meta">Rows: ${escapeHtml(file.rows.length)}</div>
              <div class="file-actions">
                <button type="button" class="button secondary" data-action="load-file" data-file-id="${attr(file.id)}">View</button>
                <button type="button" class="button secondary" data-action="edit-file" data-file-id="${attr(file.id)}">Edit</button>
                <button type="button" class="button secondary" data-action="download-file-csv" data-file-id="${attr(file.id)}">CSV</button>
                <button type="button" class="button secondary" data-action="download-file-excel" data-file-id="${attr(file.id)}">Excel</button>
                <button type="button" class="button ghost danger" data-action="delete-file" data-file-id="${attr(file.id)}">Delete</button>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderHistoryPage() {
  return `
    <section class="card">
      <div class="card-body stack">
        <div class="section-head">
          <div>
            <h2><span>File History</span></h2>
            <p class="subtle">${
              isAdminUser()
                ? "Admins can see and download all saved test cases."
                : "You can see and download only test cases created by your user."
            }</p>
          </div>
          ${buttonHtml("New Test Case", "new-test-case", { icon: "plus" })}
        </div>
        ${renderHistoryCards()}
      </div>
    </section>
    ${
      state.activeSavedFile
        ? `<section class="card"><div class="card-body stack"><div><h2><span>${escapeHtml(
            state.activeSavedFile.name,
          )}</span></h2><p class="subtle">Created by: ${escapeHtml(fileCreatorLabel(state.activeSavedFile))}</p></div>${renderPreviewTable(
            state.activeSavedFile.columns,
            state.activeSavedFile.rows,
          )}</div></section>`
        : ""
    }
  `;
}

function renderUsersPage() {
  if (!isAdminUser()) {
    return '<section class="card"><div class="card-body"><div class="empty-state">Only admins can manage users.</div></div></section>';
  }

  const userRows = state.users
    .map(
      (user) => `
        <tr>
          <td>${escapeHtml(user.name)}</td>
          <td>${escapeHtml(user.username)}</td>
          <td>${escapeHtml(user.role)}</td>
          <td>${escapeHtml(user.createdAt || "")}</td>
          <td>
            ${
              user.id === state.currentUser?.id
                ? '<span class="subtle">Signed in</span>'
                : `<button type="button" class="button ghost danger" data-action="delete-user" data-user-id="${attr(user.id)}">Delete</button>`
            }
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <section class="card">
      <div class="card-body stack">
        <div>
          <h2><span>User Management</span></h2>
          <p class="subtle">Admins can add users for this browser-based app. User data is stored locally in this browser.</p>
        </div>
        ${state.userManagementStatus ? `<div class="form-message">${escapeHtml(state.userManagementStatus)}</div>` : ""}
        <div class="user-form-grid">
          <label class="field">
            <span>Name</span>
            <input data-bind="userFormName" value="${attr(state.userFormName)}" placeholder="Example: Priya Shah" />
          </label>
          <label class="field">
            <span>Username</span>
            <input data-bind="userFormUsername" value="${attr(state.userFormUsername)}" placeholder="example.user" autocomplete="off" />
          </label>
          <label class="field">
            <span>Password</span>
            <input data-bind="userFormPassword" value="${attr(state.userFormPassword)}" type="password" autocomplete="new-password" />
          </label>
          <label class="field">
            <span>Role</span>
            <select class="input" data-bind="userFormRole">
              <option value="User" ${state.userFormRole === "User" ? "selected" : ""}>User</option>
              <option value="Admin" ${state.userFormRole === "Admin" ? "selected" : ""}>Admin</option>
            </select>
          </label>
        </div>
        <div class="footer-actions">
          <button type="button" class="button" data-action="add-user">${ICONS.plus}<span>Add User</span></button>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="card-body stack">
        <h2><span>Users</span></h2>
        <div class="table-shell">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>${userRows}</tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderApp() {
  if (!state.authReady) {
    document.getElementById("app").innerHTML = `
      <main class="app-shell auth-shell">
        <section class="card auth-card"><div class="card-body"><p class="subtle">Loading local login...</p></div></section>
      </main>
    `;
    return;
  }

  if (!state.currentUser) {
    document.getElementById("app").innerHTML = renderLoginPage();
    return;
  }

  const pageContent = state.currentPage === "history" ? renderHistoryPage() : state.currentPage === "users" ? renderUsersPage() : renderBuilderPage();
  document.getElementById("app").innerHTML = `
    <main class="app-shell">
      <div class="workspace stack">
        ${renderHeader()}
        ${pageContent}
      </div>
    </main>
  `;
}

function refreshPreview() {
  const preview = document.getElementById("generated-preview");
  if (preview) {
    preview.innerHTML = renderPreviewTable(currentPreviewColumns(), currentPreviewRows());
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function scoreOcrText(text) {
  const lines = splitLines(text);
  const lower = String(text || "").toLowerCase();
  const fieldHints = [
    "type of engagement",
    "sales opportunity",
    "target date",
    "estimated project amount",
    "cost case",
    "opportunity number",
    "request type",
    "capital expenditure",
    "reusable assets",
    "quotation from a supplier",
    "upload additional documents",
    "add watchers",
  ];
  const foundHints = fieldHints.filter((hint) => lower.includes(hint)).length;
  const valueSignals = [
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2},\s*\d{4}\b/i,
    /[$€£]\s*\d[\d,.\s]*/i,
    /\b[A-Z0-9]+[-_][A-Z0-9-]+\b/,
  ].filter((pattern) => pattern.test(text)).length;
  const selectedSignals = (String(text || "").match(OCR_SELECTED_MARKER_PATTERN) || []).length;
  return lines.length + foundHints * 12 + valueSignals * 8 + selectedSignals * 2;
}

function selectBestOcrText(candidates) {
  return candidates
    .map((text) => String(text || "").trim())
    .filter(Boolean)
    .sort((a, b) => scoreOcrText(b) - scoreOcrText(a))[0] || "";
}

function loadExternalScriptOnce(src, globalName) {
  if (globalName && window[globalName]) return Promise.resolve(window[globalName]);

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(globalName ? window[globalName] : true), { once: true });
      existingScript.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

async function extractTextWithTesseract(file) {
  const worker = await createTesseractWorker("screenshot");

  try {
    state.screenshotStatus = "Running enhanced OCR...";
    renderApp();
    const originalResult = await worker.recognize(file);
    const enhancedImage = await createEnhancedOcrImage(file).catch((error) => {
      console.warn("Unable to prepare enhanced OCR image", error);
      return "";
    });
    const enhancedResult = enhancedImage ? await worker.recognize(enhancedImage) : null;
    return selectBestOcrText([originalResult?.data?.text || "", enhancedResult?.data?.text || ""]);
  } finally {
    await worker.terminate();
  }
}

async function createTesseractWorker(contextLabel = "OCR") {
  const setStatus = (message) => {
    state.screenshotStatus = message;
    renderApp();
  };

  setStatus("Loading OCR engine...");

  const Tesseract = await loadExternalScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js", "Tesseract");
  if (!Tesseract?.createWorker) throw new Error("Tesseract OCR engine did not load.");

  setStatus("Preparing OCR worker...");

  return Tesseract.createWorker("eng", 1, {
    logger: (message) => {
      if (message?.status && typeof message.progress === "number") {
        setStatus(`OCR ${message.status}: ${Math.round(message.progress * 100)}%`);
      }
    },
  });
}

async function getImageSourceFromFile(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  const dataUrl = await readFileAsDataUrl(file);
  return loadImageElement(dataUrl);
}

async function createEnhancedOcrImage(file) {
  if (typeof document === "undefined") return "";

  const source = await getImageSourceFromFile(file);
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) return "";

  const widthScale = Math.min(3, Math.max(1.35, 2600 / sourceWidth));
  const heightScale = Math.min(widthScale, 5200 / sourceHeight);
  const scale = Math.max(1, heightScale);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    let value = (gray - 128) * 1.55 + 128;
    if (value > 238) value = 255;
    if (value < 55) value = 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

async function extractTextFromImageIfAvailable(file) {
  if (typeof TextDetector === "undefined" || typeof createImageBitmap !== "function") {
    return extractTextWithTesseract(file);
  }

  let browserText = "";
  try {
    state.screenshotStatus = "Running browser OCR...";
    renderApp();
    const bitmap = await createImageBitmap(file);
    const detector = new TextDetector();
    const detections = await detector.detect(bitmap);
    browserText = detections.map((item) => item.rawValue).filter(Boolean).join(NEWLINE);
  } catch (error) {
    console.warn("Browser OCR failed, trying Tesseract.js", error);
  }

  try {
    const tesseractText = await extractTextWithTesseract(file);
    return selectBestOcrText([browserText, tesseractText]);
  } catch (error) {
    console.warn("Enhanced OCR failed, using browser OCR result", error);
    return browserText;
  }
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load screenshot preview."));
    image.src = src;
  });
}

function isSelectedRadioPixel(red, green, blue, alpha) {
  return alpha > 180 && green > 115 && red < 165 && blue < 135 && green - red > 35 && green - blue > 45;
}

function isUnselectedRadioPixel(red, green, blue, alpha) {
  return (
    alpha > 160 &&
    red >= 145 &&
    red <= 235 &&
    green >= 145 &&
    green <= 235 &&
    blue >= 145 &&
    blue <= 235 &&
    Math.abs(red - green) <= 18 &&
    Math.abs(green - blue) <= 18
  );
}

function findCircleComponents(imageData, pixelMatcher, kind) {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (pixelMatcher(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) mask[index] = 1;
  }

  const circles = [];
  const stack = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length) {
      const current = stack.pop();
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [current - 1, current + 1, current - width, current + width];
      neighbors.forEach((neighbor) => {
        if (neighbor < 0 || neighbor >= mask.length || visited[neighbor] || !mask[neighbor]) return;
        if ((neighbor === current - 1 && x === 0) || (neighbor === current + 1 && x === width - 1)) return;
        visited[neighbor] = 1;
        stack.push(neighbor);
      });
    }

    const componentWidth = maxX - minX + 1;
    const componentHeight = maxY - minY + 1;
    const ratio = componentWidth / Math.max(1, componentHeight);
    const fillRatio = area / Math.max(1, componentWidth * componentHeight);

    if (
      componentWidth >= 8 &&
      componentWidth <= 42 &&
      componentHeight >= 8 &&
      componentHeight <= 42 &&
      ratio >= 0.65 &&
      ratio <= 1.45 &&
      fillRatio >= 0.08 &&
      fillRatio <= 0.8
    ) {
      circles.push({
        id: `${kind}-${circles.length}`,
        kind,
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        radius: (componentWidth + componentHeight) / 4,
      });
    }
  }

  return circles;
}

function hasVisualContinueButtonInImageData(imageData) {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (isSelectedRadioPixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) mask[index] = 1;
  }

  const stack = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    stack.push(start);
    visited[start] = 1;

    while (stack.length) {
      const current = stack.pop();
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [current - 1, current + 1, current - width, current + width];
      neighbors.forEach((neighbor) => {
        if (neighbor < 0 || neighbor >= mask.length || visited[neighbor] || !mask[neighbor]) return;
        if ((neighbor === current - 1 && x === 0) || (neighbor === current + 1 && x === width - 1)) return;
        visited[neighbor] = 1;
        stack.push(neighbor);
      });
    }

    const componentWidth = maxX - minX + 1;
    const componentHeight = maxY - minY + 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const fillRatio = area / Math.max(1, componentWidth * componentHeight);

    if (
      componentWidth >= 70 &&
      componentWidth <= 280 &&
      componentHeight >= 25 &&
      componentHeight <= 95 &&
      fillRatio >= 0.35 &&
      centerX > width * 0.45 &&
      centerY > height * 0.5
    ) {
      return true;
    }
  }

  return false;
}

function compactNearbyCircles(circles) {
  return circles.reduce((acc, circle) => {
    const duplicate = acc.find((item) => Math.hypot(item.x - circle.x, item.y - circle.y) < 8);
    if (!duplicate) acc.push(circle);
    return acc;
  }, []);
}

function getContiguousCircleSegment(circles, selectedCircle, axis) {
  const selectedIndex = circles.findIndex((circle) => circle.id === selectedCircle.id);
  if (selectedIndex < 0) return [];

  const maxGap = axis === "x" ? 180 : 82;
  let start = selectedIndex;
  let end = selectedIndex;

  while (start > 0 && Math.abs(circles[start][axis] - circles[start - 1][axis]) <= maxGap) start -= 1;
  while (end < circles.length - 1 && Math.abs(circles[end + 1][axis] - circles[end][axis]) <= maxGap) end += 1;

  return circles.slice(start, end + 1);
}

function summarizeVisualChoiceGroup(groupCircles, selectedCircle) {
  const sorted = [...groupCircles].sort((a, b) => (Math.abs(a.y - b.y) <= 14 ? a.x - b.x : a.y - b.y));
  const selectedIndexes = sorted
    .map((circle, index) => (circle.kind === "selected" ? index : -1))
    .filter((index) => index >= 0);
  const selectedIndex = sorted.findIndex((circle) => circle.id === selectedCircle.id);
  if (selectedIndex < 0 || !selectedIndexes.length) return null;

  return {
    key: sorted.map((circle) => circle.id).join("|"),
    optionCount: sorted.length,
    selectedIndex,
    selectedIndexes,
    y: Math.min(...sorted.map((circle) => circle.y)),
  };
}

function dedupeVisualChoiceGroups(groups) {
  const seen = new Set();
  return groups
    .filter(Boolean)
    .filter((group) => {
      if (seen.has(group.key)) return false;
      seen.add(group.key);
      return true;
    })
    .map(({ key, ...group }) => group)
    .sort((a, b) => a.y - b.y);
}

async function detectVisualRadioGroupsFromScreenshotPreview() {
  if (!state.screenshotPreview) return [];

  const image = await loadImageElement(state.screenshotPreview);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const selectedCircles = findCircleComponents(imageData, isSelectedRadioPixel, "selected");
  const unselectedCircles = findCircleComponents(imageData, isUnselectedRadioPixel, "unselected");
  const allCircles = compactNearbyCircles([...selectedCircles, ...unselectedCircles]);

  return dedupeVisualChoiceGroups(
    selectedCircles.map((selectedCircle) => {
      const horizontalCandidates = allCircles
        .filter((circle) => Math.abs(circle.y - selectedCircle.y) <= 14 && Math.abs(circle.x - selectedCircle.x) <= 320)
        .sort((a, b) => a.x - b.x);
      const horizontalGroup = getContiguousCircleSegment(horizontalCandidates, selectedCircle, "x");

      if (horizontalGroup.length >= 2 && horizontalGroup.length <= 4) {
        return summarizeVisualChoiceGroup(horizontalGroup, selectedCircle);
      }

      const verticalCandidates = allCircles
        .filter((circle) => Math.abs(circle.x - selectedCircle.x) <= 14 && Math.abs(circle.y - selectedCircle.y) <= 420)
        .sort((a, b) => a.y - b.y);
      const verticalGroup = getContiguousCircleSegment(verticalCandidates, selectedCircle, "y");

      if (verticalGroup.length >= 2 && verticalGroup.length <= 8) {
        return summarizeVisualChoiceGroup(verticalGroup, selectedCircle);
      }

      return null;
    }),
  );
}

async function detectVisualContinueButtonFromScreenshotPreview() {
  if (!state.screenshotPreview) return false;

  const image = await loadImageElement(state.screenshotPreview);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return hasVisualContinueButtonInImageData(context.getImageData(0, 0, canvas.width, canvas.height));
}

function applyVisualActionFallbacks(parsed, hasVisualContinueButton, sourceText = "") {
  const steps = [...(parsed.steps || [])];
  const questions = [...(parsed.questions || [])];
  const hasAnyActionButton = steps.some((step) => /\b(button|click)\b.*\b(continue|submit)\b|\b(continue|submit)\b.*\bbutton\b/i.test(step));
  const actionLabel = /\bsubmit\b/i.test(sourceText) ? "Submit" : "Continue";

  if (steps.length && hasVisualContinueButton && !hasAnyActionButton) {
    steps.push(`button ${actionLabel}`);
    questions.push("");
  }

  return { steps, questions };
}

function buildScreenshotImportKey() {
  const keyText = [
    state.screenshotImportSerial,
    state.screenshotFileName,
    normalizeNewlines(state.screenshotText),
    JSON.stringify(state.screenshotVisualRadioGroups || []),
    state.screenshotHasVisualContinueButton ? "visual-action" : "no-visual-action",
  ].join(NEWLINE);

  return `screenshot-${crc32(stringToUtf8(keyText)).toString(16)}`;
}

function mergeScreenshotDraftStep(steps, step, importKey, lastStepId, lastImportKey) {
  const previousScreenshotIndex = importKey && importKey === lastImportKey ? steps.findIndex((item) => item.id === lastStepId) : -1;

  if (steps.length === 1 && isBlankEditableStep(steps[0])) {
    return [step];
  }

  if (previousScreenshotIndex >= 0) {
    return steps.map((item, index) => (index === previousScreenshotIndex ? step : item)).filter((item) => !isContinueOnlyScreenshotDraft(item));
  }

  return [...steps.filter((item) => !isContinueOnlyScreenshotDraft(item)), step];
}

function formatTimestamp(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

async function handleScreenshotFile(file) {
  if (!file) return;
  state.screenshotImportSerial += 1;
  state.screenshotFileName = file.name;
  state.screenshotStatus = "Reading screenshot...";

  try {
    state.screenshotPreview = await readFileAsDataUrl(file);
  } catch (error) {
    console.warn("Unable to preview screenshot", error);
    state.screenshotPreview = "";
  }

  renderApp();

  try {
    const extractedText = await extractTextFromImageIfAvailable(file);
    const [visualRadioGroups, hasVisualContinueButton] = await Promise.all([
      detectVisualRadioGroupsFromScreenshotPreview().catch((error) => {
        console.warn("Unable to detect selected radio buttons from screenshot", error);
        return [];
      }),
      detectVisualContinueButtonFromScreenshotPreview().catch((error) => {
        console.warn("Unable to detect continue button from screenshot", error);
        return false;
      }),
    ]);
    state.screenshotVisualRadioGroups = visualRadioGroups;
    state.screenshotHasVisualContinueButton = hasVisualContinueButton;
    state.screenshotText = extractedText;
    state.screenshotStatus = extractedText
      ? `Text extracted. ${
          state.screenshotVisualRadioGroups.length ? `Detected ${state.screenshotVisualRadioGroups.length} selected option group(s). ` : ""
        }${state.screenshotHasVisualContinueButton ? "Detected Continue button. " : ""}Review and generate steps.`
      : "No text detected. Paste screen text and generate steps.";
    state.screenshotDebug = extractedText ? `Parser ${APP_VERSION}. OCR lines: ${splitLines(extractedText).length}. Generate steps to see found/missing fields.` : "";
  } catch (error) {
    console.warn("Screenshot OCR unavailable", error);
    state.screenshotStatus = "Automatic OCR is unavailable here. Paste screen text and generate steps.";
    state.screenshotDebug = "";
  }

  renderApp();
}

async function generateFromScreenshotImport() {
  if (state.screenshotPreview && (!state.screenshotVisualRadioGroups.length || !state.screenshotHasVisualContinueButton)) {
    state.screenshotStatus = "Checking screenshot controls...";
    renderApp();
    const [visualRadioGroups, hasVisualContinueButton] = await Promise.all([
      state.screenshotVisualRadioGroups.length
        ? Promise.resolve(state.screenshotVisualRadioGroups)
        : detectVisualRadioGroupsFromScreenshotPreview().catch((error) => {
            console.warn("Unable to detect selected radio buttons from screenshot", error);
            return [];
          }),
      state.screenshotHasVisualContinueButton
        ? Promise.resolve(true)
        : detectVisualContinueButtonFromScreenshotPreview().catch((error) => {
            console.warn("Unable to detect continue button from screenshot", error);
            return false;
          }),
    ]);
    state.screenshotVisualRadioGroups = visualRadioGroups;
    state.screenshotHasVisualContinueButton = hasVisualContinueButton;
  }

  const textParsed = mergeParsedScreenshotSteps(
    generateStepsFromScreenshotText(state.screenshotText, state.screenshotVisualRadioGroups),
    extractKnownProcurementStepsFromScreenshotText(state.screenshotText),
  );
  if (!textParsed.steps.length) {
    state.screenshotStatus = "No usable screen text found.";
    renderApp();
    return;
  }

  const parsed = applyVisualActionFallbacks(textParsed, state.screenshotHasVisualContinueButton, state.screenshotText);
  state.screenshotDebug = buildScreenshotParserDebug(parsed, state.screenshotText);
  const step = createStep(getNextTestCaseIndex(state.steps), state.moduleName, state.scenarioName, state.selectedColumns);
  step.source = "screenshot-import";
  step.testCaseId = getScreenshotImportTestCaseId(state.steps);
  step.details = joinLines(parsed.steps);
  step.questionLabel = joinLines(parsed.questions);
  state.activeSavedFile = null;
  const importKey = buildScreenshotImportKey();
  state.steps = mergeScreenshotDraftStep(state.steps, step, importKey, state.lastScreenshotStepId, state.lastScreenshotImportKey);
  state.lastScreenshotStepId = step.id;
  state.lastScreenshotImportKey = importKey;
  state.screenshotStatus = `Generated ${parsed.steps.length} draft step${parsed.steps.length === 1 ? "" : "s"} with parser ${APP_VERSION}.`;
  renderApp();
}

function clearScreenshotImport() {
  state.screenshotFileName = "";
  state.screenshotPreview = "";
  state.screenshotText = "";
  state.screenshotStatus = "";
  state.screenshotDebug = "";
  state.screenshotVisualRadioGroups = [];
  state.screenshotHasVisualContinueButton = false;
  state.screenshotImportSerial += 1;
  state.lastScreenshotStepId = null;
  state.lastScreenshotImportKey = "";
}

function toggleColumn(column) {
  state.selectedColumns = state.selectedColumns.includes(column)
    ? state.selectedColumns.filter((item) => item !== column)
    : [...state.selectedColumns, column];
}

function selectDefaults() {
  state.selectedColumns = [...DEFAULT_SELECTED_COLUMNS];
  state.customColumnPosition = "end";
}

function clearColumns() {
  state.selectedColumns = [];
  state.customColumnPosition = "end";
}

function addCustomColumn() {
  const trimmed = state.customColumn.trim();
  if (!trimmed || DEFAULT_COLUMNS.includes(trimmed) || state.selectedColumns.includes(trimmed)) return;
  const insertIndex =
    state.customColumnPosition === "end"
      ? state.selectedColumns.length
      : Math.max(0, Math.min(Number(state.customColumnPosition), state.selectedColumns.length));
  state.selectedColumns = [...state.selectedColumns.slice(0, insertIndex), trimmed, ...state.selectedColumns.slice(insertIndex)];
  state.steps = state.steps.map((step) => ({ ...step, customFields: { ...(step.customFields || {}), [trimmed]: "" } }));
  state.customColumn = "";
  state.customColumnPosition = "end";
}

function addRow() {
  state.activeSavedFile = null;
  state.steps = insertStepAt(state.steps, state.steps.length, state.moduleName, state.scenarioName, state.selectedColumns);
}

function insertRowAt(index) {
  state.activeSavedFile = null;
  state.steps = insertStepAt(state.steps, index, state.moduleName, state.scenarioName, state.selectedColumns);
}

function moveRowTo(fromIndex, toIndex) {
  state.activeSavedFile = null;
  state.steps = moveArrayItem(state.steps, fromIndex, toIndex);
}

function updateRow(id, field, value) {
  state.activeSavedFile = null;
  state.steps = state.steps.map((step) => (step.id === id ? { ...step, [field]: value } : step));
}

function updateCustomField(id, column, value) {
  state.activeSavedFile = null;
  state.steps = state.steps.map((step) => (step.id === id ? { ...step, customFields: { ...(step.customFields || {}), [column]: value } } : step));
}

function deleteRow(id) {
  state.activeSavedFile = null;
  state.steps = state.steps.filter((step) => step.id !== id);
}

function enhanceRow(id) {
  state.activeSavedFile = null;
  state.steps = state.steps.map((step) => {
    if (step.id !== id) return step;
    const enhanced = enhanceMultilineSteps(step.details, step.questionLabel);
    const enhancedExpected = joinLines(splitLines(enhanced).map((line) => generateExpectedResult(line)));
    const enhancedActual = joinLines(splitLines(enhancedExpected).map((line) => generateActualResult(line)));
    return { ...step, details: enhanced, expected: enhancedExpected, actual: enhancedActual };
  });
}

function downloadFile(filename, content, mimeType, fallbackContent, fallbackFileName = filename) {
  state.exportFileName = fallbackFileName;
  state.exportContent = typeof fallbackContent === "string" ? fallbackContent : typeof content === "string" ? content : "";
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.warn("Download failed. Export content is available for copy.", error);
  }
}

async function copyExportContent() {
  if (!state.exportContent) return;
  try {
    await navigator.clipboard.writeText(state.exportContent);
    showToast("Export content copied to clipboard.");
  } catch {
    showToast("Copy failed. Please copy the table manually.");
  }
}

async function finishTestCase() {
  const name = state.fileName.trim() || `Test Case ${visibleSavedFiles().length + 1}`;
  const oldFile = state.editingFileId ? findFile(state.editingFileId) : null;
  const ownerMetadata = getFileOwner(oldFile).id ? oldFile : getCurrentOwnerMetadata();
  let finishedFile = {
    id: state.editingFileId || makeId(),
    name,
    createdAt: oldFile?.createdAt || new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString(),
    savedAt: Date.now(),
    ownerUserId: ownerMetadata.ownerUserId || ownerMetadata.createdBy?.id || "",
    ownerName: ownerMetadata.ownerName || ownerMetadata.createdBy?.name || "",
    ownerUsername: ownerMetadata.ownerUsername || ownerMetadata.createdBy?.username || "",
    createdBy: ownerMetadata.createdBy || {
      id: ownerMetadata.ownerUserId || "",
      name: ownerMetadata.ownerName || "",
      username: ownerMetadata.ownerUsername || "",
    },
    rowFormat: state.rowFormat,
    columns: previewColumns(),
    rows: generatedRows(),
  };

  try {
    if (state.authMode === "remote") {
      const data = await apiRequest("/api/files", {
        method: "POST",
        body: JSON.stringify({ file: finishedFile }),
      });
      finishedFile = data.file || finishedFile;
    } else {
      await saveFileToDb(finishedFile);
    }
  } catch (error) {
    console.warn("Unable to save file", error);
    showToast(state.authMode === "remote" ? error.message || "Unable to save test case." : "Saved in memory, but browser storage was unavailable.");
  }

  state.savedFiles = [finishedFile, ...state.savedFiles.filter((file) => file.id !== finishedFile.id)];
  state.activeSavedFile = finishedFile;
  state.steps = [createStep(1, state.moduleName, state.scenarioName, state.selectedColumns)];
  state.fileName = `Test Case ${visibleSavedFiles().length + 1}`;
  state.exportContent = "";
  state.exportFileName = "";
  state.editingFileId = null;
  state.currentPage = "history";
  renderApp();
}

function loadSavedFile(file) {
  if (!canAccessSavedFile(file)) return;
  state.activeSavedFile = file;
  state.fileName = file.name;
  state.currentPage = "history";
}

function editSavedFile(file) {
  if (!canAccessSavedFile(file)) return;
  Object.assign(state, createSavedFileEditDraft(file, state.moduleName, state.scenarioName, previewColumns()));
}

async function deleteSavedFile(fileId) {
  const file = findFile(fileId);
  if (!canAccessSavedFile(file)) return;
  try {
    if (state.authMode === "remote") await apiRequest(`/api/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
    else await deleteFileFromDb(fileId);
  } catch (error) {
    console.warn("Unable to delete file", error);
    showToast(error.message || "Unable to delete test case.");
  }
  state.savedFiles = state.savedFiles.filter((file) => file.id !== fileId);
  state.activeSavedFile = state.activeSavedFile?.id === fileId ? null : state.activeSavedFile;
  renderApp();
}

function startNewTestCase() {
  state.activeSavedFile = null;
  state.editingFileId = null;
  state.steps = [createStep(1, state.moduleName, state.scenarioName, state.selectedColumns)];
  state.fileName = `Test Case ${visibleSavedFiles().length + 1}`;
  state.exportContent = "";
  state.exportFileName = "";
  state.currentPage = "builder";
}

function rowsToCsv(headers, rows) {
  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return joinLines([headers.map(escapeCsv).join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header] ?? "")).join(","))]);
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function stringToUtf8(value) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(String(value));
  const text = unescape(encodeURIComponent(String(value)));
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
  return bytes;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    table[index] = crc >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) crc = CRC32_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts) {
  const totalLength = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = stringToUtf8(entry.name);
    const dataBytes = typeof entry.data === "string" ? stringToUtf8(entry.data) : entry.data;
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30);
    writeUint32LE(localHeader, 0, 0x04034b50);
    writeUint16LE(localHeader, 4, 20);
    writeUint16LE(localHeader, 6, 0);
    writeUint16LE(localHeader, 8, 0);
    writeUint32LE(localHeader, 10, 0);
    writeUint32LE(localHeader, 14, checksum);
    writeUint32LE(localHeader, 18, dataBytes.length);
    writeUint32LE(localHeader, 22, dataBytes.length);
    writeUint16LE(localHeader, 26, nameBytes.length);
    writeUint16LE(localHeader, 28, 0);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, 20);
    writeUint16LE(centralHeader, 6, 20);
    writeUint16LE(centralHeader, 8, 0);
    writeUint16LE(centralHeader, 10, 0);
    writeUint32LE(centralHeader, 12, 0);
    writeUint32LE(centralHeader, 16, checksum);
    writeUint32LE(centralHeader, 20, dataBytes.length);
    writeUint32LE(centralHeader, 24, dataBytes.length);
    writeUint16LE(centralHeader, 28, nameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 38, 0);
    writeUint32LE(centralHeader, 42, offset);
    centralParts.push(centralHeader, nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32LE(endRecord, 0, 0x06054b50);
  writeUint16LE(endRecord, 4, 0);
  writeUint16LE(endRecord, 6, 0);
  writeUint16LE(endRecord, 8, entries.length);
  writeUint16LE(endRecord, 10, entries.length);
  writeUint32LE(endRecord, 12, centralDirectory.length);
  writeUint32LE(endRecord, 16, offset);
  writeUint16LE(endRecord, 20, 0);

  return concatBytes([...localParts, centralDirectory, endRecord]);
}

function excelCellXml(value) {
  const text = escapeXml(String(value ?? "").replaceAll(String.fromCharCode(13) + String.fromCharCode(10), NEWLINE).replaceAll(String.fromCharCode(13), NEWLINE));
  return `<is><t xml:space="preserve">${text}</t></is>`;
}

function rowsToXlsxWorkbook(headers, rows) {
  const safeHeaders = headers.length ? headers : ["Steps"];
  const allRows = [safeHeaders, ...rows.map((row) => safeHeaders.map((header) => row[header] ?? ""))];
  const dimension = `A1:${columnName(safeHeaders.length - 1)}${Math.max(1, allRows.length)}`;
  const columns = safeHeaders
    .map((header, index) => {
      const values = [header, ...rows.map((row) => row[header] ?? "")];
      const maxLength = values.reduce((max, value) => {
        const lineLength = String(value ?? "")
          .split(/\r\n|\r|\n/)
          .reduce((lineMax, line) => Math.max(lineMax, line.length), 0);
        return Math.max(max, lineLength);
      }, 10);
      const width = Math.max(12, Math.min(45, maxLength + 2));
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    })
    .join("");
  const sheetRows = allRows
    .map((cells, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellXml = cells
        .map((value, cellIndex) => {
          const cellRef = `${columnName(cellIndex)}${rowNumber}`;
          const style = rowIndex === 0 ? 1 : 2;
          return `<c r="${cellRef}" t="inlineStr" s="${style}">${excelCellXml(value)}</c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cellXml}</row>`;
    })
    .join("");

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${columns}</cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  return buildZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Test Cases" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/styles.xml", data: stylesXml },
    { name: "xl/worksheets/sheet1.xml", data: worksheetXml },
  ]);
}

function exportCsv() {
  const headers = state.activeSavedFile ? state.activeSavedFile.columns : previewColumns();
  const rows = state.activeSavedFile ? state.activeSavedFile.rows : generatedRows();
  const csv = rowsToCsv(headers, rows);
  downloadFile(`${state.fileName || "testcases"}.csv`, csv, "text/csv;charset=utf-8;");
  renderApp();
}

function exportExcel() {
  const headers = state.activeSavedFile ? state.activeSavedFile.columns : previewColumns();
  const rows = state.activeSavedFile ? state.activeSavedFile.rows : generatedRows();
  const workbook = rowsToXlsxWorkbook(headers, rows);
  downloadFile(
    `${state.fileName || "testcases"}.xlsx`,
    workbook,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    rowsToCsv(headers, rows),
    `${state.fileName || "testcases"}.csv`,
  );
  renderApp();
}

function findFile(id) {
  const file = state.savedFiles.find((item) => item.id === id);
  return canAccessSavedFile(file) ? file : null;
}

function downloadSavedFile(file, format) {
  if (!canAccessSavedFile(file)) return;
  const safeName = file.name || "testcases";
  if (format === "excel") {
    downloadFile(
      `${safeName}.xlsx`,
      rowsToXlsxWorkbook(file.columns || [], file.rows || []),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      rowsToCsv(file.columns || [], file.rows || []),
      `${safeName}.csv`,
    );
  } else {
    downloadFile(`${safeName}.csv`, rowsToCsv(file.columns || [], file.rows || []), "text/csv;charset=utf-8;");
  }
  renderApp();
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const stepId = target.dataset.stepId;
  const fileId = target.dataset.fileId;
  const userId = target.dataset.userId;
  const rowIndex = Number(target.dataset.rowIndex);

  if (action === "login") {
    void loginUser();
    return;
  }
  if (action === "logout") {
    logoutUser();
    renderApp();
    return;
  }
  if (action === "show-builder") state.currentPage = "builder";
  if (action === "show-history") state.currentPage = "history";
  if (action === "show-users" && isAdminUser()) state.currentPage = "users";
  if (action === "toggle-column") toggleColumn(target.dataset.column);
  if (action === "select-defaults") selectDefaults();
  if (action === "clear-columns") clearColumns();
  if (action === "add-custom-column") addCustomColumn();
  if (action === "add-user") {
    void addUser();
    return;
  }
  if (action === "delete-user") {
    deleteUser(userId);
    return;
  }
  if (action === "add-row") addRow();
  if (action === "insert-row-above") insertRowAt(rowIndex);
  if (action === "insert-row-below") insertRowAt(rowIndex + 1);
  if (action === "delete-row") deleteRow(stepId);
  if (action === "enhance-row") enhanceRow(stepId);
  if (action === "finish-test-case") {
    void finishTestCase();
    return;
  }
  if (action === "new-test-case") startNewTestCase();
  if (action === "load-file") loadSavedFile(findFile(fileId));
  if (action === "edit-file") editSavedFile(findFile(fileId));
  if (action === "download-file-csv") {
    downloadSavedFile(findFile(fileId), "csv");
    return;
  }
  if (action === "download-file-excel") {
    downloadSavedFile(findFile(fileId), "excel");
    return;
  }
  if (action === "delete-file") {
    void deleteSavedFile(fileId);
    return;
  }
  if (action === "export-csv") {
    exportCsv();
    return;
  }
  if (action === "export-excel") {
    exportExcel();
    return;
  }
  if (action === "copy-export") {
    void copyExportContent();
    return;
  }
  if (action === "generate-from-screenshot") {
    void generateFromScreenshotImport();
    return;
  }
  if (action === "clear-screenshot-import") clearScreenshotImport();

  renderApp();
}

function handleInput(event) {
  const target = event.target;
  const bind = target.dataset.bind;

  if (bind === "fileName") state.fileName = target.value;
  if (bind === "moduleName") state.moduleName = target.value;
  if (bind === "scenarioName") state.scenarioName = target.value;
  if (bind === "customColumn") state.customColumn = target.value;
  if (bind === "screenshotText") state.screenshotText = target.value;
  if (bind === "loginUsername") state.loginUsername = target.value;
  if (bind === "loginPassword") state.loginPassword = target.value;
  if (bind === "userFormName") state.userFormName = target.value;
  if (bind === "userFormUsername") state.userFormUsername = target.value;
  if (bind === "userFormPassword") state.userFormPassword = target.value;

  if (target.dataset.stepId) {
    const id = target.dataset.stepId;
    const column = target.dataset.column;
    const value = target.value;

    if (column === "Steps") updateRow(id, "details", value);
    else if (target.dataset.custom === "true") updateCustomField(id, column, value);
    else updateRow(id, target.dataset.field, value);

    refreshPreview();
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.dataset.bind === "customColumnPosition") {
    state.customColumnPosition = target.value;
  }
  if (target.dataset.bind === "userFormRole") {
    state.userFormRole = target.value;
  }
  if (target.dataset.bind === "screenshotFile") {
    void handleScreenshotFile(target.files?.[0]);
  }
  if (target.dataset.bind === "rowFormat") {
    state.rowFormat = target.value;
    state.activeSavedFile = null;
    refreshPreview();
  }
}

function handleKeydown(event) {
  if (event.key !== "Enter") return;
  const bind = event.target?.dataset?.bind;
  if (!state.currentUser && (bind === "loginUsername" || bind === "loginPassword")) {
    event.preventDefault();
    void loginUser();
  }
  if (state.currentPage === "users" && ["userFormName", "userFormUsername", "userFormPassword"].includes(bind)) {
    event.preventDefault();
    void addUser();
  }
}

function clearDragHints() {
  document.querySelectorAll(".row-drop-before, .row-drop-after, .column-drop-before, .column-drop-after").forEach((element) => {
    element.classList.remove("row-drop-before", "row-drop-after", "column-drop-before", "column-drop-after");
  });
}

function getRowDropIndex(event, row) {
  const rowIndex = Number(row.dataset.rowIndex);
  const rect = row.getBoundingClientRect();
  return rowIndex + (event.clientY > rect.top + rect.height / 2 ? 1 : 0);
}

function getColumnDropTarget(event, element) {
  const targetColumn = element.dataset.columnDrop;
  const rect = element.getBoundingClientRect();
  return {
    targetColumn,
    placeAfter: event.clientX > rect.left + rect.width / 2,
  };
}

function handleDragStart(event) {
  const rowHandle = event.target.closest("[data-drag-row-index]");
  if (rowHandle) {
    state.drag = { type: "row", fromIndex: Number(rowHandle.dataset.dragRowIndex) };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "row");
    rowHandle.classList.add("dragging");
    return;
  }

  const columnHandle = event.target.closest("[data-draggable-column]");
  if (columnHandle) {
    state.drag = { type: "column", column: columnHandle.dataset.draggableColumn };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "column");
    columnHandle.classList.add("dragging");
  }
}

function handleDragOver(event) {
  if (!state.drag) return;

  if (state.drag.type === "row") {
    const row = event.target.closest("tr[data-row-index]");
    if (!row) return;
    event.preventDefault();
    clearDragHints();
    row.classList.add(getRowDropIndex(event, row) > Number(row.dataset.rowIndex) ? "row-drop-after" : "row-drop-before");
    return;
  }

  if (state.drag.type === "column") {
    const columnTarget = event.target.closest("[data-column-drop]");
    if (!columnTarget) return;
    event.preventDefault();
    const { placeAfter } = getColumnDropTarget(event, columnTarget);
    clearDragHints();
    columnTarget.classList.add(placeAfter ? "column-drop-after" : "column-drop-before");
  }
}

function handleDrop(event) {
  if (!state.drag) return;

  if (state.drag.type === "row") {
    const row = event.target.closest("tr[data-row-index]");
    if (!row) return;
    event.preventDefault();
    moveRowTo(state.drag.fromIndex, getRowDropIndex(event, row));
  }

  if (state.drag.type === "column") {
    const columnTarget = event.target.closest("[data-column-drop]");
    if (!columnTarget) return;
    event.preventDefault();
    const { targetColumn, placeAfter } = getColumnDropTarget(event, columnTarget);
    moveSelectedColumn(state.drag.column, targetColumn, placeAfter);
  }

  state.drag = null;
  clearDragHints();
  renderApp();
}

function handleDragEnd(event) {
  event.target.closest(".dragging")?.classList.remove("dragging");
  state.drag = null;
  clearDragHints();
}

function runSelfTests() {
  const results = [];
  const assertCheck = (name, condition, details = "") => {
    results.push({ name, passed: Boolean(condition), details });
    console.assert(condition, `${name}${details ? `: ${details}` : ""}`);
  };

  const splitResult = splitLines(` A ${String.fromCharCode(13)}${NEWLINE} ${String.fromCharCode(13)}B${NEWLINE}${NEWLINE} C `);
  assertCheck("newline splitting", splitResult.length === 3 && splitResult[0] === "A" && splitResult[1] === "B" && splitResult[2] === "C");

  assertCheck(
    "question label enhancement",
    enhanceMultilineSteps("form is visible", "Procurement Intake form") === 'Verify that "Procurement Intake form" is visible on screen.',
  );

  assertCheck("select yes question wording", localEnhanceStep("select yes", "Is the supplier registered?") === 'For the question "Is the supplier registered?", select "Yes".');
  assertCheck("dropdown field wording", localEnhanceStep("dropdown India", "Country") === 'Select "India" from the "Country" dropdown field.');
  assertCheck(
    "document selection wording",
    localEnhanceStep('document "Passport"', "Identity Proof") === 'For the "Identity Proof", select the "Passport" document.',
  );
  assertCheck("document upload wording", localEnhanceStep("document", "Address Proof") === 'For the "Address Proof", upload a valid document.');
  assertCheck("task visibility wording", localEnhanceStep("task verify visible on screen", "Manager Approval") === 'Verify that "Manager Approval" task is visible on screen.');
  assertCheck("button click wording", localEnhanceStep("button Continue", "") === 'Click the "Continue" button.');
  assertCheck("dashboard tile wording", localEnhanceStep("tile Procurement Intake", "") === 'Click on the "Procurement Intake" tile from the dashboard.');
  assertCheck("tab navigation wording", localEnhanceStep("tab Request", "") === 'Go to the "Request" tab.');
  assertCheck("start task wording", localEnhanceStep("start task Procurement Review", "") === 'Click on "Start" for the "Procurement Review" task.');
  assertCheck("infer selected yes from OCR radio markers", getSelectedOcrOption("Yes O No") === "Yes");
  assertCheck("infer selected no from OCR radio markers", getSelectedOcrOption("O Yes No") === "No");
  assertCheck(
    "enhanced OCR scoring prefers text with important field labels",
    scoreOcrText(
      joinLines([
        "Target Date",
        "Jun 11, 2026",
        "Estimated project amount",
        "$ 2,822,123.74",
        "Opportunity Number",
        "SOC-UYGMTPR",
        "Request type",
      ]),
    ) > scoreOcrText(joinLines(["Procurement Intake Process x", "© Single Customer", "© Sales Opportunity", "& Click to Upload or drag and drop"])),
  );
  assertCheck("toggle wording", localEnhanceStep("toggle No", "Subject to Withholding tax?") === 'Set the "Subject to Withholding tax?" toggle to "No".');
  assertCheck("auto populated wording", localEnhanceStep("auto TechTest", "Company name") === 'Verify that the "Company name" field is auto-populated with "TechTest".');
  assertCheck("auto-populated shorthand wording", localEnhanceStep("auto-populated TechTest", "Company name") === 'Verify that the "Company name" field is auto-populated with "TechTest".');
  assertCheck("search and select wording", localEnhanceStep("search and select CS4013", "HACAT") === 'Search for and select "CS4013" in the "HACAT" field.');
  assertCheck("request number wording", localEnhanceStep("request number", "") === "Capture the request number for reference during test execution.");
  assertCheck("auto populated expected result", generateExpectedResult('Verify that the "Company name" field is auto-populated with "TechTest".') === "The field should be auto-populated correctly.");
  assertCheck(
    "legal documentation choice uses option expected result",
    generateExpectedResult('For the question "What type of legal documentation is required for this engagement ?", select "Service Agreement".') ===
      "The selected option should be applied successfully.",
  );

  const screenshotDraft = generateStepsFromScreenshotText(
    joinLines(["Which Country you belong to", "India", "Subject to Withholding tax?", "No", "Company name", "TechTest", "Continue"]),
  );
  assertCheck(
    "screenshot text generates draft steps",
    screenshotDraft.steps.includes('dropdown "India"') &&
      screenshotDraft.steps.includes("select no") &&
      screenshotDraft.steps.includes('type "TechTest"') &&
      screenshotDraft.steps.includes("button Continue") &&
      screenshotDraft.questions.includes("Which Country you belong to"),
  );

  const kyndrylDashboardDraft = generateStepsFromScreenshotText(
    joinLines([
      "@® @ Testcase Builder Xx ® ChatGPT Xx © Logout Xx © GitHub Dashboard Xx @® Oro SysAdmin Xx @® Procure@Kyndryl Xx ar ¢ Ask Gemini",
      "Cc 25 https://app.eu.orolabs.ai/supplier-dashboard#tid_kyndryl_test_eu ww 1 J (3 Sg, = Work H",
      "BotGauge Google Sheets Request Form Vacation Tracker",
      "kyndryl Procure",
      "Home Tasks Requests Suppliers More Vv Ww 9 ® 4a us",
      "Ask Procure AI",
      "Front door for all your procurement needs",
      "Please describe your business needs...",
      "Upload quote or proposal if available.",
      "Start New See All >",
      "Procurement Intake Process",
      "Procurement intake for all types of requests",
      "Start New",
      "Contingent Worker Request",
      "SAP Ariba Catalog Redirects",
      "Sourcing Execution",
      "My Requests",
    ]),
  );
  assertCheck(
    "dashboard screenshot ignores browser chrome and creates tile step",
    kyndrylDashboardDraft.steps.length === 1 &&
      kyndrylDashboardDraft.steps[0] === "tile Procurement Intake Process" &&
      localEnhanceStep(kyndrylDashboardDraft.steps[0]) === 'Click on the "Procurement Intake Process" tile from the dashboard.',
  );

  const aniTechDashboardDraft = generateStepsFromScreenshotText(
    joinLines([
      "AniTech Private Limited",
      "Home Tasks Requests Suppliers More",
      "Please describe your business needs...",
      "Upload Offer",
      "Start New",
      "Procurement Intake ANI",
      "This is the Start of Procurement Intake",
      "Start New",
      "ANI Supplier Onboarding",
      "This is a supplier onboarding process",
      "Risk Review AI Agent",
      "testing ai agent",
      "TestAgent PR",
      "test",
      "My Requests",
    ]),
  );
  assertCheck(
    "dashboard tile name is read from selected card",
    aniTechDashboardDraft.steps.length === 1 &&
      aniTechDashboardDraft.steps[0] === "tile Procurement Intake ANI" &&
      localEnhanceStep(aniTechDashboardDraft.steps[0]) === 'Click on the "Procurement Intake ANI" tile from the dashboard.',
  );

  const noisyAniTechDashboardDraft = generateStepsFromScreenshotText(
    joinLines([
      "ERAniTech Home Tasks Requests Suppliers More Vv @W 9 AO oa",
      "_",
      "q @ Upload Offer >)",
      "Start New See All >",
      "Procurement Intake ANI v Tn v Tn v Tn",
      "This is the Start of Procurement Intake )",
      "ANI Supplier Onboarding Risk Review AI Agent TestAgent PR",
      "My Requests See all requests >",
      "ORO-618",
      "Risk Review AI Agent",
      "ANI AI Agent",
      "Priority",
      "Requester",
      "Oro Admin (harshit.raj@...",
    ]),
  );
  assertCheck(
    "dashboard tile OCR junk is cleaned before parsing",
    noisyAniTechDashboardDraft.steps.length === 1 &&
      noisyAniTechDashboardDraft.steps[0] === "tile Procurement Intake ANI" &&
      localEnhanceStep(noisyAniTechDashboardDraft.steps[0]) === 'Click on the "Procurement Intake ANI" tile from the dashboard.',
  );

  const selectedSecondDashboardDraft = generateStepsFromScreenshotText(
    joinLines([
      "Home Tasks Requests Suppliers More",
      "Start New",
      "Procurement Intake ANI",
      "This is the Start of Procurement Intake",
      "ANI Supplier Onboarding v Tn v Tn",
      "This is a supplier onboarding process",
      "Risk Review AI Agent",
      "testing ai agent",
      "My Requests",
    ]),
  );
  assertCheck(
    "dashboard selected tile is preferred over first tile",
    selectedSecondDashboardDraft.steps.length === 1 &&
      selectedSecondDashboardDraft.steps[0] === "tile ANI Supplier Onboarding" &&
      localEnhanceStep(selectedSecondDashboardDraft.steps[0]) === 'Click on the "ANI Supplier Onboarding" tile from the dashboard.',
  );

  const pepDashboardDraft = generateStepsFromScreenshotText(
    joinLines([
      "Home Tasks Requests Suppliers More",
      "Ask ORO AI",
      "Start New",
      "PEP_Co Intake Process",
      "Intake Process (1) v Tn",
      "Start New",
      "Supplier Onbording",
      "Procurement Intake Process",
      "compute form",
      "My Requests",
    ]),
  );
  assertCheck(
    "generic dashboard parser prefers selected tile title over description",
    pepDashboardDraft.steps.length === 1 &&
      pepDashboardDraft.steps[0] === "tile PEP_Co Intake Process" &&
      localEnhanceStep(pepDashboardDraft.steps[0]) === 'Click on the "PEP_Co Intake Process" tile from the dashboard.',
  );

  const visualRadioDraft = generateStepsFromScreenshotText(
    joinLines(["First radio question?", "O Yes © No", "Second radio question?", "Yes © No"]),
    [
      { optionCount: 2, selectedIndex: 1 },
      { optionCount: 2, selectedIndex: 0 },
    ],
  );
  assertCheck(
    "visual radio detection overrides ambiguous OCR markers",
    visualRadioDraft.steps[0] === "select no" && visualRadioDraft.steps[1] === "select yes",
  );

  const procurementIntakeDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      "LJ",
      "Request Details",
      "Requestor",
      "OA Oro Admin (aniket.dabhade@orolabs.ai)",
      "customeradmin+anitech_solutions_dev@orolabs.ai",
      "Are you requesting on behalf of someone else?",
      "No",
      "Please describe the business need for this request",
      "| want to procure laptop services",
      "Vz",
      "Continue",
    ]),
  );
  const enhancedProcurementIntakeSteps = procurementIntakeDraft.steps.map((step, index) =>
    localEnhanceStep(step, procurementIntakeDraft.questions[index]),
  );
  assertCheck(
    "procurement intake screenshot fields are cleaned",
    enhancedProcurementIntakeSteps.includes('Verify that "Procurement Intake ANI" form is visible on screen.') &&
      enhancedProcurementIntakeSteps.includes('Verify that "Request Details" form is visible on screen.') &&
      enhancedProcurementIntakeSteps.includes(
        'Verify that the "Requestor" field is auto-populated with "Oro Admin (aniket.dabhade@orolabs.ai)".',
      ) &&
      enhancedProcurementIntakeSteps.includes('For the question "Are you requesting on behalf of someone else?", select "No".') &&
      enhancedProcurementIntakeSteps.includes(
        'Enter "I want to procure laptop services" in the "Please describe the business need for this request" field.',
      ) &&
      enhancedProcurementIntakeSteps.includes('Click the "Continue" button.') &&
      !enhancedProcurementIntakeSteps.some((step) => /\b(LJ|Vz|customeradmin\+anitech_solutions_dev)/i.test(step)),
  );

  const pepRequestDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Requester",
      "Oro Admin (aniket.dabhade@orolabs.ai) Ww",
      "Are you requesting on behalf of someone else?",
      "No",
      "Please provide a brief description of your request",
      "I want to perform social media campaign",
      "CompanyEntity",
      "FreshBite India Pvt Ltd.",
      "Department",
      "Digital Marketing",
      "Cost Center",
      "PEP_1",
      "Continue",
    ]),
  );
  const enhancedPepRequestDetailsSteps = pepRequestDetailsDraft.steps.map((step, index) =>
    localEnhanceStep(step, pepRequestDetailsDraft.questions[index]),
  );
  assertCheck(
    "generic request detail fields are paired and OCR suffixes are cleaned",
    enhancedPepRequestDetailsSteps.includes(
      'Verify that the "Requester" field is auto-populated with "Oro Admin (aniket.dabhade@orolabs.ai)".',
    ) &&
      enhancedPepRequestDetailsSteps.includes('For the question "Are you requesting on behalf of someone else?", select "No".') &&
      enhancedPepRequestDetailsSteps.includes(
        'Enter "I want to perform social media campaign" in the "Please provide a brief description of your request" field.',
      ) &&
      enhancedPepRequestDetailsSteps.includes('Select "FreshBite India Pvt Ltd." from the "CompanyEntity" dropdown field.') &&
      enhancedPepRequestDetailsSteps.includes('Select "Digital Marketing" from the "Department" dropdown field.') &&
      enhancedPepRequestDetailsSteps.includes('Select "PEP_1" from the "Cost Center" dropdown field.') &&
      enhancedPepRequestDetailsSteps.includes('Click the "Continue" button.') &&
      !enhancedPepRequestDetailsSteps.some((step) => /\bWw\b|Department form|Cost Center form/i.test(step)),
  );

  const requestPurposeDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake Process",
      "Request Details",
      "Requester",
      "John Shula (aniket.dabhade@orolabs.ai)",
      "John.Shula@kyndryl.com",
      "Are you requesting on behalf of someone else? ®",
      "No",
      "What's the purpose of this request? ®",
      "Indicative Budgetary Quote",
      "© Full Buying process (Purchase Transaction)",
      "Customer Bid Assistance",
      "Describe your need in detail ®",
      "The procurement of Cisco hardware under the SECNET program for the Canada region is",
      "required to support Air Canada's ongoing network modernization, security enhancement,",
      "and multiregion operational readiness initiatives.",
    ]),
  );
  const enhancedRequestPurposeSteps = requestPurposeDraft.steps.map((step, index) =>
    localEnhanceStep(step, requestPurposeDraft.questions[index]),
  );
  assertCheck(
    "request purpose screenshot keeps radio choice separate from text area",
    enhancedRequestPurposeSteps.includes('Verify that "Procurement Intake Process" form is visible on screen.') &&
      enhancedRequestPurposeSteps.includes('Verify that "Request Details" form is visible on screen.') &&
      enhancedRequestPurposeSteps.includes(
        'Verify that the "Requester" field is auto-populated with "John Shula (aniket.dabhade@orolabs.ai)".',
      ) &&
      enhancedRequestPurposeSteps.includes('For the question "Are you requesting on behalf of someone else?", select "No".') &&
      enhancedRequestPurposeSteps.includes(
        'For the question "What\'s the purpose of this request?", select "Full Buying Process (Purchase Transaction)".',
      ) &&
      enhancedRequestPurposeSteps.includes(
        'Enter "The procurement of Cisco hardware under the SECNET program for the Canada region is required to support Air Canada\'s ongoing network modernization, security enhancement, and multiregion operational readiness initiatives." in the "Describe your need in detail" field.',
      ) &&
      !enhancedRequestPurposeSteps.some((step) => /Indicative Budgetary Quote.*Describe your need|select .*Indicative Budgetary Quote|®/i.test(step)),
  );

  const noisyRequestPurposeDraft = generateStepsFromScreenshotText(
    joinLines([
      "Request Details",
      "What's the purpose of this request? 3 Indicative Budgetary Quote",
      "Full Buying Process (Purchase Transaction)",
      "Describe your need in detail",
      "The procurement of Cisco hardware under the SECNET program for the Canada region is required.",
    ]),
  );
  const enhancedNoisyRequestPurposeSteps = noisyRequestPurposeDraft.steps.map((step, index) =>
    localEnhanceStep(step, noisyRequestPurposeDraft.questions[index]),
  );
  assertCheck(
    "request purpose OCR with merged unselected option is repaired",
    enhancedNoisyRequestPurposeSteps.includes(
      'For the question "What\'s the purpose of this request?", select "Full Buying Process (Purchase Transaction)".',
    ) &&
      enhancedNoisyRequestPurposeSteps.includes(
        'Enter "The procurement of Cisco hardware under the SECNET program for the Canada region is required." in the "Describe your need in detail" field.',
      ) &&
      !enhancedNoisyRequestPurposeSteps.some((step) => /Enter \"Full Buying Process|Indicative Budgetary Quote\" field/i.test(step)),
  );

  const regionDropdownDraft = generateStepsFromScreenshotText(
    joinLines([
      "Region ®",
      "Select the primary country where goods will be delivered / services will be performed for Canada",
      "Kyndryl Entity ®",
      "1110 - Kyndryl Canada Limited",
      "Purchase Org",
      "1100 - Kyndryl Canada",
    ]),
  );
  const enhancedRegionDropdownSteps = regionDropdownDraft.steps.map((step, index) =>
    localEnhanceStep(step, regionDropdownDraft.questions[index]),
  );
  assertCheck(
    "region dropdown screenshot keeps values with their fields",
    enhancedRegionDropdownSteps.includes('Verify that "Region" form is visible on screen.') &&
      enhancedRegionDropdownSteps.includes(
        'Select "Canada" from the "Select the primary country where goods will be delivered / services will be performed for" dropdown field.',
      ) &&
      enhancedRegionDropdownSteps.includes('Select "1110 - Kyndryl Canada Limited" from the "Kyndryl Entity" dropdown field.') &&
      enhancedRegionDropdownSteps.includes('Select "1100 - Kyndryl Canada" from the "Purchase Org" dropdown field.') &&
      !enhancedRegionDropdownSteps.some((step) => /Region ®|Kyndryl Entity.*primary country|\"1110\" field|\"1100\" field/i.test(step)),
  );

  const recommendedCategoryDraft = generateStepsFromScreenshotText(
    joinLines([
      "Please select the best category for your request",
      "<> Recommended options",
      "Network security equipment 432225 °",
      "HW & MAINTENANCE - (HW)",
      "Purchase of OEM HW that is designed to protect computer networks from",
      "unwanted traffic. Includes Active, passive, preventive and UTM devices and t... Read more",
      ") Not the result you are looking for? View all options",
      "Continue",
    ]),
  );
  const enhancedRecommendedCategorySteps = recommendedCategoryDraft.steps.map((step, index) =>
    localEnhanceStep(step, recommendedCategoryDraft.questions[index]),
  );
  assertCheck(
    "recommended category screenshot collapses card into one selection",
    enhancedRecommendedCategorySteps.includes(
      'Select the recommended category "Network security equipment" for the "Please select the best category for your request" field.',
    ) &&
      enhancedRecommendedCategorySteps.includes('Click the "Continue" button.') &&
      !enhancedRecommendedCategorySteps.some((step) => /Recommended options|432225|HW & MAINTENANCE|Read more|View all options|form or information/i.test(step)),
  );

  const marketingDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Type of marketing activity ?",
      "© Digital Campaign",
      "Event Marketing",
      "Branding",
      "Digital Campaign",
      "Which digital channels will be used?",
      "© Social Media",
      "Search Ads",
      "Influencer",
      "Campaign objective (Lead generation / Brand awareness / App installs)",
      "Lead generation",
      "Target geography",
      "India",
      "Campaign start and end date",
      "Jun 03, 2026",
      "-",
      "Jul 22, 2026",
      "Does this campaign involve customer personal data ?",
      "O Yes © No",
      "Continue",
    ]),
  );
  const enhancedMarketingDetailsSteps = marketingDetailsDraft.steps.map((step, index) =>
    localEnhanceStep(step, marketingDetailsDraft.questions[index]),
  );
  assertCheck(
    "generic marketing fields keep choice, text, geography, and date range separate",
    enhancedMarketingDetailsSteps.includes('For the question "Type of marketing activity ?", select "Digital Campaign".') &&
      enhancedMarketingDetailsSteps.includes('For the question "Which digital channels will be used?", select "Social Media".') &&
      enhancedMarketingDetailsSteps.includes(
        'Enter "Lead generation" in the "Campaign objective (Lead generation / Brand awareness / App installs)" field.',
      ) &&
      enhancedMarketingDetailsSteps.includes('Select "India" from the "Target geography" dropdown field.') &&
      enhancedMarketingDetailsSteps.includes(
        'Select "Jun 3, 2026 to Jul 22, 2026" in the "Campaign start and end date" date field.',
      ) &&
      enhancedMarketingDetailsSteps.includes('For the question "Does this campaign involve customer personal data ?", select "No".') &&
      enhancedMarketingDetailsSteps.includes('Click the "Continue" button.') &&
      !enhancedMarketingDetailsSteps.some((step) => /Jun 03.*field|Jul 22.*Jun 03|Campaign objective.*visible/i.test(step)),
  );

  const budgetFulfillmentDraft = generateStepsFromScreenshotText(
    joinLines([
      "What is the estimated total budget for this request?",
      "₹ 12,312.00 INR",
      "When do you need this request to be fulfilled?",
      "Jun 03, 2026",
      "Continue",
    ]),
  );
  const enhancedBudgetFulfillmentSteps = budgetFulfillmentDraft.steps.map((step, index) =>
    localEnhanceStep(step, budgetFulfillmentDraft.questions[index]),
  );
  assertCheck(
    "generic budget and fulfillment date fields preserve currency and date type",
    enhancedBudgetFulfillmentSteps.includes('Enter "₹ 12,312.00 INR" in the "What is the estimated total budget for this request?" field.') &&
      enhancedBudgetFulfillmentSteps.includes('Select "Jun 3, 2026" in the "When do you need this request to be fulfilled?" date field.') &&
      enhancedBudgetFulfillmentSteps.includes('Click the "Continue" button.') &&
      !enhancedBudgetFulfillmentSteps.some((step) => /When do you need.*select|12,312.*visible/i.test(step)),
  );

  const engagementDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Engagement Details ~",
      "Type of engagement supported/ will be supported by the Supplier ®",
      "© Single Customer",
      "Multi-Customer pool",
      "Kyndryl Internal Use",
      "Is this request for a sales opportunity or delivery fulfillment ®",
      "© Sales Opportunity",
      "Delivery Fulfillment",
      "Target Date ®",
      "Jun 25, 2026",
      "Add Requirements ~",
      "Estimated project amount ®",
      "Insert the total expected value of the product or service for the full duration of the engagement",
      "$ 2,822,123.74 CAD v",
    ]),
  );
  const enhancedEngagementDetailsSteps = engagementDetailsDraft.steps.map((step, index) =>
    localEnhanceStep(step, engagementDetailsDraft.questions[index]),
  );
  assertCheck(
    "engagement details screenshot handles radio groups and amount fields",
    enhancedEngagementDetailsSteps.includes('Verify that "Engagement Details" form is visible on screen.') &&
      enhancedEngagementDetailsSteps.includes(
        'For the question "Type of engagement supported/ will be supported by the Supplier", select "Single Customer".',
      ) &&
      enhancedEngagementDetailsSteps.includes(
        'For the question "Is this request for a sales opportunity or delivery fulfillment", select "Sales Opportunity".',
      ) &&
      enhancedEngagementDetailsSteps.includes('Select "Jun 25, 2026" in the "Target Date" date field.') &&
      enhancedEngagementDetailsSteps.includes('Verify that "Add Requirements" form is visible on screen.') &&
      enhancedEngagementDetailsSteps.includes('Enter "$ 2,822,123.74 CAD" in the "Estimated project amount" field.') &&
      !enhancedEngagementDetailsSteps.some((step) =>
        /© Single Customer|Multi-Customer pool|Kyndryl Internal Use|Insert the total expected value|form or information|\$ 2,822,123\.74 CAD.*visible/i.test(
          step,
        ),
      ),
  );

  const requestDetailsFieldsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Is this spend covered in the Cost Case?",
      "© Yes O No",
      "Opportunity Number",
      "SOC-UYGMTPR Request type",
      "© New Purchase",
      "Resale",
      "Renewal",
      "Will this transaction be a capital expenditure for Kyndryl? &",
      "O Yes © No",
      "Have you verified that there are no reusable assets available to meet your requirements?",
      "© Yes O No",
      "Do you have a quotation from a supplier?",
      "O Yes © No",
      "Upload additional documents (if any) &",
      "Click to Upload or drag and drop",
      "Additional instructions for the supplier",
      "Add watchers (if any) &",
      "I XS Select user v |",
      "Continue",
    ]),
  );
  const enhancedRequestDetailsFieldsSteps = requestDetailsFieldsDraft.steps.map((step, index) =>
    localEnhanceStep(step, requestDetailsFieldsDraft.questions[index]),
  );
  assertCheck(
    "request details screenshot separates merged value labels and optional controls",
    enhancedRequestDetailsFieldsSteps.includes('For the question "Is this spend covered in the Cost Case?", select "Yes".') &&
      enhancedRequestDetailsFieldsSteps.includes('Enter "SOC-UYGMTPR" in the "Opportunity Number" field.') &&
      enhancedRequestDetailsFieldsSteps.includes('For the question "Request type", select "New Purchase".') &&
      enhancedRequestDetailsFieldsSteps.includes(
        'For the question "Will this transaction be a capital expenditure for Kyndryl?", select "No".',
      ) &&
      enhancedRequestDetailsFieldsSteps.includes(
        'For the question "Have you verified that there are no reusable assets available to meet your requirements?", select "Yes".',
      ) &&
      enhancedRequestDetailsFieldsSteps.includes('For the question "Do you have a quotation from a supplier?", select "No".') &&
      enhancedRequestDetailsFieldsSteps.includes('For the "Upload additional documents (if any)", upload a valid document.') &&
      enhancedRequestDetailsFieldsSteps.includes('Verify that the "Additional instructions for the supplier" field is visible on screen.') &&
      enhancedRequestDetailsFieldsSteps.includes('Open the "Add watchers (if any)" assignee field and select the applicable user.') &&
      enhancedRequestDetailsFieldsSteps.includes('Click the "Continue" button.') &&
      !enhancedRequestDetailsFieldsSteps.some((step) => /SOC-UYGMTPR Request type|select the \"New Purchase\" document|I XS Select user|&/i.test(step)),
  );

  const requestDetailsResaleDraft = generateStepsFromScreenshotText(
    joinLines([
      "Is this spend covered in the Cost Case?",
      "© Yes O No",
      "Opportunity Number",
      "SOC-UYGMTPR Request type",
      "New Purchase",
      "© Resale",
      "Renewal",
      "Will this transaction be a capital expenditure for Kyndryl?",
      "© Yes O No",
      "Have you verified that there are no reusable assets available to meet your requirements?",
      "O Yes © No",
      "Do you have a quotation from a supplier?",
      "O Yes © No",
    ]),
  );
  const enhancedRequestDetailsResaleSteps = requestDetailsResaleDraft.steps.map((step, index) =>
    localEnhanceStep(step, requestDetailsResaleDraft.questions[index]),
  );
  assertCheck(
    "request details screenshot keeps opportunity value separate from resale request type",
    enhancedRequestDetailsResaleSteps.includes('Enter "SOC-UYGMTPR" in the "Opportunity Number" field.') &&
      enhancedRequestDetailsResaleSteps.includes('For the question "Request type", select "Resale".') &&
      !enhancedRequestDetailsResaleSteps.some((step) => /SOC-UYGMTPR Request type|Opportunity Number.*visible/i.test(step)),
  );

  const repairedPreviewRows = buildRowsForFormat(
    [
      {
        ...createStep(2),
        details: joinLines(["select yes", "field verify visible on screen", 'select "Resale"']),
        questionLabel: joinLines(["Is this spend covered in the Cost Case?", "Opportunity Number", "SOC-UYGMTPR Request type"]),
      },
    ],
    "each-step",
  );
  assertCheck(
    "preview repairs already-generated merged request type rows",
    repairedPreviewRows[1]?.Steps === 'Enter "SOC-UYGMTPR" in the "Opportunity Number" field.' &&
      repairedPreviewRows[2]?.Steps === 'For the question "Request type", select "Resale".' &&
      !repairedPreviewRows.some((row) => /Opportunity Number.*visible|SOC-UYGMTPR Request type/i.test(row.Steps)),
  );

  const fullPageRequestDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake Process",
      "Engagement Details",
      "Type of engagement supported/ will be supported by the Supplier ®",
      "© Single Customer",
      "Multi-Customer pool",
      "Kyndryl Internal Use",
      "Is this request for a sales opportunity or delivery fulfillment ®",
      "© Sales Opportunity",
      "Delivery Fulfillment",
      "Target Date ®",
      "Jun 11, 2026",
      "Add Requirements",
      "Estimated project amount ®",
      "Insert the total expected value of the product or service for the full duration of the engagement",
      "$ 2,822,123.74 CAD",
      "Is this spend covered in the Cost Case?",
      "© Yes O No",
      "Opportunity Number ®",
      "SOC-UYGMTPR",
      "Request type",
      "© New Purchase",
      "Resale",
      "Renewal",
      "Will this transaction be a capital expenditure for Kyndryl? ®",
      "© Yes O No",
      "Have you verified that there are no reusable assets available to meet your requirements? ®",
      "© Yes O No",
      "Do you have a quotation from a supplier?",
      "O Yes © No",
      "Upload additional documents (if any) ®",
      "Click to Upload or drag and drop",
      "Additional instructions for the supplier ®",
      "Add watchers (if any) ®",
      "(3 saectuser 8",
      "Continue",
    ]),
  );
  const enhancedFullPageRequestDetailsSteps = fullPageRequestDetailsDraft.steps.map((step, index) =>
    localEnhanceStep(step, fullPageRequestDetailsDraft.questions[index]),
  );
  assertCheck(
    "full page procurement screenshot keeps radio groups and fields separate",
    enhancedFullPageRequestDetailsSteps.includes('Verify that "Procurement Intake Process" form is visible on screen.') &&
      enhancedFullPageRequestDetailsSteps.includes(
        'For the question "Type of engagement supported/ will be supported by the Supplier", select "Single Customer".',
      ) &&
      enhancedFullPageRequestDetailsSteps.includes(
        'For the question "Is this request for a sales opportunity or delivery fulfillment", select "Sales Opportunity".',
      ) &&
      enhancedFullPageRequestDetailsSteps.includes('Select "Jun 11, 2026" in the "Target Date" date field.') &&
      enhancedFullPageRequestDetailsSteps.includes('Enter "$ 2,822,123.74 CAD" in the "Estimated project amount" field.') &&
      enhancedFullPageRequestDetailsSteps.includes('For the question "Is this spend covered in the Cost Case?", select "Yes".') &&
      enhancedFullPageRequestDetailsSteps.includes('Enter "SOC-UYGMTPR" in the "Opportunity Number" field.') &&
      enhancedFullPageRequestDetailsSteps.includes('For the question "Request type", select "New Purchase".') &&
      enhancedFullPageRequestDetailsSteps.includes(
        'For the question "Will this transaction be a capital expenditure for Kyndryl?", select "Yes".',
      ) &&
      enhancedFullPageRequestDetailsSteps.includes(
        'For the question "Have you verified that there are no reusable assets available to meet your requirements?", select "Yes".',
      ) &&
      enhancedFullPageRequestDetailsSteps.includes('For the question "Do you have a quotation from a supplier?", select "No".') &&
      enhancedFullPageRequestDetailsSteps.includes('For the "Upload additional documents (if any)", upload a valid document.') &&
      enhancedFullPageRequestDetailsSteps.includes('Open the "Add watchers (if any)" assignee field and select the applicable user.') &&
      enhancedFullPageRequestDetailsSteps.includes('Click the "Continue" button.') &&
      !enhancedFullPageRequestDetailsSteps.some((step) => /Procurement Intake Process.*Single Customer|OQ ves|saectuser|Click to Upload.*upload/i.test(step)),
  );

  const repairedFullPageBadRows = buildRowsForFormat(
    [
      {
        ...createStep(5),
        details: joinLines(['select multiple "Single Customer" "Sales Opportunity"', 'select "New Purchase"', "document", "assignee"]),
        questionLabel: joinLines(["Procurement Intake Process", "OQ ves (No", "& Click to Upload or drag and drop", "(3 saectuser 8"]),
      },
    ],
    "each-step",
  );
  assertCheck(
    "preview repairs full page merged radio and noisy control labels",
    repairedFullPageBadRows[0]?.Steps ===
      'For the question "Type of engagement supported/ will be supported by the Supplier", select "Single Customer".' &&
      repairedFullPageBadRows[1]?.Steps ===
        'For the question "Is this request for a sales opportunity or delivery fulfillment", select "Sales Opportunity".' &&
      repairedFullPageBadRows[2]?.Steps === 'For the question "Request type", select "New Purchase".' &&
      repairedFullPageBadRows[3]?.Steps === 'For the "Upload additional documents (if any)", upload a valid document.' &&
      repairedFullPageBadRows[4]?.Steps === 'Open the "Add watchers (if any)" assignee field and select the applicable user.' &&
      !repairedFullPageBadRows.some((row) => /Procurement Intake Process.*select|OQ ves|saectuser|Click to Upload/i.test(row.Steps)),
  );

  const repairedMisplacedChoiceRows = buildRowsForFormat(
    [
      {
        ...createStep(5),
        details: joinLines(['select multiple "Sales Opportunity" "OQ ves (No"', "form verify visible on screen", "document", "assignee"]),
        questionLabel: joinLines(["© Single Customer", "© New Purchase", "& Click to Upload or drag and drop", "(3 saectuser 8"]),
      },
    ],
    "each-step",
  );
  assertCheck(
    "preview repairs selected options that landed in question column",
    repairedMisplacedChoiceRows[0]?.Steps ===
      'For the question "Type of engagement supported/ will be supported by the Supplier", select "Single Customer".' &&
      repairedMisplacedChoiceRows[1]?.Steps ===
        'For the question "Is this request for a sales opportunity or delivery fulfillment", select "Sales Opportunity".' &&
      repairedMisplacedChoiceRows[2]?.Steps === 'For the question "Request type", select "New Purchase".' &&
      repairedMisplacedChoiceRows[3]?.Steps === 'For the "Upload additional documents (if any)", upload a valid document.' &&
      repairedMisplacedChoiceRows[4]?.Steps === 'Open the "Add watchers (if any)" assignee field and select the applicable user.' &&
      !repairedMisplacedChoiceRows.some((row) => /©|OQ ves|saectuser|New Purchase form|Click to Upload/i.test(row.Steps)),
  );

  const splitAmountCurrencyDraft = generateStepsFromScreenshotText(
    joinLines([
      "Target Date",
      "Jun 11, 2026",
      "Add Requirements",
      "Estimated project amount ®",
      "Insert the total expected value of the product or service for the full duration of the engagement",
      "$ 2,822,123.74",
      "CAN V",
      "Is this spend covered in the Cost Case?",
      "• Yes • No",
      "Opportunity Number O",
      "SOC-UYGMTPR",
      "Will this transaction be a capital expenditure for Kyndryl? *",
      "• Yes • No",
      "Have you verified that there are no reusable assets available to meet your requirements? ®",
      "• Yes O No",
      "Do you have a quotation from a supplier?",
      "• Yes • No",
    ]),
  );
  const enhancedSplitAmountCurrencySteps = splitAmountCurrencyDraft.steps.map((step, index) =>
    localEnhanceStep(step, splitAmountCurrencyDraft.questions[index]),
  );
  assertCheck(
    "split amount currency and trailing radio labels are cleaned",
    enhancedSplitAmountCurrencySteps.includes('Select "Jun 11, 2026" in the "Target Date" date field.') &&
      enhancedSplitAmountCurrencySteps.includes('Verify that "Add Requirements" form is visible on screen.') &&
      enhancedSplitAmountCurrencySteps.includes('Enter "$ 2,822,123.74 CAD" in the "Estimated project amount" field.') &&
      enhancedSplitAmountCurrencySteps.includes('For the question "Is this spend covered in the Cost Case?", select "Yes".') &&
      enhancedSplitAmountCurrencySteps.includes('Enter "SOC-UYGMTPR" in the "Opportunity Number" field.') &&
      enhancedSplitAmountCurrencySteps.includes(
        'For the question "Will this transaction be a capital expenditure for Kyndryl?", select "Yes".',
      ) &&
      enhancedSplitAmountCurrencySteps.includes(
        'For the question "Have you verified that there are no reusable assets available to meet your requirements?", select "Yes".',
      ) &&
      enhancedSplitAmountCurrencySteps.some((step) => /Do you have a quotation from a supplier/.test(step)) &&
      !enhancedSplitAmountCurrencySteps.some((step) => /question "CAN"|Opportunity Number O|CAN V/i.test(step)),
  );

  const mergedFullPageProcurementDraft = mergeParsedScreenshotSteps(
    {
      steps: ['select "Single Customer"', 'select "Sales Opportunity"', 'select "New Purchase"', "document", "assignee"],
      questions: [
        "Type of engagement supported/ will be supported by the Supplier",
        "Is this request for a sales opportunity or delivery fulfillment",
        "Request type",
        "Upload additional documents (if any)",
        "Add watchers (if any)",
      ],
    },
    extractKnownProcurementStepsFromScreenshotText(
      joinLines([
        "Procurement Intake Process",
        "Engagement Details",
        "Type of engagement supported/ will be supported by the Supplier ®",
        "• Single Customer",
        "O Multi-Customer pool",
        "O Kyndryl Internal Use",
        "Is this request for a sales opportunity or delivery fulfillment ®",
        "• Sales Opportunity",
        "O Delivery Fulfillment",
        "Target Date ®",
        "Jun 11, 2026",
        "Add Requirements",
        "Estimated project amount ®",
        "Insert the total expected value of the product or service for the full duration of the engagement",
        "$ 2,822,123.74",
        "CAN V",
        "Is this spend covered in the Cost Case?",
        "• Yes O No",
        "Opportunity Number O",
        "SOC-UYGMTPR",
        "Request type",
        "• New Purchase",
        "O Resale",
        "O Renewal",
        "Will this transaction be a capital expenditure for Kyndryl? *",
        "• Yes O No",
        "Have you verified that there are no reusable assets available to meet your requirements? ®",
        "• Yes O No",
        "Do you have a quotation from a supplier?",
        "O Yes • No",
        "Upload additional documents (if any) ®",
        "Click to Upload or drag and drop",
        "Additional instructions for the supplier ®",
        "Add watchers (if any) ®",
        "Select user",
        "Continue",
      ]),
    ),
  );
  const enhancedMergedFullPageProcurementSteps = mergedFullPageProcurementDraft.steps.map((step, index) =>
    localEnhanceStep(step, mergedFullPageProcurementDraft.questions[index]),
  );
  const uploadStepIndex = enhancedMergedFullPageProcurementSteps.findIndex((step) => /Upload additional documents/i.test(step));
  const requestTypeStepIndex = enhancedMergedFullPageProcurementSteps.findIndex((step) => /question "Request type"/i.test(step));
  assertCheck(
    "full-page procurement OCR merge restores middle fields",
    enhancedMergedFullPageProcurementSteps.includes('Verify that "Procurement Intake Process" form is visible on screen.') &&
      enhancedMergedFullPageProcurementSteps.includes(
        'For the question "Type of engagement supported/ will be supported by the Supplier", select "Single Customer".',
      ) &&
      enhancedMergedFullPageProcurementSteps.includes(
        'For the question "Is this request for a sales opportunity or delivery fulfillment", select "Sales Opportunity".',
      ) &&
      enhancedMergedFullPageProcurementSteps.includes('Select "Jun 11, 2026" in the "Target Date" date field.') &&
      enhancedMergedFullPageProcurementSteps.includes('Verify that "Add Requirements" form is visible on screen.') &&
      enhancedMergedFullPageProcurementSteps.includes('Enter "$ 2,822,123.74 CAD" in the "Estimated project amount" field.') &&
      enhancedMergedFullPageProcurementSteps.includes('For the question "Is this spend covered in the Cost Case?", select "Yes".') &&
      enhancedMergedFullPageProcurementSteps.includes('Enter "SOC-UYGMTPR" in the "Opportunity Number" field.') &&
      enhancedMergedFullPageProcurementSteps.includes('For the question "Request type", select "New Purchase".') &&
      enhancedMergedFullPageProcurementSteps.includes(
        'For the question "Will this transaction be a capital expenditure for Kyndryl?", select "Yes".',
      ) &&
      enhancedMergedFullPageProcurementSteps.includes(
        'For the question "Have you verified that there are no reusable assets available to meet your requirements?", select "Yes".',
      ) &&
      enhancedMergedFullPageProcurementSteps.includes('For the question "Do you have a quotation from a supplier?", select "No".') &&
      enhancedMergedFullPageProcurementSteps.includes('For the "Upload additional documents (if any)", upload a valid document.') &&
      enhancedMergedFullPageProcurementSteps.includes('Open the "Add watchers (if any)" assignee field and select the applicable user.') &&
      enhancedMergedFullPageProcurementSteps.includes('Click the "Continue" button.') &&
      requestTypeStepIndex >= 0 &&
      uploadStepIndex > requestTypeStepIndex &&
      !enhancedMergedFullPageProcurementSteps.some((step) => /Additional instructions.*visible/i.test(step)),
  );

  const oldOrderedScreenshotRows = buildRowsForFormat(
    [
      {
        ...createStep(1),
        details: joinLines([
          "form verify visible on screen",
          "document",
          "assignee",
          'select "Single Customer"',
          'select "Sales Opportunity"',
          'select "New Purchase"',
        ]),
        questionLabel: joinLines([
          "Procurement Intake Process",
          "Upload additional documents (if any)",
          "Add watchers (if any)",
          "Type of engagement supported/ will be supported by the Supplier",
          "Is this request for a sales opportunity or delivery fulfillment",
          "Request type",
        ]),
      },
    ],
    "each-step",
  );
  assertCheck(
    "known screenshot fields are ordered in preview even from older rows",
    oldOrderedScreenshotRows[1]?.Steps.includes("Type of engagement supported") &&
      oldOrderedScreenshotRows[2]?.Steps.includes("sales opportunity or delivery fulfillment") &&
      oldOrderedScreenshotRows[3]?.Steps.includes("Request type") &&
      oldOrderedScreenshotRows[4]?.Steps.includes("Upload additional documents") &&
      oldOrderedScreenshotRows[5]?.Steps.includes("Add watchers"),
  );

  const dirtyEnhancedOcrRows = buildRowsForFormat(
    [
      {
        ...createStep(2),
        details: joinLines([
          "form verify visible on screen",
          "form verify visible on screen",
          'date "Jun 11,2026 @]"',
          "form verify visible on screen",
          'type "S$ 2,82212374 CAD"',
          'type "SCC-UYGMTPR"',
          "form verify visible on screen",
          'type "/"',
        ]),
        questionLabel: joinLines([
          "Procurement Intake Process B",
          "Engagement Details A",
          "Target Date",
          "Add Requirements A",
          "Estimated project amount",
          "Opportunity Number",
          "—",
          "Additional instructions for the supplier",
        ]),
      },
    ],
    "each-step",
  );
  assertCheck(
    "enhanced OCR artifacts are cleaned in preview",
    dirtyEnhancedOcrRows.some((row) => row.Steps === 'Verify that "Procurement Intake Process" form is visible on screen.') &&
      dirtyEnhancedOcrRows.some((row) => row.Steps === 'Verify that "Engagement Details" form is visible on screen.') &&
      dirtyEnhancedOcrRows.some((row) => row.Steps === 'Select "Jun 11, 2026" in the "Target Date" date field.') &&
      dirtyEnhancedOcrRows.some((row) => row.Steps === 'Verify that "Add Requirements" form is visible on screen.') &&
      dirtyEnhancedOcrRows.some((row) => row.Steps === 'Enter "$ 2,822,123.74 CAD" in the "Estimated project amount" field.') &&
      dirtyEnhancedOcrRows.some((row) => row.Steps === 'Enter "SOC-UYGMTPR" in the "Opportunity Number" field.') &&
      !dirtyEnhancedOcrRows.some((row) => /Process B|Details A|Requirements A|Jun 11,2026|S\$|SCC-|form or information|Additional instructions/.test(row.Steps)),
  );

  const submissionSummaryDraft = generateStepsFromScreenshotText(
    joinLines([
      "Request Title",
      "Cisco Hardware for SecNet Program In",
      "Purpose of the Request",
      "Full Buying process (Purchase Transaction)",
      "Type of engagement",
      "Single Customer",
      "Request Type",
      "New Purchase",
      "Opportunity Number",
      "SOC-UYGMTPR",
      "SLA timeframes indicate expected completion windows for each step and the overall process. Timelines may adjust",
      "as the request progresses, increasing or decreasing based on inputs and complexity. Process owners are",
      "responsible for delivering within defined SLAs, and performance is tracked against these commitments.",
      "Process details",
      "Estimated duration to complete the process",
      "1-120 days",
      "Pre-approvals prior Procurement Reviews",
      "All steps will be executed in parallel",
      "Special Handling",
      "All steps will be executed in parallel",
      "Vv Show all process steps",
      "Back Submit",
    ]),
  );
  const submissionSummaryRows = buildRowsForFormat(
    [{ ...createStep(3), details: joinLines(submissionSummaryDraft.steps), questionLabel: joinLines(submissionSummaryDraft.questions) }],
    "each-step",
  );
  assertCheck(
    "submission summary screenshot follows csv-style review steps",
    submissionSummaryRows.length === 4 &&
      submissionSummaryRows[0]?.Steps === "Observe the final submission summary page." &&
      /Request Title "Cisco Hardware for SecNet Program"/.test(submissionSummaryRows[1]?.Steps || "") &&
      /Type of Engagement "Single Customer"/.test(submissionSummaryRows[1]?.Steps || "") &&
      /Request Type "New Purchase"/.test(submissionSummaryRows[1]?.Steps || "") &&
      /Opportunity Number "SOC-UYGMTPR"/.test(submissionSummaryRows[1]?.Steps || "") &&
      /estimated duration "1-120 days"/.test(submissionSummaryRows[2]?.Steps || "") &&
      /Pre-approvals prior Procurement Reviews/.test(submissionSummaryRows[2]?.Steps || "") &&
      /Special Handling/.test(submissionSummaryRows[2]?.Steps || "") &&
      submissionSummaryRows[3]?.Steps === 'Click the "Submit" button.' &&
      submissionSummaryRows[1]?.["Actual Result"] ===
        "The Summary section displayed the request title, type of engagement, request type, opportunity ID, and process details correctly." &&
      !submissionSummaryRows.some((row) => /SecNet Program In|Show all process steps|Back Submit|SLA timeframes|responsible for delivering|form or information|Enter "Full Buying/.test(row.Steps)),
  );

  const processDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Process details",
      "Estimated duration to complete the process",
      "7 days",
      "1",
      "Budget Review and Approvals",
      "2",
      "Procurement Review",
      "Assigned to: Procurement | Est. Duration: 1 day",
      "Show all process steps",
      "Back",
      "Submit",
    ]),
  );
  const processDetailsRows = buildRowsForFormat(
    [{ ...createStep(4), details: joinLines(processDetailsDraft.steps), questionLabel: joinLines(processDetailsDraft.questions) }],
    "each-step",
  );
  assertCheck(
    "process details screenshot creates concise submit review steps",
    processDetailsRows.length === 2 &&
      /estimated duration "7 days"/.test(processDetailsRows[0]?.Steps || "") &&
      /Budget Review and Approvals/.test(processDetailsRows[0]?.Steps || "") &&
      /Procurement Review/.test(processDetailsRows[0]?.Steps || "") &&
      processDetailsRows[1]?.Steps === 'Click the "Submit" button.' &&
      !processDetailsRows.some((row) => /Show all process steps|Assigned to|form or information|Verify that the days/i.test(row.Steps)),
  );

  const mergedProcessDetailsDraft = mergeParsedScreenshotSteps(
    {
      steps: ['Verify that Process details displays estimated duration "7 days" and process steps "Procurement Review" and "Department Review".', "button Submit"],
      questions: ["", ""],
    },
    {
      steps: ["form verify visible on screen"],
      questions: ["Process details"],
    },
  );
  const mergedProcessDetailsRows = buildRowsForFormat(
    [{ ...createStep(4), details: joinLines(mergedProcessDetailsDraft.steps), questionLabel: joinLines(mergedProcessDetailsDraft.questions) }],
    "each-step",
  );
  assertCheck(
    "process details fallback form row is not appended after stronger summary",
    mergedProcessDetailsRows.length === 2 &&
      /estimated duration "7 days"/.test(mergedProcessDetailsRows[0]?.Steps || "") &&
      mergedProcessDetailsRows[1]?.Steps === 'Click the "Submit" button.' &&
      !mergedProcessDetailsRows.some((row) => /^Verify that "Process details" form/.test(row.Steps)),
  );

  const blankScreenshotStep = createStep(1);
  const firstScreenshotStep = { ...createStep(1), id: "first-screenshot", details: "form verify visible on screen", questionLabel: "First screen" };
  const secondScreenshotStep = { ...createStep(2), id: "second-screenshot", details: "button Continue", questionLabel: "" };
  const regeneratedSecondScreenshotStep = {
    ...createStep(2),
    id: "second-screenshot-regenerated",
    details: joinLines(["form verify visible on screen", "button Continue"]),
    questionLabel: joinLines(["Second screen", ""]),
  };
  const firstScreenshotMerge = mergeScreenshotDraftStep([blankScreenshotStep], firstScreenshotStep, "screen-1", null, "");
  const secondScreenshotMerge = mergeScreenshotDraftStep(firstScreenshotMerge, secondScreenshotStep, "screen-2", firstScreenshotStep.id, "screen-1");
  const regeneratedScreenshotMerge = mergeScreenshotDraftStep(
    secondScreenshotMerge,
    regeneratedSecondScreenshotStep,
    "screen-2",
    secondScreenshotStep.id,
    "screen-2",
  );
  assertCheck(
    "screenshot imports append new screenshots and regenerate same screenshot in place",
    firstScreenshotMerge.length === 1 &&
      firstScreenshotMerge[0]?.id === "first-screenshot" &&
      secondScreenshotMerge.length === 2 &&
      secondScreenshotMerge[0]?.id === "first-screenshot" &&
      secondScreenshotMerge[1]?.id === "second-screenshot" &&
      regeneratedScreenshotMerge.length === 2 &&
      regeneratedScreenshotMerge[0]?.id === "first-screenshot" &&
      regeneratedScreenshotMerge[1]?.id === "second-screenshot-regenerated",
  );
  assertCheck(
    "screenshot flow keeps one test case id across imported screenshots",
    getScreenshotImportTestCaseId([blankScreenshotStep]) === "TC-001" &&
      getScreenshotImportTestCaseId([{ ...firstScreenshotStep, source: "screenshot-import", testCaseId: "TC-001" }, secondScreenshotStep]) === "TC-001",
  );

  const procurementIntakeMissingButtonDraft = applyVisualActionFallbacks(
    generateStepsFromScreenshotText(
      joinLines([
        "Procurement Intake ANI",
        "Request Details",
        "Requestor",
        "OA Oro Admin (aniket.dabhade@orolabs.ai)",
        "Are you requesting on behalf of someone else?",
        "No",
        "Please describe the business need for this request",
        "| want to procure laptop services",
      ]),
    ),
    true,
  );
  assertCheck(
    "visual continue button appends missing action",
    procurementIntakeMissingButtonDraft.steps.includes("button Continue") &&
      procurementIntakeMissingButtonDraft.questions[procurementIntakeMissingButtonDraft.steps.indexOf("button Continue")] === "",
  );

  const procurementDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      "LJ]",
      "Estimated purchase amount?",
      "$ 12,345.00 USD v",
      "Please Specify your company Entity",
      "AniTech Private Limited",
      "Select the appropriate cost center.",
      "ANI Al",
      "Required by date",
      "May 28, 2026 i]",
      "Payment method",
      "Direct Payment",
      "Employee Reimbursement",
      "Corporate Card",
      "Continue",
    ]),
  );
  const enhancedProcurementDetailsSteps = procurementDetailsDraft.steps.map((step, index) =>
    localEnhanceStep(step, procurementDetailsDraft.questions[index]),
  );
  assertCheck(
    "procurement details screenshot fields are paired",
    enhancedProcurementDetailsSteps.includes('Verify that "Procurement Intake ANI" form is visible on screen.') &&
      enhancedProcurementDetailsSteps.includes('Enter "$ 12,345.00 USD" in the "Estimated purchase amount?" field.') &&
      enhancedProcurementDetailsSteps.includes(
        'Select "AniTech Private Limited" from the "Please Specify your company Entity" dropdown field.',
      ) &&
      enhancedProcurementDetailsSteps.includes('Select "ANI AI" from the "Select the appropriate cost center." dropdown field.') &&
      enhancedProcurementDetailsSteps.includes('Select "May 28, 2026" in the "Required by date" date field.') &&
      enhancedProcurementDetailsSteps.includes('For the question "Payment method", select "Direct Payment".') &&
      enhancedProcurementDetailsSteps.includes('Click the "Continue" button.') &&
      !enhancedProcurementDetailsSteps.some((step) => /\bLJ\]?|Employee Reimbursement|Corporate Card|form or information/i.test(step)),
  );

  const procurementHardwareDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      "IT & Hardware",
      "Required specifications",
      "4GB Ram",
      "Do you have a quotation from the supplier?",
      "© Yes O No",
      "Please upload the available quotation.",
      "X, Click to Upload or drag and drop Delivery location",
      "Search Address",
      "Add manually",
      "Continue",
    ]),
  );
  const enhancedProcurementHardwareSteps = procurementHardwareDraft.steps.map((step, index) =>
    localEnhanceStep(step, procurementHardwareDraft.questions[index]),
  );
  assertCheck(
    "procurement hardware screenshot upload and location are separated",
    enhancedProcurementHardwareSteps.includes('Verify that "Procurement Intake ANI" form is visible on screen.') &&
      enhancedProcurementHardwareSteps.includes('Enter "4GB Ram" in the "Required specifications" field.') &&
      enhancedProcurementHardwareSteps.includes('For the question "Do you have a quotation from the supplier?", select "Yes".') &&
      enhancedProcurementHardwareSteps.includes('For the "Please upload the available quotation.", upload a valid document.') &&
      enhancedProcurementHardwareSteps.includes('Search for and select the delivery location in the "Delivery Location" field.') &&
      enhancedProcurementHardwareSteps.includes('Click the "Continue" button.') &&
      !enhancedProcurementHardwareSteps.some((step) => /4GB Ram form|Search Address document|IT & Hardware|Add manually/i.test(step)),
  );

  const supplierTypeDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      "Please select the type of supplier.",
      "O Existing supplier",
      "© New supplier onboarding",
      "B To onboard a new supplier, please follow the supplier onboarding process. Click New Supplier Onboarding to",
      "proceed.",
      "New Supplier Onboarding",
      "Back",
      "Continue",
    ]),
  );
  const enhancedSupplierTypeSteps = supplierTypeDraft.steps.map((step, index) => localEnhanceStep(step, supplierTypeDraft.questions[index]));
  assertCheck(
    "supplier type screenshot radio info and button are cleaned",
    enhancedSupplierTypeSteps.includes('Verify that "Procurement Intake ANI" form is visible on screen.') &&
      enhancedSupplierTypeSteps.includes('For the question "Please select the type of supplier.", select "New Supplier Onboarding".') &&
      enhancedSupplierTypeSteps.includes(
        'Verify that the informational message "To onboard a new supplier, please follow the supplier onboarding process. Click New Supplier Onboarding to proceed." is displayed.',
      ) &&
      enhancedSupplierTypeSteps.includes('Click the "New Supplier Onboarding" button.') &&
      enhancedSupplierTypeSteps.includes('Click the "Continue" button.') &&
      !enhancedSupplierTypeSteps.some((step) => /Existing supplier.*field|form or information|^Verify that the proceed/i.test(step)),
  );

  const existingSupplierTypeDraft = generateStepsFromScreenshotText(
    joinLines([
      "Please select the type of supplier.",
      "© Existing supplier",
      "O New supplier onboarding",
      "Back",
      "Continue",
    ]),
  );
  const enhancedExistingSupplierTypeSteps = existingSupplierTypeDraft.steps.map((step, index) =>
    localEnhanceStep(step, existingSupplierTypeDraft.questions[index]),
  );
  assertCheck(
    "supplier type selected existing does not click onboarding option",
    enhancedExistingSupplierTypeSteps.includes('For the question "Please select the type of supplier.", select "Existing Supplier".') &&
      enhancedExistingSupplierTypeSteps.includes('Click the "Continue" button.') &&
      !enhancedExistingSupplierTypeSteps.some((step) => /New Supplier Onboarding.*button|New Supplier Onboarding.*field/i.test(step)),
  );

  const existingSupplierBareOptionDraft = generateStepsFromScreenshotText(
    joinLines([
      "Please select the type of supplier.",
      "© Existing supplier",
      "New Supplier Onboarding",
      "Back",
      "Continue",
    ]),
  );
  const enhancedExistingSupplierBareOptionSteps = existingSupplierBareOptionDraft.steps.map((step, index) =>
    localEnhanceStep(step, existingSupplierBareOptionDraft.questions[index]),
  );
  assertCheck(
    "supplier type bare unselected onboarding option is not treated as a button",
    enhancedExistingSupplierBareOptionSteps.includes('For the question "Please select the type of supplier.", select "Existing Supplier".') &&
      enhancedExistingSupplierBareOptionSteps.includes('Click the "Continue" button.') &&
      enhancedExistingSupplierBareOptionSteps.indexOf('For the question "Please select the type of supplier.", select "Existing Supplier".') <
        enhancedExistingSupplierBareOptionSteps.indexOf('Click the "Continue" button.') &&
      !enhancedExistingSupplierBareOptionSteps.some((step) => /New Supplier Onboarding.*button|New Supplier Onboarding.*field/i.test(step)),
  );

  const mergedGenericSupplierTypeDraft = mergeParsedScreenshotSteps(
    {
      steps: ['select "Existing Supplier"', "button Continue"],
      questions: ["Please select the type of supplier.", ""],
    },
    {
      steps: ["button Continue"],
      questions: [""],
    },
  );
  const enhancedMergedGenericSupplierTypeSteps = mergedGenericSupplierTypeDraft.steps.map((step, index) =>
    localEnhanceStep(step, mergedGenericSupplierTypeDraft.questions[index]),
  );
  assertCheck(
    "fallback merge does not move continue before generic screenshot steps",
    enhancedMergedGenericSupplierTypeSteps.join(" | ") ===
      'For the question "Please select the type of supplier.", select "Existing Supplier". | Click the "Continue" button.',
  );

  const selectedSupplierDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      ". _____________________________________________________________________________________]",
      "Selected supplier",
      "DHL EXPRESS",
      "United States | ID: 100266860 )",
      "9, Select contact",
      "Enabled for:",
      "Add another supplier",
      "Back",
      "Continue",
    ]),
  );
  const enhancedSelectedSupplierSteps = selectedSupplierDraft.steps.map((step, index) =>
    localEnhanceStep(step, selectedSupplierDraft.questions[index]),
  );
  assertCheck(
    "selected supplier card screenshot is cleaned",
      enhancedSelectedSupplierSteps.includes('Verify that "Procurement Intake ANI" form is visible on screen.') &&
      enhancedSelectedSupplierSteps.includes('Verify that "DHL EXPRESS" is displayed in the "Selected supplier" section.') &&
      enhancedSelectedSupplierSteps.includes("Verify that the selected supplier details show United States and ID 100266860.") &&
      enhancedSelectedSupplierSteps.includes('Click the "Select contact" button.') &&
      enhancedSelectedSupplierSteps.includes('Click the "Continue" button.') &&
      !enhancedSelectedSupplierSteps.some((step) => /_{3,}|Enabled for|United States \| ID|form or information|Select \"Enabled for/i.test(step)),
  );

  const selectedSupplierDetailsDraft = generateStepsFromScreenshotText(
    joinLines([
      "Selected supplier",
      "CISCO SYSTEMS CANADA CO ◆ Non-Pif",
      "Canada | ID: 2000008086",
      "Contact: mig.temp@kyndryl.com + Primary = mig.temp@kyndryl.com",
      "Enabled for purchasing | Payment terms: Net 30 days (B022) v",
      "+ Add another supplier",
      "Back",
      "Continue",
    ]),
  );
  const enhancedSelectedSupplierDetailsSteps = selectedSupplierDetailsDraft.steps.map((step, index) =>
    localEnhanceStep(step, selectedSupplierDetailsDraft.questions[index]),
  );
  assertCheck(
    "selected supplier detailed card keeps supplier metadata together",
    enhancedSelectedSupplierDetailsSteps.includes('Verify that "CISCO SYSTEMS CANADA CO" is displayed in the "Selected supplier" section.') &&
      enhancedSelectedSupplierDetailsSteps.includes("Verify that the selected supplier details show Canada and ID 2000008086.") &&
      enhancedSelectedSupplierDetailsSteps.includes('Verify that contact "mig.temp@kyndryl.com" is displayed for the selected supplier.') &&
      enhancedSelectedSupplierDetailsSteps.includes("Verify that the selected supplier is enabled for purchasing.") &&
      enhancedSelectedSupplierDetailsSteps.includes('Select "Net 30 days (B022)" from the "Payment terms" dropdown field.') &&
      enhancedSelectedSupplierDetailsSteps.includes('Click the "Continue" button.') &&
      !enhancedSelectedSupplierDetailsSteps.some((step) => /Non-Pif|Add another supplier|@ Enabled|\"Selected supplier\" form|\"\\+ Add another supplier\"/i.test(step)),
  );

  const selectedSupplierLogoNoiseDraft = generateStepsFromScreenshotText(
    joinLines([
      "Selected supplier",
      "TIM S.p.A. Z=TIM",
      "Milan, Italy | gruppotim.it",
      "Select contact",
      "Status: New Supplier",
      "+ Add another supplier",
      "Continue",
    ]),
  );
  const enhancedSelectedSupplierLogoNoiseSteps = selectedSupplierLogoNoiseDraft.steps.map((step, index) =>
    localEnhanceStep(step, selectedSupplierLogoNoiseDraft.questions[index]),
  );
  assertCheck(
    "selected supplier card strips logo and status OCR noise",
    enhancedSelectedSupplierLogoNoiseSteps.includes('Verify that "TIM S.p.A." is displayed in the "Selected supplier" section.') &&
      enhancedSelectedSupplierLogoNoiseSteps.includes('Click the "Select contact" button.') &&
      enhancedSelectedSupplierLogoNoiseSteps.includes('Click the "Continue" button.') &&
      !enhancedSelectedSupplierLogoNoiseSteps.some((step) => /Z=TIM|Status: New Supplier|Add another supplier/i.test(step)),
  );

  const noisyOcrDraft = generateStepsFromScreenshotText(
    joinLines([
      "Risk Review Al Agent x",
      "Will the vendor store or have any access to our network, data, systems, or other applications?",
      "Yes © No",
      "the company?",
      "O Yes No",
      "Security Assessment Needed",
      "How critical the vendor is / will be to business operations ?",
      "© High",
      "Medium",
      "Low",
      "How challenging it would be to replace this vendor, if required",
      "High",
      "© Medium",
    ]),
  );
  assertCheck(
    "noisy OCR radio options are cleaned",
    noisyOcrDraft.steps.includes("select no") &&
      noisyOcrDraft.steps.includes("select high") &&
      noisyOcrDraft.steps.includes("select medium") &&
      noisyOcrDraft.steps.includes("question verify visible on screen") &&
      noisyOcrDraft.questions.includes("Security Assessment Needed") &&
      !noisyOcrDraft.steps.some((step) => /Yes © No|O Yes No|© High|© Medium|verify Medium|verify Low/i.test(step)),
  );

  const riskReviewScreenshotDraft = generateStepsFromScreenshotText(
    joinLines([
      "Risk Review AI Agent",
      "Will the vendor store or have any access to our network, data, systems, or other applications?",
      "O Yes © No",
      "Will the vendor have access to or handle any internal business data, confidential records, or regulated information on behalf of",
      "the company?",
      "Yes O No",
      "Security Assessment Needed",
      "O Yes © No",
      "How critical the vendor is / will be to business operations ?",
      "© High",
      "Medium",
      "Low",
      "How challenging it would be to replace this vendor, if required",
      "High",
      "© Medium",
      "Low",
      "Continue",
    ]),
  );
  const enhancedRiskReviewSteps = riskReviewScreenshotDraft.steps.map((step, index) =>
    localEnhanceStep(step, riskReviewScreenshotDraft.questions[index]),
  );
  assertCheck(
    "risk review screenshot radio answers are mapped",
    enhancedRiskReviewSteps.includes(
      'For the question "Will the vendor store or have any access to our network, data, systems, or other applications?", select "No".',
    ) &&
      enhancedRiskReviewSteps.includes(
        'For the question "Will the vendor have access to or handle any internal business data, confidential records, or regulated information on behalf of the company?", select "Yes".',
      ) &&
      enhancedRiskReviewSteps.includes('For the question "Security Assessment Needed", select "No".') &&
      enhancedRiskReviewSteps.includes('For the question "How critical the vendor is / will be to business operations ?", select "High".') &&
      enhancedRiskReviewSteps.includes('For the question "How challenging it would be to replace this vendor, if required", select "Medium".') &&
      enhancedRiskReviewSteps.includes('Click the "Continue" button.') &&
      !enhancedRiskReviewSteps.some((step) => /assignee field/i.test(step)),
  );

  const riskReviewDetailedDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      "Will the vendor store or have any access to our network, data, systems, or other applications?",
      "O Yes © No",
      "Will the vendor have access to or handle any internal business data, confidential records, or regulated information on behalf of",
      "the company?",
      "© Yes O No",
      "How critical the vendor is / will be to business operations ?",
      "© High: The vendor is/will be critical to business operations",
      "O Medium: The vendor is/will be important to business operations",
      "O Low: The vendor has insignificant impact to business operations",
      "How challenging it would be to replace this vendor, if required",
      "O High: It would be very difficult or impossible to replace this vendor with an alternative",
      "© Medium: It would be challenging to replace this vendor with an alternative",
      "O Low: It would be relatively easy to replace the vendor with an alternative",
      "What types of internal information will the vendor or their solution access, store, or process on behalf of the company?",
      "☑ Employee Data/ Personally Identifiable Information",
      "☑ Customer or client information",
      "☐ Payment or financial account data",
      "☐ Company confidential or proprietary information",
      "☐ Confidential business information",
      "☐ None of the above",
      "Continue",
    ]),
  );
  const enhancedRiskReviewDetailedSteps = riskReviewDetailedDraft.steps.map((step, index) =>
    localEnhanceStep(step, riskReviewDetailedDraft.questions[index]),
  );
  const combinedInternalInformationStep =
    'For the question "What types of internal information will the vendor or their solution access, store, or process on behalf of the company?", select "Employee Data/ Personally Identifiable Information" and "Customer or client information".';
  assertCheck(
    "risk review described options and checkboxes are cleaned",
    enhancedRiskReviewDetailedSteps.includes(
      'For the question "How critical the vendor is / will be to business operations ?", select "High".',
    ) &&
      enhancedRiskReviewDetailedSteps.includes(
        'For the question "How challenging it would be to replace this vendor, if required", select "Medium".',
      ) &&
      enhancedRiskReviewDetailedSteps.includes(combinedInternalInformationStep) &&
      enhancedRiskReviewDetailedSteps.includes('Click the "Continue" button.') &&
      !enhancedRiskReviewDetailedSteps.some((step) => /Enter \"(High|Medium|Low)|supplier details|informational message \"What types/i.test(step)),
  );

  const riskReviewVisualCheckboxDraft = generateStepsFromScreenshotText(
    joinLines([
      "Procurement Intake ANI",
      "Will the vendor store or have any access to our network, data, systems, or other applications?",
      "Yes No",
      "Will the vendor have access to or handle any internal business data, confidential records, or regulated information on behalf of",
      "the company?",
      "Yes No",
      "How critical the vendor is / will be to business operations ?",
      "High: The vendor is/will be critical to business operations",
      "Medium: The vendor is/will be important to business operations",
      "Low: The vendor has insignificant impact to business operations",
      "How challenging it would be to replace this vendor, if required",
      "High: It would be very difficult or impossible to replace this vendor with an alternative",
      "Medium: It would be challenging to replace this vendor with an alternative",
      "Low: It would be relatively easy to replace the vendor with an alternative",
      "What types of internal information will the vendor or their solution access, store, or process on behalf of the company?",
      "Employee Data/ Personally Identifiable Information",
      "Customer or client information",
      "Payment or financial account data",
      "Company confidential or proprietary information",
      "Confidential business information",
      "None of the above",
      "sack | EOD",
      "Continue",
    ]),
    [
      { optionCount: 2, selectedIndex: 1, selectedIndexes: [1] },
      { optionCount: 2, selectedIndex: 0, selectedIndexes: [0] },
      { optionCount: 3, selectedIndex: 0, selectedIndexes: [0] },
      { optionCount: 3, selectedIndex: 1, selectedIndexes: [1] },
      { optionCount: 6, selectedIndex: 0, selectedIndexes: [0, 1] },
    ],
  );
  const enhancedRiskReviewVisualCheckboxSteps = riskReviewVisualCheckboxDraft.steps.map((step, index) =>
    localEnhanceStep(step, riskReviewVisualCheckboxDraft.questions[index]),
  );
  assertCheck(
    "risk review visual checkbox selection filters unchecked OCR labels",
    enhancedRiskReviewVisualCheckboxSteps.includes(combinedInternalInformationStep) &&
      !enhancedRiskReviewVisualCheckboxSteps.some((step) =>
        /Payment or financial account data|Company confidential or proprietary information|Confidential business information|None of the above|sack \| EOD|question .*visible/i.test(
          step,
        ),
      ),
  );

  const riskReviewVisualCheckboxDifferentSelectionDraft = generateStepsFromScreenshotText(
    joinLines([
      "What types of internal information will the vendor or their solution access, store, or process on behalf of the company?",
      "Employee Data/ Personally Identifiable Information",
      "Customer or client information",
      "Payment or financial account data",
      "Company confidential or proprietary information",
      "Confidential business information",
      "None of the above",
      "Continue",
    ]),
    [{ optionCount: 6, selectedIndex: 1, selectedIndexes: [1, 5] }],
  );
  const enhancedDifferentCheckboxSteps = riskReviewVisualCheckboxDifferentSelectionDraft.steps.map((step, index) =>
    localEnhanceStep(step, riskReviewVisualCheckboxDifferentSelectionDraft.questions[index]),
  );
  assertCheck(
    "visual checkbox indexes map to selected OCR labels",
    enhancedDifferentCheckboxSteps.includes(
      'For the question "What types of internal information will the vendor or their solution access, store, or process on behalf of the company?", select "Customer or client information" and "None of the above".',
    ) &&
      !enhancedDifferentCheckboxSteps.some((step) => /Employee Data|Payment or financial|Company confidential|Confidential business/i.test(step)),
  );

  const riskReviewTextOnlyCheckboxDraft = generateStepsFromScreenshotText(
    joinLines([
      "What types of internal information will the vendor or their solution access, store, or process on behalf of the company?",
      "Employee Data/ Personally Identifiable Information",
      "Customer or client information",
      "Company confidential or proprietary information",
      "Confidential business information",
      "Continue",
    ]),
  );
  const enhancedRiskReviewTextOnlyCheckboxSteps = riskReviewTextOnlyCheckboxDraft.steps.map((step, index) =>
    localEnhanceStep(step, riskReviewTextOnlyCheckboxDraft.questions[index]),
  );
  assertCheck(
    "risk review text-only checkbox fallback avoids verify-label rows",
    enhancedRiskReviewTextOnlyCheckboxSteps.includes(combinedInternalInformationStep) &&
      !enhancedRiskReviewTextOnlyCheckboxSteps.some((step) => /Company confidential|Confidential business|question .*visible|form is visible/i.test(step)),
  );

  const emptyScreenshotFallbackDraft = applyVisualActionFallbacks(generateStepsFromScreenshotText(""), true);
  assertCheck("empty screenshot text does not create continue-only step", emptyScreenshotFallbackDraft.steps.length === 0);

  const pendingScreenshotDraft = generateStepsFromScreenshotText(joinLines(["Will the supplier store company data?", "Supplier Name"]));
  const enhancedPendingScreenshotSteps = pendingScreenshotDraft.steps.map((step, index) =>
    localEnhanceStep(step, pendingScreenshotDraft.questions[index]),
  );
  assertCheck(
    "screenshot pending labels do not become raw verify steps",
    pendingScreenshotDraft.steps.includes("question verify visible on screen") &&
      pendingScreenshotDraft.steps.includes("field verify visible on screen") &&
      !pendingScreenshotDraft.steps.includes("verify") &&
      enhancedPendingScreenshotSteps.includes('Verify that the question "Will the supplier store company data?" is visible on screen.') &&
      enhancedPendingScreenshotSteps.includes('Verify that the "Supplier Name" field is visible on screen.'),
  );

  assertCheck(
    "actual result generation",
    generateActualResult("The selected option should be applied successfully.") === "The selected option was applied successfully.",
  );
  assertCheck(
    "multi-select actual result generation",
    generateActualResult("The selected options should be applied successfully.") === "The selected options were applied successfully.",
  );
  const xlsxBytes = rowsToXlsxWorkbook(["Test Case ID", "Steps"], [{ "Test Case ID": "TC-001", Steps: joinLines(["Step A", "Step B"]) }]);
  assertCheck("xlsx export creates workbook", xlsxBytes instanceof Uint8Array && xlsxBytes[0] === 0x50 && xlsxBytes[1] === 0x4b && xlsxBytes.length > 1000);

  const numberSteps = [
    { ...createStep(1), details: joinLines(["Step A", "Step B"]) },
    { ...createStep(2), details: "Step C" },
  ];
  const eachStepRows = buildRowsForFormat(numberSteps, "each-step");
  const formStepRows = buildRowsForFormat(numberSteps, "form-step");
  assertCheck(
    "generated step numbers for each-step rows",
    eachStepRows.map((row) => row["Step Number"]).join(",") === "1,2,3",
  );
  assertCheck(
    "generated step numbers for form-step rows",
    formStepRows[0]["Step Number"] === joinLines(["1.1", "1.2"]) && formStepRows[1]["Step Number"] === "2.1",
  );
  assertCheck(
    "form-step grouped result is single expected and actual",
    !formStepRows[0]["Expected Result"].includes(NEWLINE) && !formStepRows[0]["Actual Result"].includes(NEWLINE),
  );

  const editable = rowsToEditableSteps(formStepRows, "Module", "Scenario");
  assertCheck("saved rows convert to editable steps", editable.length === 2);

  const insertedSteps = insertStepAt([{ ...createStep(1) }, { ...createStep(2) }], 1, "Module", "Scenario", DEFAULT_SELECTED_COLUMNS);
  assertCheck(
    "insert row between existing rows",
    insertedSteps.length === 3 && insertedSteps[0].testCaseId === "TC-001" && insertedSteps[1].testCaseId === "TC-003" && insertedSteps[2].testCaseId === "TC-002",
  );
  assertCheck("move row to another position", moveArrayItem(["A", "B", "C"], 0, 3).join("") === "BCA");
  assertCheck("move column before another column", moveArrayItem(["A", "B", "C"], 2, 0).join("") === "CAB");

  const savedFile = {
    id: "self-test-file",
    name: "Saved Self Test",
    rowFormat: "form-step",
    columns: ["Test Case ID", "Steps", "Actual Result", "Status"],
    rows: [
      {
        "Test Case ID": "TC-050",
        Steps: "Open the intake page.",
        "Actual Result": "The expected screen was displayed successfully.",
        Status: "Passed",
      },
    ],
  };
  const draft = createSavedFileEditDraft(savedFile, "Module", "Scenario", DEFAULT_SELECTED_COLUMNS);
  assertCheck(
    "edit saved file flow",
    draft.editingFileId === savedFile.id &&
      draft.currentPage === "builder" &&
      draft.selectedColumns.includes("Question / Field Label") &&
      draft.steps.length === 1 &&
      draft.steps[0].status === "Passed",
  );

  assertCheck("status renders as text input", renderStepControl(createStep(1), "Status").startsWith("<input"));
  assertCheck("username normalization", normalizeUsername(" Admin.User ") === "admin.user");
  assertCheck("admin role detection", isAdminUser({ role: "Admin" }) && !isAdminUser({ role: "User" }));
  assertCheck("login page shows default admin hint", renderLoginPage().includes(DEFAULT_ADMIN_USERNAME) && renderLoginPage().includes(DEFAULT_ADMIN_PASSWORD));
  const ownerUser = { id: "user-1", name: "QA User", username: "qa.user", role: "User" };
  const otherUser = { id: "user-2", name: "Other User", username: "other.user", role: "User" };
  const adminUser = { id: "admin-1", name: "Admin", username: "admin", role: "Admin" };
  const ownedFile = { id: "owned", name: "Owned Test", ownerUserId: "user-1", ownerName: "QA User", ownerUsername: "qa.user", columns: [], rows: [] };
  const otherFile = { id: "other", name: "Other Test", ownerUserId: "user-2", ownerName: "Other User", ownerUsername: "other.user", columns: [], rows: [] };
  assertCheck("user can access only own saved file", canAccessSavedFile(ownedFile, ownerUser) && !canAccessSavedFile(otherFile, ownerUser));
  assertCheck("admin can access all saved files", canAccessSavedFile(ownedFile, adminUser) && canAccessSavedFile(otherFile, adminUser));
  const previousSavedFiles = state.savedFiles;
  const previousCurrentUser = state.currentUser;
  state.savedFiles = [ownedFile, otherFile];
  state.currentUser = ownerUser;
  assertCheck("visible saved files are filtered for normal user", visibleSavedFiles().length === 1 && visibleSavedFiles()[0].id === "owned");
  state.currentUser = adminUser;
  assertCheck("visible saved files include all for admin", visibleSavedFiles().length === 2);
  state.savedFiles = previousSavedFiles;
  state.currentUser = previousCurrentUser;
  assertCheck("saved file creator label", fileCreatorLabel(ownedFile) === "QA User (qa.user)");

  window.__TESTCASE_BUILDER_SELF_TESTS__ = results;
  document.documentElement.dataset.selfTestsPassed = String(results.every((result) => result.passed));
  document.documentElement.dataset.selfTestsCount = String(results.length);
  if (results.every((result) => result.passed)) {
    console.info(`Testcase Builder self-checks passed (${results.length}/${results.length}).`);
  } else {
    console.error("Testcase Builder self-checks failed", results.filter((result) => !result.passed));
  }
}

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("dragstart", handleDragStart);
document.addEventListener("dragover", handleDragOver);
document.addEventListener("drop", handleDrop);
document.addEventListener("dragend", handleDragEnd);

runSelfTests();
renderApp();
void initializeAuth();
