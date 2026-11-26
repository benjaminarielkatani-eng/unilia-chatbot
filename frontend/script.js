"use strict";

const activeChatKey = "uniliaActiveChatId";
const pendingQuestionKey = "uniliaPendingQuestion";

// ── Fix 1: redirect logged-in admin away from landing page ──────────────────
// If the admin token is still valid, skip the landing page and go straight to
// the dashboard. We use replace() so the Back button doesn't loop back here.
(function checkAdminSession() {
    var token;
    try { token = sessionStorage.getItem("uniliaAdminAccessToken"); } catch (e) {}
    if (!token) return;
    // Quick local check: token exists → redirect. The dashboard will verify it
    // with /api/auth/me on load and sign out if it has expired.
    window.location.replace("admin.html");
})();

// ── Fix 1: pageshow handles bfcache (browser back-forward cache) ─────────────
window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        // Page was restored from bfcache — re-run the session check
        var token;
        try { token = sessionStorage.getItem("uniliaAdminAccessToken"); } catch (e) {}
        if (token) window.location.replace("admin.html");
    }
});

function startChat(question) {
    if (!chatStorage.write("sessionStorage", pendingQuestionKey, question)) {
        const status = document.getElementById("topicStatus");
        status.hidden = false;
        status.textContent = "Open Ask UNILIA AI to enter the selected question directly. Browser storage is unavailable.";
        return;
    }

    const chatId = "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const conversations = chatStorage.readConversations();
    conversations.push({
        id: chatId,
        title: question.length > 48 ? question.slice(0, 48) + "..." : question,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    });

    chatStorage.writeConversations(conversations);
    chatStorage.write("localStorage", activeChatKey, chatId);
    window.location.href = "chat.html?chatId=" + encodeURIComponent(chatId);
}

function loadRecentQuestions() {
    const recentQuestionList = document.querySelector(".recent-questions-list");
    const conversations = chatStorage.readConversations();
    chatStorage.migrateLegacyHistory(conversations);
    conversations.sort(function(a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    recentQuestionList.replaceChildren();
    const recentChats = conversations.filter(function(chat) {
        return chat.messages.some(function(item) { return item.role === "student"; });
    }).slice(0, 5);

    if (recentChats.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "recent-question-empty";
        emptyMessage.textContent = "No recent questions yet. Start a conversation with UNILIA AI.";
        recentQuestionList.appendChild(emptyMessage);
        return;
    }

    recentChats.forEach(function(chat) {
        const questionItem = document.createElement("a");
        questionItem.className = "recent-question-item";
        questionItem.href = "chat.html?chatId=" + encodeURIComponent(chat.id);
        const latestStudentMessage = chat.messages.filter(function(item) {
            return item.role === "student";
        }).slice(-1)[0];
        questionItem.textContent = latestStudentMessage.message;
        recentQuestionList.appendChild(questionItem);
    });
}

document.querySelectorAll(".question-card").forEach((card) => {
    card.addEventListener("click", () => startChat(card.dataset.question));
});

const recentQuestionsLink = document.getElementById("recentQuestionsLink");
const recentQuestionsSection = document.getElementById("recent-questions");

recentQuestionsLink.addEventListener("click", function() {
    recentQuestionsSection.hidden = false;
    loadRecentQuestions();
});

function revealRecentQuestionsFromHash() {
    if (window.location.hash === "#recent-questions" && recentQuestionsSection.hidden) {
        recentQuestionsSection.hidden = false;
        loadRecentQuestions();
        recentQuestionsSection.scrollIntoView();
    }
}

window.addEventListener("hashchange", revealRecentQuestionsFromHash);
window.addEventListener("pageshow", function() {
    if (!recentQuestionsSection.hidden) loadRecentQuestions();
});
revealRecentQuestionsFromHash();
