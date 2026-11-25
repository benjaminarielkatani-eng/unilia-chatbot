"use strict";

const ADMIN_STORAGE_KEY = "uniliaAdminDocumentMetadata";
const SETTINGS_STORAGE_KEY = "uniliaAdminDemoSettings";

const sampleUsers = [
    { name: "Chisomo Banda", email: "chisomo.banda@student.unilia.ac.mw", role: "Student", status: "Active", joined: "2026-10-12", questions: 38, course: "Education" },
    { name: "Thoko Phiri", email: "thoko.phiri@student.unilia.ac.mw", role: "Student", status: "Active", joined: "2026-10-10", questions: 24, course: "Theology" },
    { name: "Peter Mbewe", email: "peter.mbewe@student.unilia.ac.mw", role: "Student", status: "Active", joined: "2026-10-08", questions: 19, course: "Business" },
    { name: "Memory Zulu", email: "memory.zulu@student.unilia.ac.mw", role: "Student", status: "Inactive", joined: "2026-09-28", questions: 7, course: "Education" },
    { name: "Grace Nkhoma", email: "grace.nkhoma@student.unilia.ac.mw", role: "Staff", status: "Active", joined: "2026-09-20", questions: 46, course: "Administration" },
    { name: "Yamikani Chirwa", email: "yamikani.chirwa@student.unilia.ac.mw", role: "Student", status: "Active", joined: "2026-09-14", questions: 12, course: "Information Systems" }
];

const sampleDocuments = [
    { id: "sample-1", name: "Undergraduate Prospectus 2026.pdf", category: "Admissions", type: "PDF", size: "4.2 MB", uploaded: "2026-10-18" },
    { id: "sample-2", name: "Academic Calendar 2026.docx", category: "Academic", type: "DOCX", size: "284 KB", uploaded: "2026-10-15" },
    { id: "sample-3", name: "Tuition and Fees Guide.pdf", category: "Finance", type: "PDF", size: "1.1 MB", uploaded: "2026-10-11" },
    { id: "sample-4", name: "Student Handbook 2026.pdf", category: "Student Life", type: "PDF", size: "2.8 MB", uploaded: "2026-10-05" },
    { id: "sample-5", name: "ICT Support Contacts.txt", category: "Support", type: "TXT", size: "8 KB", uploaded: "2026-09-29" }
];

const sampleFeedback = [
    { id: "feedback-1", name: "Chisomo Banda", text: "The admissions guidance was clear and helped me find the right application form.", rating: 5, date: "2026-10-19", status: "New" },
    { id: "feedback-2", name: "Thoko Phiri", text: "Could you include more information about scholarship application deadlines?", rating: 4, date: "2026-10-18", status: "New" },
    { id: "feedback-3", name: "Peter Mbewe", text: "The academic calendar answer was useful. A downloadable version would be helpful.", rating: 5, date: "2026-10-16", status: "Reviewed" },
    { id: "feedback-4", name: "Memory Zulu", text: "I was not sure which office to contact about updating my details.", rating: 3, date: "2026-10-13", status: "Reviewed" }
];

const sampleActivity = [
    { icon: "Q", title: "Questions answered", detail: "Sample activity from the demo dashboard", time: "12 min ago" },
    { icon: "D", title: "Academic Calendar 2026.docx", detail: "Sample document activity", time: "1 hr ago" },
    { icon: "F", title: "New student feedback received", detail: "Sample feedback activity", time: "3 hrs ago" },
    { icon: "U", title: "New student account created", detail: "Sample user activity", time: "Yesterday" }
];

const viewTitles = {
    overview: "Dashboard Overview",
    users: "User Management",
    documents: "Document Management",
    feedback: "Feedback & Reviews",
    analytics: "Analytics & Reports",
    settings: "System Settings"
};

const adminShell = document.getElementById("adminShell");
const pageContent = document.getElementById("pageContent");
const globalSearch = document.getElementById("globalSearch");
const currentSection = document.getElementById("currentSection");
const dialog = document.getElementById("detailDialog");
const dialogContent = document.getElementById("dialogContent");
const toastRegion = document.getElementById("toastRegion");
let activeView = "overview";
let feedbackStatuses = Object.fromEntries(sampleFeedback.map(function(item) { return [item.id, item.status]; }));
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
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn("Admin demo data could not be read from local storage:", error);
        return fallback;
    }
}

function saveStoredJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error("Could not save admin demo data in this browser:", error);
        showToast("Changes could not be saved in this browser. Check available storage.");
        return false;
    }
}

function loadDocuments() {
    const uploaded = readStoredJSON(ADMIN_STORAGE_KEY, []);
    return sampleDocuments.concat(Array.isArray(uploaded) ? uploaded : []);
}

function loadDocumentCategories() {
    return readStoredJSON(ADMIN_STORAGE_KEY + "-categories", {});
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
        '</strong><span class="stat-support"><span class="stat-change">' + escapeHTML(note) +
        '</span><span class="stat-sample">Sample data</span></span></span>' +
        '<span class="stat-icon">' + iconSVG(icon) + "</span></button>";
}

function renderChart() {
    return '<svg class="chart-svg" viewBox="0 0 650 220" role="img" aria-label="Sample AI question usage trend over the last seven months">' +
        '<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#3B82F6" stop-opacity=".20"/><stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/></linearGradient></defs>' +
        '<line class="chart-gridline" x1="44" y1="25" x2="635" y2="25"/><line class="chart-gridline" x1="44" y1="75" x2="635" y2="75"/><line class="chart-gridline" x1="44" y1="125" x2="635" y2="125"/><line class="chart-gridline" x1="44" y1="175" x2="635" y2="175"/>' +
        '<text class="chart-axis-label" x="4" y="29">2.0k</text><text class="chart-axis-label" x="4" y="79">1.5k</text><text class="chart-axis-label" x="4" y="129">1.0k</text><text class="chart-axis-label" x="4" y="179">0.5k</text>' +
        '<path class="chart-area" d="M50 154 L145 137 L240 145 L335 100 L430 113 L525 67 L625 43 L625 185 L50 185 Z"/>' +
        '<path class="chart-line" d="M50 154 L145 137 L240 145 L335 100 L430 113 L525 67 L625 43"/>' +
        '<circle class="chart-dot" cx="50" cy="154" r="4"/><circle class="chart-dot" cx="145" cy="137" r="4"/><circle class="chart-dot" cx="240" cy="145" r="4"/><circle class="chart-dot" cx="335" cy="100" r="4"/><circle class="chart-dot" cx="430" cy="113" r="4"/><circle class="chart-dot" cx="525" cy="67" r="4"/><circle class="chart-dot" cx="625" cy="43" r="4"/>' +
        '<text class="chart-axis-label" x="42" y="207">May</text><text class="chart-axis-label" x="136" y="207">Jun</text><text class="chart-axis-label" x="231" y="207">Jul</text><text class="chart-axis-label" x="326" y="207">Aug</text><text class="chart-axis-label" x="421" y="207">Sep</text><text class="chart-axis-label" x="516" y="207">Oct</text><text class="chart-axis-label" x="612" y="207">Nov</text></svg>';
}

function renderActivity(query) {
    const filtered = sampleActivity.filter(function(item) {
        return (item.title + " " + item.detail).toLowerCase().includes(query);
    });
    if (!filtered.length) return '<div class="table-empty"><strong>No matching activity</strong><p>Try a different search.</p></div>';
    return '<div class="activity-list">' + filtered.map(function(item) {
        return '<div class="activity-item"><span class="activity-icon">' + escapeHTML(item.icon) +
            '</span><span class="activity-copy"><strong>' + escapeHTML(item.title) + '</strong><small>' +
            escapeHTML(item.detail) + '</small></span><span class="activity-time">' + escapeHTML(item.time) + "</span></div>";
    }).join("") + "</div>";
}

function renderOverview(query) {
    return pageHeading("Welcome back, Administrator", "Here’s a snapshot of the UNILIA AI student assistant.", '<span class="sample-pill">Sample dashboard data</span>') +
        '<section class="stats-grid" aria-label="Sample statistics">' +
        statCard("Total users", "1,284", "+8.2% this month", "users", "users") +
        statCard("Questions asked", "8,492", "+12.5% this month", "questions", "analytics") +
        statCard("Documents", String(loadDocuments().length + 119), "Knowledge base items", "documents", "documents") +
        statCard("Feedback received", "387", "4.6 / 5 average rating", "feedback", "feedback") +
        '</section><div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>AI Usage Analytics</h2><p>Questions submitted · last 7 months · sample data</p></div><select class="select-small" aria-label="Analytics period"><option>Last 7 months</option><option>Last 30 days</option><option>Last 12 months</option></select></div><div class="chart-wrap">' +
        renderChart() + '</div></section><section class="panel"><div class="panel-heading"><div><h2>Recent Activity</h2><p>Illustrative system activity</p></div></div>' +
        renderActivity(query) + '</section></div><div class="dashboard-lower"><section class="panel"><div class="panel-heading"><div><h3>Frequently Asked Questions</h3><p>Example topics from student enquiries</p></div></div><div class="faq-list">' +
        '<details><summary>What are the admission requirements?</summary><p>Students commonly ask about entry requirements, application steps, and required documents.</p></details><details><summary>Where can I find the academic calendar?</summary><p>Calendar and semester date questions are among the most frequent sample topics.</p></details><details><summary>How do I pay university fees?</summary><p>Fee schedules and payment guidance make up another common sample topic.</p></details></div></section>' +
        '<section class="panel"><div class="panel-heading"><div><h3>Feedback Overview</h3><p>Illustrative student ratings</p></div></div><div class="feedback-summary"><p class="rating-number">4.6</p><div class="rating-stars" aria-label="4.6 out of 5 stars">★★★★★</div><span class="rating-caption">Average rating · 387 sample responses</span></div><div class="rating-bars">' +
        '<div class="rating-row"><span>5 stars</span><span class="rating-track"><i class="rating-fill" style="display:block;width:76%"></i></span><span>76%</span></div><div class="rating-row"><span>4 stars</span><span class="rating-track"><i class="rating-fill" style="display:block;width:16%"></i></span><span>16%</span></div><div class="rating-row"><span>3 stars</span><span class="rating-track"><i class="rating-fill" style="display:block;width:6%"></i></span><span>6%</span></div></div></section>' +
        '<section class="panel"><div class="panel-heading"><div><h3>System Status</h3><p>Frontend demonstration</p></div></div><div class="activity-list"><div class="activity-item"><span class="activity-icon">UI</span><span class="activity-copy"><strong>Dashboard interface</strong><small>Running locally in your browser</small></span><span class="status-pill info">Demo</span></div><div class="activity-item"><span class="activity-icon">AI</span><span class="activity-copy"><strong>AI backend</strong><small>No backend configured</small></span><span class="status-pill pending">Unlinked</span></div></div></section></div>';
}

function renderUsers(query) {
    const users = sampleUsers.filter(function(user) {
        return (user.name + " " + user.email + " " + user.role + " " + user.course).toLowerCase().includes(query);
    });
    const rows = users.map(function(user) {
        return '<tr><td><div class="person-cell"><span class="person-avatar">' + escapeHTML(user.name.split(" ").map(function(part) { return part[0]; }).join("")) +
            '</span><span><strong>' + escapeHTML(user.name) + '</strong><small>' + escapeHTML(user.email) +
            '</small></span></div></td><td>' + escapeHTML(user.role) + '</td><td>' + escapeHTML(user.course) +
            '</td><td><span class="status-pill ' + (user.status === "Inactive" ? "inactive" : "") + '">' + escapeHTML(user.status) +
            '</span></td><td>' + escapeHTML(user.joined) + '</td><td>' + escapeHTML(String(user.questions)) +
            '</td><td><button class="row-action" type="button" data-user="' + escapeHTML(user.email) + '">View details</button></td></tr>';
    }).join("");
    return pageHeading("User Management", "Browse example student and staff accounts. No real user directory is connected.", '<span class="sample-pill">Sample users</span>') +
        '<section class="table-card"><div class="table-toolbar"><p>' + users.length + ' of ' + sampleUsers.length + ' sample users</p><button class="button" type="button" data-action="export-users">Export sample list</button></div><div class="table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Faculty / course</th><th>Status</th><th>Joined</th><th>Questions</th><th>Details</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="7"><div class="table-empty"><strong>No matching users</strong><p>Try another name, email, or course.</p></div></td></tr>') + '</tbody></table></div></section>';
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function renderDocuments(query) {
    const categoryOverrides = loadDocumentCategories();
    const documents = loadDocuments().map(function(document) {
        return Object.assign({}, document, { category: categoryOverrides[document.id] || document.category });
    }).filter(function(document) {
        return (document.name + " " + document.category + " " + document.type).toLowerCase().includes(query);
    });
    const rows = documents.map(function(document) {
        const typeClass = document.type === "TXT" ? "txt" : (document.type === "DOC" || document.type === "DOCX" ? "doc" : "");
        const categories = ["Admissions", "Academic", "Finance", "Student Life", "Support", "Other"];
        return '<tr><td><div class="file-cell"><span class="file-type ' + typeClass + '">' + escapeHTML(document.type) +
            '</span><span><strong>' + escapeHTML(document.name) + '</strong><small>' + escapeHTML(document.size) + '</small></span></div></td><td><select class="category-select" data-category-id="' +
            escapeHTML(document.id) + '" aria-label="Category for ' + escapeHTML(document.name) + '">' + categories.map(function(category) {
                return '<option' + (document.category === category ? " selected" : "") + '>' + escapeHTML(category) + "</option>";
            }).join("") + '</select></td><td>' + escapeHTML(document.type) + '</td><td>' + escapeHTML(document.uploaded) +
            '</td><td><div class="row-actions">' + (document.local ? '<span class="status-pill info">Local metadata</span>' : '<span class="status-pill">Sample</span>') +
            '<button class="row-action danger" type="button" data-delete-document="' + escapeHTML(document.id) + '">Delete</button></div></td></tr>';
    }).join("");
    return pageHeading("Document Management", "Review example knowledge-base documents and manage browser-local upload metadata.", '<span class="sample-pill">Demo only · no server storage</span>') +
        '<section class="upload-zone"><div class="upload-copy"><span class="upload-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/></svg></span><span><strong>Upload a university document</strong><small>PDF, DOC, DOCX, or TXT · only the filename and metadata are retained locally</small></span></div><label class="button button-primary" for="documentUpload">Choose file<input id="documentUpload" type="file" accept=".pdf,.doc,.docx,.txt" hidden></label></section>' +
        '<section class="table-card"><div class="table-toolbar"><p>' + documents.length + ' documents in this view · sample documents are illustrative</p><button class="button" type="button" data-action="clear-uploads">Remove local demo uploads</button></div><div class="table-scroll"><table><thead><tr><th>Document</th><th>Category</th><th>File type</th><th>Upload date</th><th>Actions</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5"><div class="table-empty"><strong>No matching documents</strong><p>Try another search or choose a document to add demo metadata.</p></div></td></tr>') + '</tbody></table></div></section>' +
        '<p class="muted-note">Files are not uploaded to a server, analyzed by AI, or retained as file contents. This demo stores only selected-file metadata in this browser.</p>';
}

function renderFeedback(query) {
    const items = sampleFeedback.filter(function(item) {
        return (item.name + " " + item.text + " " + item.status).toLowerCase().includes(query);
    });
    const rows = items.map(function(item) {
        const status = feedbackStatuses[item.id] || item.status;
        return '<tr><td><strong>' + escapeHTML(item.name) + '</strong></td><td class="feedback-text" title="' +
            escapeHTML(item.text) + '">' + escapeHTML(item.text) + '</td><td><span class="stars" aria-label="' + item.rating + ' out of 5 stars">' +
            "★".repeat(item.rating) + "☆".repeat(5 - item.rating) + '</span></td><td>' + escapeHTML(item.date) +
            '</td><td><span class="status-pill ' + (status === "New" ? "pending" : "") + '">' + escapeHTML(status) +
            '</span></td><td>' + (status === "New" ? '<button class="row-action" type="button" data-review-feedback="' + item.id + '">Mark reviewed</button>' : '<span class="activity-time">Complete</span>') +
            '</td></tr>';
    }).join("");
    return pageHeading("Feedback & Reviews", "Review sample student ratings and suggestions. Feedback is illustrative and not connected to a live service.", '<span class="sample-pill">Sample feedback</span>') +
        '<section class="stats-grid"><article class="stat-card"><span><span class="stat-label">Average rating</span><strong class="stat-value">4.6 / 5</strong><span class="stat-change">Sample responses</span></span><span class="stat-icon">' + iconSVG("feedback") + '</span></article><article class="stat-card"><span><span class="stat-label">Awaiting review</span><strong class="stat-value">' + Object.values(feedbackStatuses).filter(function(status) { return status === "New"; }).length + '</strong><span class="stat-change">Local demo state</span></span><span class="stat-icon">' + iconSVG("questions") + '</span></article></section>' +
        '<section class="table-card"><div class="table-toolbar"><p>Student suggestions and ratings</p><span class="sample-pill">Example data only</span></div><div class="table-scroll"><table><thead><tr><th>Student</th><th>Suggestion</th><th>Rating</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="6"><div class="table-empty"><strong>No matching feedback</strong><p>Try another search.</p></div></td></tr>') + '</tbody></table></div></section>';
}

function renderAnalytics() {
    const heights = [42, 55, 48, 69, 61, 78, 70, 91, 83, 100, 89, 112];
    const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    return pageHeading("Analytics & Reports", "Illustrative usage trends and frequently asked topics. No live analytics source is connected.", '<button class="button button-primary" type="button" data-action="export-report"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/></svg>Export sample report</button>') +
        '<div class="analytics-kpis"><article class="analytics-kpi"><span>Total questions · sample</span><strong>8,492</strong></article><article class="analytics-kpi"><span>Avg. questions per day · sample</span><strong>283</strong></article><article class="analytics-kpi"><span>Top category · sample</span><strong>Admissions</strong></article></div>' +
        '<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>AI usage trends</h2><p>Example monthly question volume</p></div><span class="sample-pill">Sample data</span></div><div class="bar-chart" role="img" aria-label="Sample monthly usage chart">' +
        heights.map(function(height, index) { return '<span class="bar-column"><i style="height:' + height + 'px"></i><span>' + months[index] + '</span></span>'; }).join("") +
        '</div></section><section class="panel"><div class="panel-heading"><div><h2>Most asked topics</h2><p>Illustrative distribution</p></div></div><div class="funnel-list"><div class="funnel-row"><span>Admissions</span><span class="funnel-track"><i style="width:82%"></i></span><strong>32%</strong></div><div class="funnel-row"><span>Fees &amp; payments</span><span class="funnel-track"><i style="width:65%"></i></span><strong>25%</strong></div><div class="funnel-row"><span>Academic calendar</span><span class="funnel-track"><i style="width:48%"></i></span><strong>19%</strong></div><div class="funnel-row"><span>Programmes</span><span class="funnel-track"><i style="width:39%"></i></span><strong>15%</strong></div><div class="funnel-row"><span>Other</span><span class="funnel-track"><i style="width:24%"></i></span><strong>9%</strong></div></div></section></div>' +
        '<section class="panel"><div class="panel-heading"><div><h2>Frequently asked questions</h2><p>Sample question themes · backend analytics can replace this data later</p></div></div><div class="faq-list"><details><summary>What are the admission requirements?</summary><p>Admissions, application requirements, and entry pathways.</p></details><details><summary>How do I apply for a programme?</summary><p>Programme selection, application forms, and submission dates.</p></details><details><summary>Where can I find the academic calendar?</summary><p>Semester dates, registration periods, and examination schedules.</p></details></div></section>';
}

function loadSettings() {
    return Object.assign({ notifications: true, showSuggestions: true, compactMessages: false, botName: "UNILIA AI Student Assistant", responseTone: "Helpful and professional" }, readStoredJSON(SETTINGS_STORAGE_KEY, {}));
}

function renderSettings() {
    const settings = loadSettings();
    function toggleRow(key, title, description) {
        return '<div class="toggle-row"><span class="toggle-copy"><strong>' + title + '</strong><small>' + description +
            '</small></span><label class="switch"><input type="checkbox" data-setting="' + key + '"' + (settings[key] ? " checked" : "") +
            '><span class="switch-track"></span></label></div>';
    }
    return pageHeading("System Settings", "Adjust local interface preferences. These settings are a browser-only demonstration.", '<span class="sample-pill">No backend connected</span>') +
        '<section class="panel"><div class="panel-heading"><div><h2>Chatbot configuration</h2><p>Demo values only · does not configure an AI model</p></div></div><div class="setting-field"><label for="botName">Assistant display name</label><input id="botName" data-setting-text="botName" value="' + escapeHTML(settings.botName) + '"></div><div class="setting-field"><label for="responseTone">Response tone</label><select id="responseTone" data-setting-text="responseTone"><option' + (settings.responseTone === "Helpful and professional" ? " selected" : "") + '>Helpful and professional</option><option' + (settings.responseTone === "Friendly and concise" ? " selected" : "") + '>Friendly and concise</option><option' + (settings.responseTone === "Formal and academic" ? " selected" : "") + '>Formal and academic</option></select></div></section>' +
        '<section class="panel" style="margin-top:17px"><div class="panel-heading"><div><h2>Interface preferences</h2><p>Saved only in this browser for this demo</p></div></div>' +
        toggleRow("notifications", "Dashboard notifications", "Show the notification indicator in the admin toolbar.") +
        toggleRow("showSuggestions", "Suggested topics", "Keep topic suggestions enabled on the student welcome page. No student page changes are made here.") +
        toggleRow("compactMessages", "Compact admin tables", "Demo preference only; no student chat layout is affected.") +
        '<div class="heading-actions" style="margin-top:17px"><button class="button button-primary" type="button" data-action="save-settings">Save local preferences</button><button class="button" type="button" data-action="reset-settings">Reset demo settings</button></div><p class="muted-note">Authentication, role permissions, database changes, and AI model settings require a backend and are not provided by this frontend.</p></section>';
}

function renderCurrentView() {
    const query = globalSearch.value.trim().toLowerCase();
    const renderers = {
        overview: renderOverview,
        users: renderUsers,
        documents: renderDocuments,
        feedback: renderFeedback
    };
    currentSection.textContent = viewTitles[activeView];
    pageContent.innerHTML = renderers[activeView]
        ? renderers[activeView](query)
        : (activeView === "analytics" ? renderAnalytics() : renderSettings());
    document.querySelectorAll(".admin-nav [data-view]").forEach(function(button) {
        const isActive = button.dataset.view === activeView;
        button.classList.toggle("is-active", isActive);
        if (isActive) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
}

function setView(view) {
    if (!viewTitles[view]) return;
    activeView = view;
    globalSearch.value = "";
    renderCurrentView();
    adminShell.classList.remove("mobile-nav-open");
    document.getElementById("mobileMenuButton").setAttribute("aria-expanded", "false");
    pageContent.focus({ preventScroll: true });
}

function showUserDetails(email) {
    const user = sampleUsers.find(function(item) { return item.email === email; });
    if (!user) return;
    const initials = user.name.split(" ").map(function(part) { return part[0]; }).join("");
    dialogContent.innerHTML = '<div class="dialog-top"><div><p class="eyebrow">SAMPLE USER PROFILE</p><h2 id="dialogTitle">' + escapeHTML(user.name) +
        '</h2><p>' + escapeHTML(user.email) + '</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Close dialog">×</button></div><div class="detail-grid"><div class="detail-item"><span>Role</span><strong>' +
        escapeHTML(user.role) + '</strong></div><div class="detail-item"><span>Status</span><strong>' + escapeHTML(user.status) +
        '</strong></div><div class="detail-item"><span>Faculty / course</span><strong>' + escapeHTML(user.course) +
        '</strong></div><div class="detail-item"><span>Joined</span><strong>' + escapeHTML(user.joined) +
        '</strong></div><div class="detail-item"><span>Questions asked</span><strong>' + escapeHTML(String(user.questions)) +
        '</strong></div><div class="detail-item"><span>Reference</span><strong>' + escapeHTML(initials) + " · sample record</strong></div></div><p class=\"muted-note\">This is illustrative user data. No student records or account actions are connected.</p>";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else showToast("User detail dialog is not supported in this browser.");
}

function exportCSV(filename, rows) {
    const csv = rows.map(function(row) {
        return row.map(function(value) { return '"' + String(value).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Sample CSV report downloaded.");
}

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
});

document.addEventListener("click", function(event) {
    const popover = document.getElementById("notificationPopover");
    if (!popover.hidden && !popover.contains(event.target) && !event.target.closest("#notificationButton")) {
        popover.hidden = true;
        document.getElementById("notificationButton").setAttribute("aria-expanded", "false");
    }
});

pageContent.addEventListener("click", function(event) {
    const goView = event.target.closest("[data-go-view]");
    if (goView) return setView(goView.dataset.goView);

    const userButton = event.target.closest("[data-user]");
    if (userButton) return showUserDetails(userButton.dataset.user);

    const deleteButton = event.target.closest("[data-delete-document]");
    if (deleteButton) {
        const id = deleteButton.dataset.deleteDocument;
        const uploads = readStoredJSON(ADMIN_STORAGE_KEY, []);
        if (id.startsWith("sample-")) {
            showToast("Sample documents are fixed demo records and cannot be deleted.");
            return;
        }
        saveStoredJSON(ADMIN_STORAGE_KEY, uploads.filter(function(item) { return item.id !== id; }));
        renderCurrentView();
        showToast("Local upload metadata removed. No server file was affected.");
        return;
    }

    const reviewButton = event.target.closest("[data-review-feedback]");
    if (reviewButton) {
        feedbackStatuses[reviewButton.dataset.reviewFeedback] = "Reviewed";
        renderCurrentView();
        showToast("Sample feedback marked reviewed for this page session.");
        return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;
    if (action.dataset.action === "close-dialog") dialog.close();
    if (action.dataset.action === "export-users") {
        exportCSV("unilia-sample-users.csv", [["Name", "Email", "Role", "Status", "Course", "Joined", "Questions"]].concat(sampleUsers.map(function(user) {
            return [user.name, user.email, user.role, user.status, user.course, user.joined, user.questions];
        })));
    }
    if (action.dataset.action === "export-report") {
        exportCSV("unilia-sample-analytics.csv", [["Metric", "Value", "Data type"], ["Total questions", 8492, "Sample"], ["Average per day", 283, "Sample"], ["Top category", "Admissions", "Sample"]]);
    }
    if (action.dataset.action === "clear-uploads") {
        saveStoredJSON(ADMIN_STORAGE_KEY, []);
        renderCurrentView();
        showToast("Browser-local upload metadata cleared. Sample records remain.");
    }
    if (action.dataset.action === "save-settings") showToast("Demo preferences are saved automatically in this browser.");
    if (action.dataset.action === "reset-settings") {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        renderCurrentView();
        showToast("Demo preferences reset.");
    }
});

pageContent.addEventListener("change", function(event) {
    const categorySelect = event.target.closest("[data-category-id]");
    if (categorySelect) {
        const categories = loadDocumentCategories();
        categories[categorySelect.dataset.categoryId] = categorySelect.value;
        if (saveStoredJSON(ADMIN_STORAGE_KEY + "-categories", categories)) {
            showToast("Document category updated in browser-local demo metadata.");
        }
    }

    const setting = event.target.closest("[data-setting]");
    if (setting) {
        const settings = loadSettings();
        settings[setting.dataset.setting] = setting.checked;
        saveStoredJSON(SETTINGS_STORAGE_KEY, settings);
        showToast("Demo preference updated locally.");
    }

    const settingText = event.target.closest("[data-setting-text]");
    if (settingText) {
        const settings = loadSettings();
        settings[settingText.dataset.settingText] = settingText.value;
        saveStoredJSON(SETTINGS_STORAGE_KEY, settings);
        showToast("Demo preference updated locally.");
    }

    const period = event.target.closest(".select-small");
    if (period) showToast("Period selection is illustrative; chart data remains sample data.");

    const fileInput = event.target.closest("#documentUpload");
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const extension = file.name.split(".").pop().toUpperCase();
        const type = ["PDF", "DOC", "DOCX", "TXT"].includes(extension) ? extension : "FILE";
        const uploads = readStoredJSON(ADMIN_STORAGE_KEY, []);
        uploads.unshift({
            id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
            name: file.name,
            category: "Other",
            type: type,
            size: formatBytes(file.size),
            uploaded: new Date().toISOString().slice(0, 10),
            local: true
        });
        if (saveStoredJSON(ADMIN_STORAGE_KEY, uploads)) {
            renderCurrentView();
            showToast("File metadata added locally. The file itself was not uploaded or saved.");
        }
    }
});

dialog.addEventListener("click", function(event) {
    if (event.target.closest('[data-action="close-dialog"]')) {
        dialog.close();
        return;
    }
    if (event.target === dialog) dialog.close();
});

document.addEventListener("keydown", function(event) {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        event.preventDefault();
        globalSearch.focus();
    }
    if (event.key === "Escape") {
        adminShell.classList.remove("mobile-nav-open");
        document.getElementById("mobileMenuButton").setAttribute("aria-expanded", "false");
    }
});

renderCurrentView();
