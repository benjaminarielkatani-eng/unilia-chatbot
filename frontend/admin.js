"use strict";

const ADMIN_TOKEN_KEY = "uniliaAdminAccessToken";
const SETTINGS_STORAGE_KEY = "uniliaAdminDemoSettings";
const DOCUMENTS_URL = "/api/documents/";
const DOCUMENT_CATEGORIES = ["Admissions", "Academic", "Finance", "Student Life", "Support", "Other"];
const ADMIN_RESOURCES = {
    analytics: "/api/admin/analytics",
    feedback: "/api/admin/feedback",
    users: "/api/admin/users"
};

const viewTitles = {
    overview: "Dashboard Overview",
    users: "User Management",
    documents: "Document Management",
    feedback: "Feedback & Reviews",
    analytics: "Analytics & Reports",
    settings: "System Settings"
};

const adminShell = document.getElementById("adminShell");
const adminLogin = document.getElementById("adminLogin");
const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("adminLoginMessage");
const signInButton = document.getElementById("signInButton");
const pageContent = document.getElementById("pageContent");
const globalSearch = document.getElementById("globalSearch");
const currentSection = document.getElementById("currentSection");
const dialog = document.getElementById("detailDialog");
const dialogContent = document.getElementById("dialogContent");
const toastRegion = document.getElementById("toastRegion");
let activeView = "overview";
let adminSession = null;
let documentRecords = [];
let documentsBusy = false;
let documentsError = "";
let adminData = {};
let analyticsDays = 7;
let pendingFeedback = null;
let toastTimer;

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function(character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];
    });
}

function readStoredJSON(key, fallback) {
    try {
        const stored = JSON.parse(localStorage.getItem(key));
        if (!stored || typeof stored !== "object" || Array.isArray(stored) !== Array.isArray(fallback)) {
            return fallback;
        }
        return stored;
    } catch (error) {
        console.warn("Admin preferences could not be read from local storage:", error);
        return fallback;
    }
}

function saveStoredJSON(key, value) {
    try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Could not save admin preferences in this browser:", error);
        showToast("Changes could not be saved in this browser. Check available storage.");
        return false;
    }
}

async function requestAdmin(path, options = {}, token = "") {
    const headers = new Headers(options.headers);
    if (token) headers.set("Authorization", "Bearer " + token);
    let response;
    try {
        response = await fetch(path, { ...options, headers, cache: "no-store" });
    } catch (error) {
        throw new Error("Could not reach the UNILIA server. Try again.");
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = result?.detail;
        const validationMessage = Array.isArray(detail) && detail[0]?.msg;
        const message = typeof detail === "string" ? detail : validationMessage ||
            "The server could not complete this request. Try again.";
        throw Object.assign(new Error(message), { status: response.status });
    }
    return result;
}

function setFormMessage(element, message) {
    element.textContent = message;
    element.hidden = !message;
}

function storeAdminToken(token) {
    try {
        if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
        else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (error) {
        // The active session also works in memory when browser storage is unavailable.
    }
}

function signOut(message = "") {
    adminSession = null;
    storeAdminToken("");
    documentRecords = [];
    documentsBusy = false;
    documentsError = "";
    adminData = {};
    pendingFeedback = null;
    updateNotificationIndicator(loadSettings());
    document.getElementById("notificationPopover").hidden = true;
    document.getElementById("notificationButton").setAttribute("aria-expanded", "false");
    activeView = "overview";
    globalSearch.value = "";
    if (dialog.open) dialog.close();
    adminShell.hidden = true;
    adminLogin.hidden = false;
    setFormMessage(loginMessage, message);
    loginForm.elements.username.focus();
}

async function openAdminSession(token) {
    const profile = await requestAdmin("/api/auth/me", {}, token);
    if (profile?.role !== "admin" || !profile.is_active) {
        throw new Error("Administrator access is required.");
    }
    adminSession = { token, profile };
    storeAdminToken(token);
    loginForm.reset();
    setFormMessage(loginMessage, "");
    document.getElementById("adminProfileName").textContent = profile.username;
    document.getElementById("adminInitials").textContent = profile.username.slice(0, 2).toUpperCase();
    adminLogin.hidden = true;
    adminShell.hidden = false;
    refreshAdminData("analytics");
}

async function signIn(event) {
    event.preventDefault();
    if (signInButton.disabled) return;
    signInButton.disabled = true;
    signInButton.textContent = "Signing in…";
    setFormMessage(loginMessage, "");
    try {
        // Send credentials as form-encoded data (required by OAuth2PasswordRequestForm on the backend)
        const loginBody = new URLSearchParams();
        loginBody.append("username", loginForm.elements.username.value.trim());
        loginBody.append("password", loginForm.elements.password.value);
        const result = await requestAdmin("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: loginBody.toString()
        });
        if (!result?.access_token) throw new Error("The server did not return a sign-in token.");
        await openAdminSession(result.access_token);
    } catch (error) {
        setFormMessage(loginMessage, error.message);
    } finally {
        signInButton.disabled = false;
        signInButton.textContent = "Sign in";
    }
}

async function restoreAdminSession() {
    let token;
    try {
        token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    } catch (error) {
        return;
    }
    if (!token) return;
    signInButton.disabled = true;
    signInButton.textContent = "Restoring session…";
    try {
        await openAdminSession(token);
    } catch (error) {
        signOut(error.status === 401 ? "Your session expired. Sign in again." : error.message);
    } finally {
        signInButton.disabled = false;
        signInButton.textContent = "Sign in";
    }
}

function refreshDocumentView() {
    if (activeView === "documents") renderCurrentView();
}

function handleSessionError(error) {
    if (error.status === 401) {
        signOut("Your session expired. Sign in again.");
        return true;
    }
    if (error.status === 403) {
        signOut(error.message);
        return true;
    }
    return false;
}

function analyticsView(view) {
    return view === "overview" || view === "analytics";
}

function renderAdminDataView(key) {
    if (activeView === key || (key === "analytics" && analyticsView(activeView))) renderCurrentView();
}

async function refreshAdminData(key) {
    const session = adminSession;
    const previous = adminData[key];
    const path = ADMIN_RESOURCES[key] + (key === "analytics" ? "?days=" + analyticsDays : "");
    if (!session || (previous?.busy && previous.path === path)) return;
    const state = {
        path,
        value: previous?.path === path ? previous.value : null,
        busy: true,
        error: ""
    };
    adminData[key] = state;
    renderAdminDataView(key);
    try {
        const result = await requestAdmin(path, {}, session.token);
        if (adminData[key] !== state) return;
        if (key === "analytics") {
            if (!result?.totals || !Array.isArray(result.daily)) throw new Error("Analytics data could not be read.");
            pendingFeedback = result.totals.pending_feedback;
        } else {
            if (!Array.isArray(result)) throw new Error("The server did not return a list.");
            if (key === "feedback") pendingFeedback = result.filter(item => !item.reviewed_at).length;
        }
        state.value = result;
        updateNotificationIndicator(loadSettings());
    } catch (error) {
        if (adminData[key] === state && !handleSessionError(error)) state.error = error.message;
    } finally {
        if (adminData[key] === state) {
            state.busy = false;
            renderAdminDataView(key);
        }
    }
}

function jsonRequest(method, fields) {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields) };
}

async function saveAdminRecord(key, id, fields) {
    const session = adminSession;
    const state = adminData[key];
    if (!session || !state?.value || state.busy) return false;
    state.busy = true;
    renderAdminDataView(key);
    try {
        const path = ADMIN_RESOURCES[key] + (id ? "/" + id : "");
        const saved = await requestAdmin(path, jsonRequest(id ? "PATCH" : "POST", fields), session.token);
        if (session !== adminSession) return false;
        if (!Number.isInteger(saved?.id)) throw new Error("The server did not confirm the change. Refresh and try again.");
        state.value = id ? state.value.map(item => item.id === id ? saved : item) : [saved, ...state.value];
        state.error = "";
        if (key === "feedback") pendingFeedback = state.value.filter(item => !item.reviewed_at).length;
        updateNotificationIndicator(loadSettings());
        if (analyticsView(activeView)) refreshAdminData("analytics");
        return true;
    } catch (error) {
        if (session === adminSession && !handleSessionError(error)) throw error;
        return false;
    } finally {
        if (adminData[key] === state) {
            state.busy = false;
            renderAdminDataView(key);
        }
    }
}

async function refreshDocuments() {
    const session = adminSession;
    if (!session || documentsBusy) return;
    documentsBusy = true;
    documentsError = "";
    refreshDocumentView();
    try {
        const records = await requestAdmin(DOCUMENTS_URL, {}, session.token);
        if (!Array.isArray(records)) throw new Error("The server did not return a document list.");
        if (session === adminSession) documentRecords = records;
    } catch (error) {
        if (session === adminSession && !handleSessionError(error)) documentsError = error.message;
    } finally {
        if (session === adminSession) {
            documentsBusy = false;
            refreshDocumentView();
        }
    }
}

async function changeDocument(path, options) {
    const session = adminSession;
    if (!session || documentsBusy) return false;
    documentsBusy = true;
    refreshDocumentView();
    try {
        const result = await requestAdmin(path, options, session.token);
        if (session !== adminSession) return false;
        const id = options.method === "DELETE" ? result?.document_id : result?.id;
        if (!Number.isInteger(id)) throw new Error("The server did not confirm the document change. Refresh the list and try again.");
        documentsError = "";
        if (options.method === "DELETE") {
            documentRecords = documentRecords.filter(item => item.id !== id);
        } else if (options.method === "POST") {
            documentRecords = [result, ...documentRecords];
        } else {
            documentRecords = documentRecords.map(item => item.id === id ? result : item);
        }
        return true;
    } catch (error) {
        if (session === adminSession && !handleSessionError(error)) throw error;
        return false;
    } finally {
        if (session === adminSession) {
            documentsBusy = false;
            refreshDocumentView();
        }
    }
}

function showToast(message) {
    toastRegion.replaceChildren();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function() {
        toast.remove();
    }, 3500);
}

function pageHeading(title, description, actions) {
    return '<div class="page-heading"><div><p class="eyebrow">UNIVERSITY OF LIVINGSTONIA · ADMIN</p><h1>' +
        escapeHTML(title) + '</h1><p>' + escapeHTML(description) +
        '</p></div>' + (actions || "") + "</div>";
}

function iconSVG(name) {
    const icons = {
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        questions: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
        documents: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
        feedback: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icons[name] + "</svg>";
}

function statCard(label, value, note, icon, view) {
    return '<button class="stat-card" type="button" data-go-view="' + view + '" aria-label="' + escapeHTML(label) + ': ' +
        escapeHTML(value) + '. Open ' + escapeHTML(viewTitles[view]) + '">' +
        '<span class="stat-card-copy"><span class="stat-label">' + escapeHTML(label) + '</span><strong class="stat-value">' + escapeHTML(value) +
        '</strong><span class="stat-change">' + escapeHTML(note) + '</span></span>' +
        '<span class="stat-icon">' + iconSVG(icon) + '</span></button>';
}

function dataNotice(key) {
    const state = adminData[key];
    if (state?.error) {
        return '<div class="panel data-notice" role="status"><p>' + escapeHTML(state.error) +
            '</p><button class="button" type="button" data-action="refresh-admin-data">Retry</button></div>';
    }
    const label = key === "users" ? "user accounts" : key;
    return !state?.value ? '<div class="panel data-notice" role="status">Loading ' + label + '…</div>' : "";
}

function numberText(value) {
    return Number.isFinite(value) ? value.toLocaleString() : "—";
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value.slice(0, 10) + "T00:00:00Z");
    return Number.isNaN(date.valueOf()) ? "—" :
        date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function periodSelect() {
    return '<label class="analytics-period">Date range <select class="select-small" id="analyticsPeriod">' +
        [7, 30, 90].map(days => '<option value="' + days + '"' + (analyticsDays === days ? " selected" : "") +
            '>Last ' + days + ' days</option>').join("") + '</select></label>';
}

function renderChart(daily) {
    if (!daily.length || daily.every(day => day.questions === 0)) {
        return '<div class="table-empty">No questions were submitted in this period.</div>';
    }

    const max = Math.max(...daily.map(day => day.questions));
    const tickCount = Math.min(max, 4);
    const maxTick = Math.ceil(max / tickCount) * tickCount;
    const coordinates = daily.map((day, index) => ({
        x: 52 + 569 * (daily.length === 1 ? 0.5 : index / (daily.length - 1)),
        y: 172 - 150 * day.questions / maxTick
    }));
    const grid = Array.from({ length: tickCount + 1 }, (_, index) => {
        const y = 172 - 150 * index / tickCount;
        return '<line class="chart-gridline" x1="43" y1="' + y + '" x2="635" y2="' + y +
            '"/><text class="chart-axis-label" x="38" y="' + (y + 3) + '" text-anchor="end">' +
            numberText(maxTick * index / tickCount) + '</text>';
    }).join("");
    const dots = coordinates.map(({ x, y }, index) => '<circle class="chart-dot" cx="' + x + '" cy="' + y +
        '" r="' + (daily.length > 30 ? 2 : 3) + '"><title>' + escapeHTML(formatDate(daily[index].date)) +
        ' — ' + numberText(daily[index].questions) + ' questions</title></circle>').join("");
    const labelIndices = new Set(Array.from({ length: Math.min(5, daily.length) }, (_, index) =>
        Math.round(index * (daily.length - 1) / Math.max(1, Math.min(5, daily.length) - 1))));
    const labels = coordinates.map(({ x }, index) => {
        const date = daily[index].date;
        return labelIndices.has(index) ? '<text class="chart-axis-label" x="' + x +
            '" y="196" text-anchor="middle">' + escapeHTML(date.slice(5)) + '</text>' : "";
    }).join("");
    const points = coordinates.map(({ x, y }) => x + "," + y).join(" ");
    return '<svg class="chart-svg" viewBox="0 0 650 210" role="img" aria-label="Questions submitted per day">' +
        grid + '<polyline class="chart-line" points="' + points + '"/>' + dots + labels + '</svg>';
}

function renderActivity(activity, query) {
    const labels = { question: "Chat question", document: "Document uploaded", feedback: "Feedback submitted" };
    const filtered = activity.filter(item => [item.label, labels[item.kind]].join(" ").toLowerCase().includes(query));
    if (!filtered.length) return '<div class="table-empty">' + (query ? "No matching activity." : "No recent activity.") + '</div>';
    return '<div class="activity-list">' + filtered.map(item =>
        '<div class="activity-item"><span class="activity-icon" aria-hidden="true">' + escapeHTML(item.kind[0].toUpperCase()) +
        '</span><span class="activity-copy"><strong title="' + escapeHTML(item.label) + '">' + escapeHTML(item.label) +
        '</strong><small>' + escapeHTML(labels[item.kind]) + '</small></span><span class="activity-time">' +
        escapeHTML(formatDate(item.created_at)) + '</span></div>'
    ).join("") + '</div>';
}

function renderTopQuestions(questions, query) {
    const filtered = questions.filter(item => item.question.toLowerCase().includes(query));
    if (!filtered.length) {
        return '<div class="table-empty">' + (query ? "No matching questions." : "No questions in this period.") + '</div>';
    }
    return '<ul class="top-question-list">' + filtered.map(item => '<li><span>' + escapeHTML(item.question) +
        '</span><strong>' + numberText(item.count) + '</strong></li>').join("") + '</ul>';
}

function renderOverview(query) {
    const analytics = adminData.analytics?.value;
    const disabled = !analytics || adminData.analytics.busy ? " disabled" : "";
    const heading = pageHeading("Dashboard Overview", "Helpdesk activity, active documents, and feedback.",
        '<div class="heading-actions">' + periodSelect() +
        '<button class="button" type="button" data-action="refresh-admin-data"' + disabled + '>Refresh</button></div>');
    const notice = dataNotice("analytics");
    if (!analytics) return heading + notice;
    const totals = analytics.totals;
    return heading + notice + '<section class="stats-grid" aria-label="All-time helpdesk statistics">' +
        statCard("User accounts", numberText(totals.users), "Registered accounts", "users", "users") +
        statCard("Questions asked", numberText(totals.questions), numberText(totals.answered) + " answered", "questions", "analytics") +
        statCard("Documents", numberText(totals.documents), "Active uploads", "documents", "documents") +
        statCard("Feedback received", numberText(totals.feedback), numberText(totals.pending_feedback) + " awaiting review", "feedback", "feedback") +
        '</section><div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Questions by day</h2><p>Last ' +
        analyticsDays + ' days · UTC</p></div></div><div class="chart-wrap">' + renderChart(analytics.daily) +
        '</div></section><section class="panel"><div class="panel-heading"><h2>Recent Activity</h2></div>' +
        renderActivity(analytics.recent_activity, query) + '</section></div>';
}

function renderUsers(query) {
    const state = adminData.users;
    const disabled = !state?.value || state.busy ? " disabled" : "";
    const heading = pageHeading("User Management", "Manage staff and administrator accounts.",
        '<button class="button button-primary" type="button" data-action="show-user-form"' + disabled + '>New account</button>');
    const notice = dataNotice("users");
    if (!state?.value) return heading + notice;
    const users = state.value.filter(user =>
        [user.username, user.email, user.role, user.is_active ? "active" : "inactive"].join(" ").toLowerCase().includes(query));
    const rows = users.map(user =>
        '<tr><td><div class="person-cell"><span class="person-avatar" aria-hidden="true">' + escapeHTML(user.username.slice(0, 2).toUpperCase()) +
        '</span><span><strong>' + escapeHTML(user.username) + '</strong><small>' + escapeHTML(user.email) +
        '</small></span></div></td><td>' + (user.role === "admin" ? "Administrator" : "Staff") +
        '</td><td><span class="status-pill' + (user.is_active ? "" : " inactive") + '">' + (user.is_active ? "Active" : "Inactive") +
        '</span></td><td>' + escapeHTML(formatDate(user.created_at)) + '</td><td><button class="row-action" type="button" data-edit-user="' +
        escapeHTML(user.id) + '" aria-label="Edit ' + escapeHTML(user.username) + '"' + disabled + '>Edit</button></td></tr>'
    ).join("");
    const empty = query ? "No matching accounts." : "No user accounts to show.";
    return heading + notice + '<section class="table-card" aria-busy="' + state.busy + '"><div class="table-toolbar"><p role="status">' +
        (state.busy ? "Updating user accounts…" : users.length + " of " + state.value.length + " accounts") +
        '</p><div class="heading-actions"><button class="button" type="button" data-action="refresh-admin-data"' + disabled +
        '>Refresh</button><button class="button" type="button" data-action="export-users"' + disabled +
        '>Export accounts</button></div></div><div class="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Status</th>' +
        '<th>Created</th><th>Actions</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5" class="table-empty">' + empty + '</td></tr>') + '</tbody></table></div></section>';
}

function categoryOptions(current) {
    const categories = DOCUMENT_CATEGORIES.includes(current) || !current
        ? DOCUMENT_CATEGORIES : [...DOCUMENT_CATEGORIES, current];
    return '<option value="">Uncategorized</option>' + categories.map(function(category) {
        const label = escapeHTML(category);
        return '<option value="' + label + '"' + (current === category ? " selected" : "") + '>' + label + "</option>";
    }).join("");
}

function renderDocuments(query) {
    const disabled = documentsBusy ? " disabled" : "";
    const documents = documentRecords.filter(function(item) {
        const fields = [item.title, item.filename, item.category, item.file_type];
        return fields.join(" ").toLowerCase().includes(query);
    });
    const rows = documents.map(function(item) {
        const type = item.file_type?.toUpperCase() || "FILE";
        const typeClass = { TXT: "txt", DOC: "doc", DOCX: "doc" }[type] || "";
        const id = escapeHTML(item.id);
        return '<tr><td><div class="file-cell"><span class="file-type ' + typeClass + '">' + escapeHTML(type) +
            '</span><span><strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.filename) +
            '</small></span></div></td><td><select class="category-select" data-category-id="' + id +
            '" aria-label="Category for ' + escapeHTML(item.title) + '"' + disabled + '>' + categoryOptions(item.category) +
            '</select></td><td>' + escapeHTML(item.created_at?.slice(0, 10) || "—") +
            '</td><td><div class="row-actions"><button class="row-action" type="button" data-edit-document="' + id + '"' + disabled +
            '>Edit</button><button class="row-action danger" type="button" data-delete-document="' + id + '"' + disabled +
            '>Delete</button></div></td></tr>';
    }).join("");
    let summary = documents.length + " of " + documentRecords.length + " documents";
    if (documentsBusy) summary = "Updating documents…";
    if (documentsError) summary = documentsError;
    const emptyMessage = query ? "No matching documents." : "No documents to show.";
    return pageHeading("Document Management", "Upload and manage university documents.", '<button class="button button-primary" type="button" data-action="show-upload"' + disabled + '>Upload document</button>') +
        '<section class="table-card" aria-busy="' + documentsBusy + '"><div class="table-toolbar"><p role="status">' +
        escapeHTML(summary) + '</p><button class="button" type="button" data-action="refresh-documents"' + disabled +
        '>Refresh</button></div><div class="table-scroll"><table><thead><tr><th>Document</th><th>Category</th><th>Upload date</th><th>Actions</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="4"><div class="table-empty">' + (documentsBusy ? "Loading documents…" : emptyMessage) + '</div></td></tr>') +
        '</tbody></table></div></section>';
}

function renderFeedback(query) {
    const state = adminData.feedback;
    const disabled = !state?.value || state.busy ? " disabled" : "";
    const heading = pageHeading("Feedback & Reviews", "Review ratings and comments submitted by students.");
    const notice = dataNotice("feedback");
    if (!state?.value) return heading + notice;
    const items = state.value.filter(item => [item.question, item.comment, item.rating,
        item.reviewed_at ? "reviewed" : "pending"].join(" ").toLowerCase().includes(query));
    const rows = items.map(item => {
        const reviewed = Boolean(item.reviewed_at);
        return '<tr><td class="feedback-text">' + escapeHTML(item.question || "—") +
            '</td><td class="feedback-text">' + escapeHTML(item.comment || "—") +
            '</td><td><span class="stars" aria-label="' + numberText(item.rating) + ' out of 5 stars">' +
            numberText(item.rating) + ' / 5</span></td><td>' + escapeHTML(formatDate(item.created_at)) +
            '</td><td><span class="status-pill' + (reviewed ? "" : " pending") + '">' + (reviewed ? "Reviewed" : "Pending") +
            '</span></td><td><button class="row-action" type="button" data-review-feedback="' + escapeHTML(item.id) +
            '"' + disabled + '>' + (reviewed ? "Reopen" : "Mark reviewed") + '</button></td></tr>';
    }).join("");
    const empty = query ? "No matching feedback." : "No feedback has been submitted.";
    const received = state.value.length;
    const pending = state.value.filter(item => !item.reviewed_at).length;
    const average = received ? (state.value.reduce((sum, item) => sum + item.rating, 0) / received).toFixed(1) + " / 5" : "—";
    return heading + notice + '<div class="analytics-kpis" aria-label="Feedback summary">' +
        '<article class="analytics-kpi"><span>Average rating</span><strong>' + average + '</strong></article>' +
        '<article class="analytics-kpi"><span>Responses</span><strong>' + numberText(received) + '</strong></article>' +
        '<article class="analytics-kpi"><span>Awaiting review</span><strong>' + numberText(pending) + '</strong></article></div>' +
        '<section class="table-card" aria-busy="' + state.busy + '"><div class="table-toolbar"><p role="status">' +
        (state.busy ? "Updating feedback…" : items.length + " of " + state.value.length + " responses") +
        '</p><div class="heading-actions"><button class="button" type="button" data-action="refresh-admin-data"' + disabled +
        '>Refresh</button><button class="button" type="button" data-action="export-feedback"' + disabled +
        '>Export feedback</button></div></div><div class="table-scroll"><table><thead><tr><th>Question</th><th>Comment</th>' +
        '<th>Rating</th><th>Submitted</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6" class="table-empty">' + empty + '</td></tr>') + '</tbody></table></div></section>';
}

function renderAnalytics(query) {
    const state = adminData.analytics;
    const disabled = !state?.value || state.busy ? " disabled" : "";
    const heading = pageHeading("Analytics & Reports", "Track question volume, answer coverage, and recurring questions.",
        '<div class="heading-actions">' + periodSelect() +
        '<button class="button" type="button" data-action="refresh-admin-data"' + disabled + '>Refresh</button>' +
        '<button class="button button-primary" type="button" data-action="export-report"' + disabled + '>Export report</button></div>');
    const notice = dataNotice("analytics");
    if (!state?.value) return heading + notice;
    const { daily, totals, top_questions: questions } = state.value;
    const coverage = totals.questions ? Math.round(totals.answered * 100 / totals.questions) + "%" : "—";
    const cards = [["Questions", numberText(totals.questions)], ["Conversations", numberText(totals.sessions)], ["Answer coverage", coverage]];
    return heading + notice + '<p class="analytics-caption">All-time totals</p><div class="analytics-kpis">' +
        cards.map(([label, value]) => '<article class="analytics-kpi"><span>' + label + '</span><strong>' + value + '</strong></article>').join("") +
        '</div><div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Questions by day</h2><p>Last ' +
        analyticsDays + ' days · UTC</p></div></div><div class="chart-wrap">' + renderChart(daily) +
        '</div></section><section class="panel"><div class="panel-heading"><div><h2>Common questions</h2><p>Count in the selected period</p></div></div>' +
        renderTopQuestions(questions, query) + '</section></div>';
}

function loadSettings() {
    return Object.assign({ notifications: true }, readStoredJSON(SETTINGS_STORAGE_KEY, {}));
}

function updateNotificationIndicator(settings) {
    document.querySelector(".notification-indicator").hidden = !settings.notifications || !pendingFeedback;
    const message = document.getElementById("notificationMessage");
    message.textContent = pendingFeedback === null ? "Feedback status is unavailable." : (pendingFeedback
        ? numberText(pendingFeedback) + " awaiting review." : "No feedback awaiting review.");
}

function renderSettings() {
    const settings = loadSettings();
    return pageHeading("System Settings", "Adjust admin preferences for this browser.") +
        '<section class="panel"><div class="panel-heading"><h2>Notifications</h2></div>' +
        '<div class="toggle-row"><span class="toggle-copy"><strong>Pending feedback indicator</strong>' +
        '<small>Show a dot in the toolbar when feedback is awaiting review.</small></span>' +
        '<label class="switch"><input type="checkbox" data-setting="notifications" aria-label="Pending feedback indicator"' +
        (settings.notifications ? " checked" : "") + '><span class="switch-track"></span></label></div></section>';
}

function renderCurrentView() {
    if (!adminSession) return;
    const query = globalSearch.value.trim().toLowerCase();
    const renderers = {
        overview: renderOverview,
        users: renderUsers,
        documents: renderDocuments,
        feedback: renderFeedback,
        analytics: renderAnalytics,
        settings: renderSettings
    };
    currentSection.textContent = viewTitles[activeView];
    pageContent.innerHTML = renderers[activeView](query);
    document.querySelectorAll(".admin-nav [data-view]").forEach(function(button) {
        const isActive = button.dataset.view === activeView;
        button.classList.toggle("is-active", isActive);
        if (isActive) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
}

function refreshActiveView() {
    if (activeView === "documents") return refreshDocuments();
    const key = analyticsView(activeView) ? "analytics" : activeView;
    if (ADMIN_RESOURCES[key]) return refreshAdminData(key);
}

function setView(view) {
    if (!viewTitles[view]) return;
    activeView = view;
    globalSearch.value = "";
    renderCurrentView();
    refreshActiveView();
    adminShell.classList.remove("mobile-nav-open");
    document.getElementById("mobileMenuButton").setAttribute("aria-expanded", "false");
    pageContent.focus({ preventScroll: true });
}

function showUserForm(user = null) {
    const username = escapeHTML(user?.username || "");
    const role = user?.role || "staff";
    dialogContent.innerHTML = '<div class="dialog-top"><h2 id="dialogTitle">' + (user ? "Edit account" : "New account") +
        '</h2><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close dialog">×</button></div>' +
        '<form method="post" id="userForm" data-user-id="' + escapeHTML(user?.id || "") + '">' +
        '<div class="admin-field"><label for="userUsername">Username</label><input id="userUsername" name="username" value="' +
        username + '" autocomplete="username" maxlength="64"' + (user ? " readonly" : " required") + '></div>' +
        '<div class="admin-field"><label for="userEmail">Email</label><input id="userEmail" name="email" type="email" value="' +
        escapeHTML(user?.email || "") + '" autocomplete="email" maxlength="254" required></div>' +
        '<div class="admin-field"><label for="userRole">Role</label><select id="userRole" name="role">' +
        '<option value="staff"' + (role === "staff" ? " selected" : "") + '>Staff</option><option value="admin"' +
        (role === "admin" ? " selected" : "") + '>Administrator</option></select></div>' +
        '<div class="admin-field"><label for="userPassword">' + (user ? "New password (optional)" : "Password") +
        '</label><input id="userPassword" name="password" type="password" autocomplete="new-password"' +
        (user ? "" : " required") + '></div>' +
        '<label class="account-active"><input type="checkbox" id="userActive" name="is_active"' +
        (!user || user.is_active ? " checked" : "") + '>Active account</label>' +
        '<p class="form-error" role="alert" hidden></p><div class="heading-actions">' +
        '<button class="button button-primary" type="submit">' + (user ? "Save changes" : "Create account") + '</button>' +
        '<button class="button" type="button" data-action="close-dialog">Cancel</button></div></form>';
    dialog.showModal();
}

async function submitUserForm(event) {
    event.preventDefault();
    const form = event.target;
    const submit = form.querySelector('button[type="submit"]');
    if (submit.disabled) return;
    const message = form.querySelector(".form-error");
    const id = Number(form.dataset.userId);
    const fields = {
        email: form.elements.email.value.trim(),
        role: form.elements.role.value,
        is_active: form.elements.is_active.checked
    };
    if (!id) fields.username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    if (password || !id) fields.password = password;
    const previous = adminData.users?.value?.find(user => user.id === id);
    if (previous) {
        for (const key of Object.keys(fields)) {
            if (fields[key] === previous[key]) delete fields[key];
        }
    }
    if (!Object.keys(fields).length) {
        dialog.close();
        return;
    }

    submit.disabled = true;
    setFormMessage(message, "");
    try {
        if (await saveAdminRecord("users", id, fields)) {
            if (id === adminSession?.profile.id && (fields.role === "staff" || fields.is_active === false)) {
                signOut("Account updated. Administrator access is required to sign in here.");
                return;
            }
            if (form.isConnected && dialog.open) dialog.close();
            showToast(id ? "Account updated." : "Account created.");
        }
    } catch (error) {
        setFormMessage(message, error.message);
    } finally {
        submit.disabled = false;
    }
}

function showDocumentForm(item = null) {
    const heading = item ? "Edit document" : "Upload document";
    const documentId = item ? escapeHTML(item.id) : "";
    dialogContent.innerHTML = '<div class="dialog-top"><h2 id="dialogTitle">' + heading +
        '</h2><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close dialog">×</button></div>' +
        '<form method="post" id="documentForm" data-document-id="' + documentId + '">' +
        '<div class="admin-field"><label for="documentTitle">Title</label><input id="documentTitle" name="title" value="' +
        escapeHTML(item?.title ?? "") + '" required></div>' +
        '<div class="admin-field"><label for="documentCategory">Category</label><select id="documentCategory" name="category">' +
        categoryOptions(item?.category) + '</select></div>' +
        '<div class="admin-field"><label for="documentDescription">Description</label><textarea id="documentDescription" name="description" rows="3">' +
        escapeHTML(item?.description ?? "") + '</textarea></div>' +
        (item ? "" : '<div class="admin-field"><label for="documentUpload">File (PDF, DOC, DOCX, or TXT)</label>' +
        '<input id="documentUpload" name="file" type="file" accept=".pdf,.doc,.docx,.txt" required></div>') +
        '<p class="form-error" role="alert" hidden></p><div class="heading-actions">' +
        '<button class="button button-primary" type="submit">' + (item ? "Save changes" : "Upload") + '</button>' +
        '<button class="button" type="button" data-action="close-dialog">Cancel</button></div></form>';
    dialog.showModal();
}

function showDocumentDeleteForm(item) {
    dialogContent.innerHTML = '<div class="dialog-top"><h2 id="dialogTitle">Delete document?</h2>' +
        '<button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close dialog">×</button></div>' +
        '<p><strong>' + escapeHTML(item.title) + '</strong> will be removed from the active documents.</p>' +
        '<form method="post" id="documentDeleteForm" data-document-id="' + escapeHTML(item.id) + '">' +
        '<p class="form-error" role="alert" hidden></p><div class="heading-actions">' +
        '<button class="button button-danger" type="submit">Delete document</button>' +
        '<button class="button" type="button" data-action="close-dialog" autofocus>Cancel</button></div></form>';
    dialog.showModal();
}

async function submitDocumentForm(event) {
    event.preventDefault();
    const form = event.target;
    const id = form.dataset.documentId;
    const message = form.querySelector(".form-error");
    const submit = form.querySelector('button[type="submit"]');
    setFormMessage(message, "");

    let path = DOCUMENTS_URL;
    let options;
    let successMessage;
    if (form.id === "documentDeleteForm") {
        path += id;
        options = { method: "DELETE" };
        successMessage = "Document deleted.";
    } else {
        const title = form.elements.title.value.trim();
        if (!title) {
            setFormMessage(message, "Enter a document title.");
            form.elements.title.focus();
            return;
        }
        if (id) {
            path += id;
            options = documentUpdate({
                title,
                category: form.elements.category.value || null,
                description: form.elements.description.value.trim() || null
            });
            successMessage = "Document updated.";
        } else {
            const body = new FormData(form);
            body.set("title", title);
            options = { method: "POST", body };
            successMessage = "Document uploaded.";
        }
    }

    submit.disabled = true;
    try {
        if (await changeDocument(path, options)) {
            if (form.isConnected && dialog.open) dialog.close();
            showToast(successMessage);
        }
    } catch (error) {
        if (form.isConnected && dialog.open) setFormMessage(message, error.message);
        else showToast(error.message);
    } finally {
        submit.disabled = false;
    }
}

function documentUpdate(fields) {
    return jsonRequest("PUT", fields);
}

function exportCSV(filename, rows) {
    const csv = rows.map(function(row) {
        return row.map(function(value) {
            const cell = String(value ?? "");
            const safe = /^[\t\r\n]|^\s*[=+\-@]/.test(cell) ? "'" + cell : cell;
            return '"' + safe.replace(/"/g, '""') + '"';
        }).join(",");
    }).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("CSV report downloaded.");
}

loginForm.addEventListener("submit", signIn);
document.getElementById("adminSignOut").addEventListener("click", () => signOut());

document.querySelector(".admin-nav").addEventListener("click", function(event) {
    const button = event.target.closest("[data-view]");
    if (button) setView(button.dataset.view);
});

document.getElementById("collapseSidebar").addEventListener("click", function() {
    const collapsed = adminShell.classList.toggle("sidebar-collapsed");
    this.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    this.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
});

document.getElementById("mobileMenuButton").addEventListener("click", function() {
    const open = adminShell.classList.toggle("mobile-nav-open");
    this.setAttribute("aria-expanded", String(open));
});

document.getElementById("sidebarScrim").addEventListener("click", function() {
    adminShell.classList.remove("mobile-nav-open");
    document.getElementById("mobileMenuButton").setAttribute("aria-expanded", "false");
});

globalSearch.addEventListener("input", renderCurrentView);

document.getElementById("notificationButton").addEventListener("click", function(event) {
    event.stopPropagation();
    const popover = document.getElementById("notificationPopover");
    const open = popover.hidden;
    popover.hidden = !open;
    this.setAttribute("aria-expanded", String(open));
    if (open) refreshAdminData("analytics");
});

document.getElementById("notificationFeedback").addEventListener("click", function() {
    document.getElementById("notificationPopover").hidden = true;
    document.getElementById("notificationButton").setAttribute("aria-expanded", "false");
    setView("feedback");
});

document.addEventListener("click", function(event) {
    const popover = document.getElementById("notificationPopover");
    if (!popover.hidden && !popover.contains(event.target) && !event.target.closest("#notificationButton")) {
        popover.hidden = true;
        document.getElementById("notificationButton").setAttribute("aria-expanded", "false");
    }
});

pageContent.addEventListener("click", async function(event) {
    const goView = event.target.closest("[data-go-view]");
    if (goView) return setView(goView.dataset.goView);

    const editUser = event.target.closest("[data-edit-user]");
    if (editUser) {
        const user = adminData.users?.value?.find(item => item.id === Number(editUser.dataset.editUser));
        if (user) showUserForm(user);
        return;
    }

    const editButton = event.target.closest("[data-edit-document]");
    if (editButton) {
        const item = documentRecords.find(record => record.id === Number(editButton.dataset.editDocument));
        if (item) showDocumentForm(item);
        return;
    }

    const deleteButton = event.target.closest("[data-delete-document]");
    if (deleteButton) {
        const item = documentRecords.find(record => record.id === Number(deleteButton.dataset.deleteDocument));
        if (item) showDocumentDeleteForm(item);
        return;
    }

    const reviewButton = event.target.closest("[data-review-feedback]");
    if (reviewButton) {
        const feedback = adminData.feedback?.value?.find(item => item.id === Number(reviewButton.dataset.reviewFeedback));
        if (!feedback) return;
        const reviewed = !feedback.reviewed_at;
        try {
            if (await saveAdminRecord("feedback", feedback.id, { reviewed })) {
                showToast(reviewed ? "Feedback marked as reviewed." : "Feedback reopened.");
            }
        } catch (error) {
            showToast(error.message);
        }
        return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;
    if (action.dataset.action === "show-upload") showDocumentForm();
    if (action.dataset.action === "show-user-form") showUserForm();
    if (["refresh-documents", "refresh-admin-data"].includes(action.dataset.action)) refreshActiveView();
    if (action.dataset.action === "export-users") {
        const rows = adminData.users.value.map(user => [user.username, user.email, user.role, user.is_active, user.created_at]);
        exportCSV("unilia-users.csv", [["Username", "Email", "Role", "Active", "Created"], ...rows]);
    }
    if (action.dataset.action === "export-report") {
        const rows = adminData.analytics.value.daily.map(day => [day.date, day.questions, day.answered]);
        exportCSV("unilia-question-analytics.csv", [["Date (UTC)", "Questions", "Answered"], ...rows]);
    }
    if (action.dataset.action === "export-feedback") {
        const rows = adminData.feedback.value.map(item => [item.question, item.rating, item.comment, item.created_at, item.reviewed_at]);
        exportCSV("unilia-feedback.csv", [["Question", "Rating", "Comment", "Submitted", "Reviewed"], ...rows]);
    }
});

pageContent.addEventListener("change", async function(event) {
    const categorySelect = event.target.closest("[data-category-id]");
    if (categorySelect) {
        const path = DOCUMENTS_URL + Number(categorySelect.dataset.categoryId);
        const options = documentUpdate({ category: categorySelect.value || null });
        try {
            if (await changeDocument(path, options)) showToast("Document category updated.");
        } catch (error) {
            showToast(error.message);
        }
        return;
    }

    const setting = event.target.closest("[data-setting]");
    if (setting) {
        const settings = loadSettings();
        settings[setting.dataset.setting] = setting.checked;
        if (saveStoredJSON(SETTINGS_STORAGE_KEY, settings)) {
            updateNotificationIndicator(settings);
            showToast("Notification preference saved.");
        } else {
            renderCurrentView();
        }
    }

    const period = event.target.closest("#analyticsPeriod");
    if (period) {
        analyticsDays = Number(period.value);
        refreshAdminData("analytics");
        pageContent.querySelector("#analyticsPeriod")?.focus();
    }
});

dialog.addEventListener("submit", function(event) {
    if (event.target.id === "userForm") return submitUserForm(event);
    return submitDocumentForm(event);
});
dialog.addEventListener("close", function() {
    if (!dialog.open) dialogContent.replaceChildren();
});
dialog.addEventListener("click", function(event) {
    if (event.target.closest('[data-action="close-dialog"]')) {
        dialog.close();
        return;
    }
    if (event.target === dialog) dialog.close();
});

document.addEventListener("keydown", function(event) {
    if (adminSession && event.key === "/" && !event.ctrlKey && !event.metaKey && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        globalSearch.focus();
    }
    if (event.key === "Escape") {
        adminShell.classList.remove("mobile-nav-open");
        document.getElementById("mobileMenuButton").setAttribute("aria-expanded", "false");
    }
});

updateNotificationIndicator(loadSettings());
restoreAdminSession();
