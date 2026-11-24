function startChat(question) {
    const chatId = "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const conversations = (() => {
        try {
            return JSON.parse(localStorage.getItem("uniliaConversations") || "[]");
        } catch (error) {
            return [];
        }
    })();

    conversations.push({
        id: chatId,
        title: question.length > 48 ? question.slice(0, 48) + "..." : question,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    });

    localStorage.setItem("uniliaConversations", JSON.stringify(conversations));
    localStorage.setItem("uniliaActiveChatId", chatId);
    sessionStorage.setItem("uniliaPendingQuestion", question);
    window.location.href = "chat.html?chatId=" + encodeURIComponent(chatId);
}

// Display recent conversations
function loadRecentQuestions() {

    const recentQuestionList = document.querySelector(".recent-question-list");

    if (!recentQuestionList) {
        return;
    }

    let conversations = [];
    try {
        conversations = JSON.parse(localStorage.getItem("uniliaConversations") || "[]");
    } catch (error) {
        conversations = [];
    }

    const legacyHistory = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");
    if (legacyHistory.length > 0 && conversations.length === 0) {
        const migratedChat = {
            id: "chat-legacy-" + Date.now(),
            title: legacyHistory.find(function(item) { return item.role === "student"; })?.message || "UNILIA conversation",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: legacyHistory
        };
        conversations = [migratedChat];
        localStorage.setItem("uniliaConversations", JSON.stringify(conversations));
        sessionStorage.removeItem("chatHistory");
    }

    recentQuestionList.innerHTML = "";

    conversations.sort(function(a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    const recentChats = conversations.slice(0, 5);

    if (recentChats.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No recent questions yet. Start a conversation with UNILIA AI.";
        recentQuestionList.appendChild(emptyMessage);
        return;
    }

    recentChats.forEach(function(chat) {
        const questionItem = document.createElement("button");
        questionItem.className = "recent-question";
        questionItem.type = "button";

        const icon = document.createElement("span");
        icon.className = "recent-icon";
        icon.textContent = "💬";

        const questionText = document.createElement("p");
        const latestStudentMessage = chat.messages
            .filter(function(item) { return item.role === "student"; })
            .slice(-1)[0];
        questionText.textContent = latestStudentMessage
            ? latestStudentMessage.message
            : chat.title;

        questionItem.appendChild(icon);
        questionItem.appendChild(questionText);

        questionItem.addEventListener("click", function() {
            localStorage.setItem("uniliaActiveChatId", chat.id);
            window.location.href = "chat.html?chatId=" + encodeURIComponent(chat.id);
        });

        recentQuestionList.appendChild(questionItem);
    });

}



document.querySelectorAll(".question-card").forEach((card) => {
    card.addEventListener("click", () => {
        startChat(card.dataset.question);
    });
});

const recentQuestionsLink = document.getElementById("recentQuestionsLink");
const recentQuestionsSection = document.getElementById("recent-questions");

if (recentQuestionsLink && recentQuestionsSection) {
    recentQuestionsLink.addEventListener("click", (event) => {
        event.preventDefault();
        recentQuestionsSection.hidden = false;
        window.history.replaceState(null, "", "#recent-questions");
        recentQuestionsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
}

loadRecentQuestions();