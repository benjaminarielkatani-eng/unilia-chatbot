"use strict";

const activeChatKey = "uniliaActiveChatId";
const pendingQuestionKey = "uniliaPendingQuestion";

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
