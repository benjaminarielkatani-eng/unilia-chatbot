"use strict";

const activeChatKey = "uniliaActiveChatId";
const sidebarStateKey = "uniliaChatSidebarCollapsed";
const pendingQuestionKey = "uniliaPendingQuestion";
const pendingQuestion = chatStorage.read("sessionStorage", pendingQuestionKey);
const pendingResponses = new Map();
const pendingFeedback = new Set();

const chatLayout = document.getElementById("chatLayout");
const chatMessages = document.getElementById("chatMessages");
const questionForm = document.getElementById("questionForm");
const questionInput = document.getElementById("questionInput");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const emojiButton = document.getElementById("emojiButton");
const emojiPicker = document.getElementById("emojiPicker");
const micButton = document.getElementById("micButton");
const sendButton = questionForm.querySelector('button[type="submit"]');
const conversationList = document.getElementById("conversationList");
const conversationSearch = document.getElementById("conversationSearch");
const chatToastRegion = document.getElementById("chatToastRegion");
const recentQuestionsButton = document.getElementById("recentQuestionsButton");
const mobileSidebarButton = document.getElementById("mobileSidebarButton");
let activeConversationId = null;
let toastTimer = null;
let isListening = false;

function showToast(message) {
    chatToastRegion.replaceChildren();
    const toast = document.createElement("div");
    toast.className = "chat-toast";
    toast.textContent = message;
    chatToastRegion.appendChild(toast);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function() {
        toast.remove();
    }, 4200);
}

const { readConversations } = chatStorage;

function writeConversations(conversations) {
    const persisted = chatStorage.writeConversations(conversations);
    if (!persisted) {
        showToast("Conversation changes are available on this page until you close or reload it.");
    }
    return persisted;
}

function getTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createConversation() {
    return {
        id: "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        title: "New chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
    };
}

function selectConversation(chatId) {
    activeConversationId = chatId;
    chatStorage.write("localStorage", activeChatKey, chatId);
    const url = new URL(window.location.href);
    url.searchParams.set("chatId", chatId);
    try {
        window.history.replaceState(null, "", url.href);
    } catch (error) {
        console.warn("Could not update the conversation link:", error);
    }
}

function ensureActiveConversation() {
    const conversations = readConversations();
    chatStorage.migrateLegacyHistory(conversations);
    const requestedId = new URLSearchParams(window.location.search).get("chatId");
    const storedId = chatStorage.read("localStorage", activeChatKey);
    let activeConversation = conversations.find(function(chat) {
        return chat.id === activeConversationId;
    }) || conversations.find(function(chat) {
        return chat.id === requestedId;
    });
    if (!activeConversation && !(pendingQuestion && requestedId)) {
        activeConversation = conversations.find(function(chat) { return chat.id === storedId; });
    }

    if (!activeConversation) {
        activeConversation = createConversation();
        conversations.unshift(activeConversation);
        writeConversations(conversations);
    }

    selectConversation(activeConversation.id);
    return activeConversation;
}

function createMessage(role, message) {
    return {
        id: "message-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        role: role,
        message: message,
        time: getTime(),
        timestamp: Date.now()
    };
}

function appendInlineFormatting(container, text) {
    const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let previousIndex = 0;
    let match;
    while ((match = tokenPattern.exec(text)) !== null) {
        container.appendChild(document.createTextNode(text.slice(previousIndex, match.index)));
        const token = match[0];
        let element;
        if (token.startsWith("**")) {
            element = document.createElement("strong");
            element.textContent = token.slice(2, -2);
        } else if (token.startsWith("`")) {
            element = document.createElement("code");
            element.textContent = token.slice(1, -1);
        } else {
            element = document.createElement("em");
            element.textContent = token.slice(1, -1);
        }
        container.appendChild(element);
        previousIndex = tokenPattern.lastIndex;
    }
    container.appendChild(document.createTextNode(text.slice(previousIndex)));
}

function isTableDivider(line) {
    return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function(cell) {
        return cell.trim();
    });
}

function appendFormattedResponse(container, content) {
    const lines = String(content).split(/\r?\n/);
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }

        if (/^\s*```/.test(line)) {
            const language = line.trim().slice(3).trim();
            const codeLines = [];
            index += 1;
            while (index < lines.length && !/^\s*```/.test(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }
            if (index < lines.length) index += 1;
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            if (language) code.dataset.language = language;
            code.textContent = codeLines.join("\n");
            pre.appendChild(code);
            container.appendChild(pre);
            continue;
        }

        if (index + 1 < lines.length && line.includes("|") && isTableDivider(lines[index + 1])) {
            const table = document.createElement("table");
            table.className = "response-table";
            const head = document.createElement("thead");
            const headerRow = document.createElement("tr");
            tableCells(line).forEach(function(cell) {
                const th = document.createElement("th");
                appendInlineFormatting(th, cell);
                headerRow.appendChild(th);
            });
            head.appendChild(headerRow);
            table.appendChild(head);
            index += 2;
            const body = document.createElement("tbody");
            while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
                const row = document.createElement("tr");
                tableCells(lines[index]).forEach(function(cell) {
                    const td = document.createElement("td");
                    appendInlineFormatting(td, cell);
                    row.appendChild(td);
                });
                body.appendChild(row);
                index += 1;
            }
            table.appendChild(body);
            container.appendChild(table);
            continue;
        }

        const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const heading = document.createElement("h" + Math.min(6, headingMatch[1].length + 2));
            appendInlineFormatting(heading, headingMatch[2]);
            container.appendChild(heading);
            index += 1;
            continue;
        }

        const unorderedMatch = line.match(/^\s*[-*+]\s+(.+)$/);
        const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
        if (unorderedMatch || orderedMatch) {
            const list = document.createElement(orderedMatch ? "ol" : "ul");
            while (index < lines.length) {
                const listMatch = lines[index].match(orderedMatch ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/);
                if (!listMatch) break;
                const item = document.createElement("li");
                appendInlineFormatting(item, listMatch[1]);
                list.appendChild(item);
                index += 1;
            }
            container.appendChild(list);
            continue;
        }

        const paragraphLines = [line];
        index += 1;
        while (index < lines.length && lines[index].trim() &&
            !/^\s{0,3}#{1,6}\s+/.test(lines[index]) &&
            !/^\s*```/.test(lines[index]) &&
            !/^\s*[-*+]\s+/.test(lines[index]) &&
            !/^\s*\d+[.)]\s+/.test(lines[index]) &&
            !(index + 1 < lines.length && lines[index].includes("|") && isTableDivider(lines[index + 1]))) {
            paragraphLines.push(lines[index]);
            index += 1;
        }
        const paragraph = document.createElement("p");
        paragraph.className = "formatted-paragraph";
        appendInlineFormatting(paragraph, paragraphLines.join(" "));
        container.appendChild(paragraph);
    }
}

function shouldStickToBottom() {
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
}

function createStudentMessage(text, time) {
    const message = document.createElement("article");
    message.className = "student-message";
    const body = document.createElement("p");
    body.className = "student-message-text";
    body.textContent = text;
    const timestamp = document.createElement("small");
    timestamp.className = "message-time";
    timestamp.textContent = "Student · " + (time || getTime());
    message.append(body, timestamp);
    return message;
}

function actionButton(label, symbol, action, conversationId, messageIndex) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "response-action";
    button.dataset.responseAction = action;
    button.dataset.conversationId = conversationId;
    button.dataset.messageIndex = String(messageIndex);
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = symbol;
    return button;
}

function createAIIcon() {
    const icon = document.createElement("img");
    icon.className = "ai-message-icon";
    icon.src = "images/AI scholar transparent.png";
    icon.alt = "UNILIA AI";
    return icon;
}

function readSources(value) {
    let sources;
    try {
        sources = typeof value === "string" ? JSON.parse(value) : value;
    } catch (error) {
        return [];
    }
    if (!Array.isArray(sources)) return [];
    return sources.map(function(source) {
        if (typeof source === "string") return source.trim();
        if (typeof source?.title !== "string" || !source.title.trim()) return "";
        const hasPage = typeof source.page === "number" || typeof source.page === "string";
        return hasPage && String(source.page).trim()
            ? source.title.trim() + " · Page " + source.page
            : source.title.trim();
    }).filter(Boolean);
}

function createAIMessage(text, options) {
    const message = document.createElement("article");
    message.className = "ai-message";
    message.dataset.conversationId = options.conversationId;
    message.dataset.messageIndex = String(options.messageIndex);

    const heading = document.createElement("h4");
    heading.className = "ai-message-heading";
    heading.appendChild(createAIIcon());
    const response = document.createElement("div");
    response.className = "ai-response-text";
    appendFormattedResponse(response, text);

    const timestamp = document.createElement("small");
    timestamp.className = "message-time";
    timestamp.textContent = options.time || getTime();

    message.append(heading, response, timestamp);
    if (Array.isArray(options.sources) && options.sources.length) {
        const sourceBox = document.createElement("div");
        sourceBox.className = "source-reference";
        const sourceHeading = document.createElement("h5");
        sourceHeading.textContent = "Sources";
        sourceBox.appendChild(sourceHeading);
        for (const source of options.sources) {
            const sourceText = document.createElement("p");
            sourceText.textContent = source;
            sourceBox.appendChild(sourceText);
        }
        message.appendChild(sourceBox);
    }

    const actions = document.createElement("div");
    actions.className = "response-actions";
    const copyButton = actionButton("Copy response", "Copy", "copy", options.conversationId, options.messageIndex);
    const regenerateButton = actionButton("Regenerate response", "Regenerate", "regenerate", options.conversationId, options.messageIndex);
    regenerateButton.disabled = pendingResponses.has(options.conversationId) || options.sendingFeedback;
    actions.appendChild(copyButton);
    if (options.canRate) {
        const helpfulButton = actionButton("Mark response helpful", "Helpful", "helpful", options.conversationId, options.messageIndex);
        const notHelpfulButton = actionButton("Mark response not helpful", "Not helpful", "not-helpful", options.conversationId, options.messageIndex);
        const disabled = options.feedbackSubmitted || options.sendingFeedback || options.regenerating;
        helpfulButton.disabled = disabled;
        notHelpfulButton.disabled = disabled;
        actions.append(helpfulButton, notHelpfulButton);
    }
    actions.appendChild(regenerateButton);

    const feedbackMessage = document.createElement("small");
    feedbackMessage.className = "feedback-message";
    if (options.feedback) {
        response.classList.add(options.feedback === "helpful" ? "feedback-helpful" : "feedback-not-helpful");
        feedbackMessage.textContent = options.feedbackSubmitted ? "Feedback sent. Thank you." : "Previous rating saved in this browser.";
    }
    if (options.sendingFeedback) feedbackMessage.textContent = "Sending feedback…";

    message.append(actions, feedbackMessage);
    return message;
}

function createLoadingMessage() {
    const message = document.createElement("article");
    message.className = "ai-message typing-indicator";
    message.setAttribute("role", "status");
    const heading = document.createElement("h4");
    heading.className = "ai-message-heading";
    heading.appendChild(createAIIcon());
    const text = document.createElement("p");
    text.className = "visually-hidden";
    text.textContent = "Waiting for a response from UNILIA";
    const dots = document.createElement("span");
    dots.className = "thinking-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = "<i></i><i></i><i></i>";
    message.append(heading, text, dots);
    return message;
}

function updateComposerState() {
    sendButton.disabled = pendingResponses.has(activeConversationId) || questionInput.value.trim().length === 0;
}

function resizeComposer() {
    questionInput.style.height = "auto";
    questionInput.style.height = Math.min(questionInput.scrollHeight, 180) + "px";
}

function resetComposer() {
    questionInput.value = "";
    resizeComposer();
    updateComposerState();
}

function renderConversationMessages(conversation) {
    chatMessages.replaceChildren();
    const messages = conversation.messages;
    const pending = pendingResponses.get(conversation.id);
    messages.forEach(function(item, index) {
        if (item.role === "student") {
            chatMessages.appendChild(createStudentMessage(String(item.message || ""), item.time));
            return;
        }
        if (item.role !== "ai") return;
        chatMessages.appendChild(createAIMessage(String(item.message || ""), {
            conversationId: conversation.id,
            messageIndex: index,
            time: item.time,
            sources: item.sources,
            feedback: item.feedback,
            feedbackSubmitted: item.feedbackSubmitted === true,
            canRate: Boolean(conversation.sessionToken),
            sendingFeedback: pendingFeedback.has(feedbackKey(conversation.id, index)),
            regenerating: pending?.messageIndex === index
        }));
        if (pending?.messageIndex === index) chatMessages.appendChild(createLoadingMessage());
    });
    if (pending && pending.messageIndex === null) {
        chatMessages.appendChild(createStudentMessage(pending.question, pending.time));
        chatMessages.appendChild(createLoadingMessage());
    }
}

function refreshConversation(conversation, scrollToBottom = false) {
    if (conversation.id !== activeConversationId) return;
    const previousScroll = chatMessages.scrollTop;
    const stickToBottom = scrollToBottom || shouldStickToBottom();
    renderConversationMessages(conversation);
    chatMessages.scrollTop = stickToBottom ? chatMessages.scrollHeight : previousScroll;
    updateComposerState();
}

function renderChatHistory() {
    renderConversationMessages(ensureActiveConversation());
    chatMessages.scrollTop = chatMessages.scrollHeight;
    renderConversationList();
    resetComposer();
}

function formatActivity(timestamp) {
    const date = new Date(timestamp || Date.now());
    if (Number.isNaN(date.getTime())) return "Recent";
    const elapsed = Math.max(0, Date.now() - date.getTime());
    if (elapsed < 60 * 1000) return "Just now";
    if (elapsed < 60 * 60 * 1000) return Math.floor(elapsed / 60000) + " min ago";
    if (elapsed < 24 * 60 * 60 * 1000) return Math.floor(elapsed / 3600000) + " hr ago";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function renderConversationList() {
    if (!conversationList) return;
    const query = conversationSearch.value.trim().toLowerCase();
    const conversations = readConversations().sort(function(a, b) {
        return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    }).filter(function(conversation) {
        if (!query) return true;
        const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        const messageText = messages.map(function(item) { return item.message || ""; }).join(" ");
        return (String(conversation.title || "") + " " + messageText).toLowerCase().includes(query);
    });
    conversationList.replaceChildren();
    if (conversations.length === 0) {
        const empty = document.createElement("p");
        empty.className = "conversation-list-empty";
        empty.textContent = query ? "No matching conversations." : "Your conversations will appear here.";
        conversationList.appendChild(empty);
        return;
    }

    conversations.forEach(function(conversation) {
        const row = document.createElement("div");
        row.className = "conversation-row" + (conversation.id === activeConversationId ? " is-current" : "");

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "conversation-open";
        openButton.dataset.openConversation = conversation.id;
        openButton.setAttribute("aria-current", conversation.id === activeConversationId ? "page" : "false");
        const title = document.createElement("span");
        title.className = "conversation-title";
        title.textContent = conversation.title || "New chat";
        const activity = document.createElement("small");
        activity.textContent = formatActivity(conversation.updatedAt || conversation.createdAt);
        openButton.append(title, activity);

        const controls = document.createElement("div");
        controls.className = "conversation-controls";
        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.dataset.renameConversation = conversation.id;
        renameButton.setAttribute("aria-label", "Rename " + (conversation.title || "conversation"));
        renameButton.title = "Rename conversation";
        renameButton.textContent = "Rename";
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.dataset.deleteConversation = conversation.id;
        deleteButton.setAttribute("aria-label", "Delete " + (conversation.title || "conversation"));
        deleteButton.title = "Delete conversation";
        deleteButton.textContent = "Delete";
        controls.append(renameButton, deleteButton);
        row.append(openButton, controls);
        conversationList.appendChild(row);
    });
}

function openConversation(conversationId) {
    if (!readConversations().some(function(chat) { return chat.id === conversationId; })) {
        showToast("That conversation is no longer available.");
        renderConversationList();
        return;
    }
    selectConversation(conversationId);
    renderChatHistory();
    closeMobileSidebar();
    questionInput.focus();
}

function startNewChat() {
    const conversations = readConversations();
    const conversation = createConversation();
    conversations.unshift(conversation);
    writeConversations(conversations);
    selectConversation(conversation.id);
    chatMessages.replaceChildren();
    conversationSearch.value = "";
    renderConversationList();
    resetComposer();
    closeMobileSidebar();
    questionInput.focus();
}

function saveConversationTitle(conversationId, title) {
    const conversations = readConversations();
    const conversation = conversations.find(function(chat) { return chat.id === conversationId; });
    if (!conversation) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
        showToast("Conversation titles cannot be empty.");
        return;
    }
    conversation.title = trimmedTitle.slice(0, 80);
    conversation.updatedAt = Date.now();
    const persisted = writeConversations(conversations);
    renderConversationList();
    if (persisted) showToast("Conversation renamed.");
}

function beginRenameConversation(conversationId) {
    const conversation = readConversations().find(function(chat) { return chat.id === conversationId; });
    const row = Array.from(conversationList.querySelectorAll(".conversation-row")).find(function(item) {
        return item.querySelector("[data-open-conversation]") &&
            item.querySelector("[data-open-conversation]").dataset.openConversation === conversationId;
    });
    if (!conversation || !row) return;

    const form = document.createElement("form");
    form.className = "conversation-rename-form";
    form.dataset.conversationId = conversationId;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 80;
    input.required = true;
    input.value = conversation.title || "New chat";
    input.setAttribute("aria-label", "New conversation title");
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.dataset.cancelRename = "true";
    cancel.textContent = "Cancel";
    form.append(input, save, cancel);
    row.replaceChildren(form);
    input.focus();
    input.select();
}

function deleteConversation(conversationId) {
    const conversations = readConversations();
    const target = conversations.find(function(chat) { return chat.id === conversationId; });
    if (!target) return;
    if (!window.confirm('Delete "' + (target.title || "New chat") + '"? This removes it from this browser only.')) return;
    const deletingActiveConversation = conversationId === activeConversationId;
    const remaining = conversations.filter(function(chat) { return chat.id !== conversationId; });
    if (deletingActiveConversation) {
        const next = remaining[0] || createConversation();
        if (remaining.length === 0) remaining.push(next);
        selectConversation(next.id);
    }
    const persisted = writeConversations(remaining);
    if (deletingActiveConversation || !remaining.some(function(chat) { return chat.id === activeConversationId; })) {
        renderChatHistory();
    } else {
        renderConversationList();
    }
    if (persisted) showToast("Conversation deleted from this browser.");
}

async function requestAnswer(conversation, question, messageIndex = null) {
    const conversationId = conversation.id;
    if (pendingResponses.has(conversationId)) return;

    const student = messageIndex === null ? createMessage("student", question) : null;
    pendingResponses.set(conversationId, { question, messageIndex, time: student?.time });
    refreshConversation(conversation, student !== null);

    let result;
    try {
        const response = await fetch("/api/chat/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question, session_token: conversation.sessionToken || null })
        });
        if (!response.ok) throw new Error("The chat server returned HTTP " + response.status);

        const payload = await response.json();
        if (typeof payload?.session_token !== "string" || !payload.session_token ||
            typeof payload.message?.answer !== "string" || !payload.message.answer.trim()) {
            throw new Error("The chat server returned an incomplete response.");
        }
        result = payload;
    } catch (error) {
        console.error("Could not get a chat response:", error);
    } finally {
        pendingResponses.delete(conversationId);
    }

    const conversations = readConversations();
    const current = conversations.find(function(chat) { return chat.id === conversationId; });
    if (!current) return;

    if (!result) {
        if (current.id === activeConversationId) {
            if (student && !questionInput.value.trim()) {
                questionInput.value = question;
                resizeComposer();
            }
            refreshConversation(current);
            showToast("Could not get a response from UNILIA. Please try again.");
        }
        return;
    }

    const answer = createMessage("ai", result.message.answer);
    answer.serverMessageId = result.message.id;
    answer.sources = readSources(result.message.source_documents);
    if (student) {
        current.messages.push(student, answer);
        if (current.title === "New chat" || current.title === "New UNILIA conversation") {
            current.title = question.length > 54 ? question.slice(0, 54).trimEnd() + "…" : question;
        }
    } else if (current.messages[messageIndex]?.role === "ai") {
        answer.id = current.messages[messageIndex].id || answer.id;
        current.messages[messageIndex] = answer;
    }
    current.sessionToken = result.session_token;
    current.updatedAt = answer.timestamp;
    writeConversations(conversations);
    renderConversationList();
    refreshConversation(current);
}

function submitQuestion() {
    if (pendingResponses.has(activeConversationId)) return;
    const question = questionInput.value.trim();
    if (!question) {
        updateComposerState();
        return;
    }
    const conversation = ensureActiveConversation();
    resetComposer();
    if (fileInput.files && fileInput.files.length) {
        showToast("Only the text of your question is sent. The selected file stays on this device.");
        fileInput.value = "";
        fileName.textContent = "";
    }
    return requestAnswer(conversation, question);
}

function closeEmojiPicker() {
    emojiPicker.hidden = true;
    emojiButton.setAttribute("aria-expanded", "false");
}

function toggleMobileSidebar(open) {
    const shouldOpen = typeof open === "boolean" ? open : !chatLayout.classList.contains("mobile-nav-open");
    chatLayout.classList.toggle("mobile-nav-open", shouldOpen);
    mobileSidebarButton.setAttribute("aria-expanded", String(shouldOpen));
    mobileSidebarButton.setAttribute("aria-label", shouldOpen ? "Close navigation" : "Open navigation");
}

function closeMobileSidebar() {
    toggleMobileSidebar(false);
}

function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject) {
        const temporary = document.createElement("textarea");
        temporary.value = text;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        const succeeded = document.execCommand("copy");
        temporary.remove();
        if (succeeded) resolve();
        else reject(new Error("Clipboard access is unavailable."));
    });
}

function originalQuestion(conversation, messageIndex) {
    for (let index = messageIndex - 1; index >= 0; index -= 1) {
        const item = conversation.messages[index];
        if (item.role === "student" && item.message.trim()) return item.message;
    }
    return null;
}

function feedbackKey(conversationId, messageIndex) {
    return `${conversationId}:${messageIndex}`;
}

async function findServerMessageId(conversation, messageIndex, record) {
    if (Number.isSafeInteger(record.serverMessageId) && record.serverMessageId > 0) return record.serverMessageId;

    // Older conversations saved the session token before they saved individual message IDs.
    const question = originalQuestion(conversation, messageIndex);
    if (!question) return null;
    const response = await fetch(`/api/chat/sessions/${encodeURIComponent(conversation.sessionToken)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Could not load the server's chat history.");

    const history = await response.json();
    const usedIds = new Set(conversation.messages.map(item => item.serverMessageId));
    const matches = history.messages.filter(item =>
        item.question === question && item.answer === record.message && !usedIds.has(item.id)
    );
    return matches.length === 1 ? matches[0].id : null;
}

async function submitFeedback(conversation, messageIndex, record, feedback) {
    const key = feedbackKey(conversation.id, messageIndex);
    if (!conversation.sessionToken || record.feedbackSubmitted || pendingFeedback.has(key) ||
        pendingResponses.get(conversation.id)?.messageIndex === messageIndex) return;

    pendingFeedback.add(key);
    refreshConversation(conversation);
    try {
        const messageId = await findServerMessageId(conversation, messageIndex, record);
        if (!messageId) {
            showToast("This response could not be matched to a server record. Try rating a new response.");
            return;
        }

        const response = await fetch("/api/chat/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_token: conversation.sessionToken,
                message_id: messageId,
                rating: feedback === "helpful" ? 5 : 1
            })
        });
        if (!response.ok) throw new Error("The feedback request returned HTTP " + response.status);

        const conversations = readConversations();
        const current = conversations.find(chat => chat.id === conversation.id);
        const saved = current?.messages[messageIndex];
        if (saved?.id === record.id && saved?.message === record.message && saved?.serverMessageId === record.serverMessageId) {
            saved.serverMessageId = messageId;
            saved.feedback = feedback;
            saved.feedbackSubmitted = true;
            writeConversations(conversations);
        }
        showToast("Feedback sent. Thank you.");
    } catch (error) {
        console.error("Could not submit feedback:", error);
        showToast("Could not send feedback. Please try again.");
    } finally {
        pendingFeedback.delete(key);
        const current = readConversations().find(chat => chat.id === conversation.id);
        if (current) refreshConversation(current);
    }
}

function handleResponseAction(button) {
    const conversationId = button.dataset.conversationId;
    const messageIndex = Number(button.dataset.messageIndex);
    const conversations = readConversations();
    const conversation = conversations.find(function(chat) { return chat.id === conversationId; });
    const record = conversation && conversation.messages && conversation.messages[messageIndex];
    if (!record || record.role !== "ai") {
        showToast("That response is no longer available.");
        return;
    }

    if (button.dataset.responseAction === "copy") {
        copyText(record.message).then(function() {
            showToast("Response copied to clipboard.");
        }).catch(function(error) {
            console.error("[chat actions] Could not copy response:", error);
            showToast("Could not copy the response. Check browser clipboard permissions.");
        });
        return;
    }

    if (button.dataset.responseAction === "helpful" || button.dataset.responseAction === "not-helpful") {
        return submitFeedback(conversation, messageIndex, record, button.dataset.responseAction);
    }

    if (button.dataset.responseAction === "regenerate") {
        regenerateResponse(conversation, messageIndex);
    }
}

function regenerateResponse(conversation, messageIndex) {
    if (pendingFeedback.has(feedbackKey(conversation.id, messageIndex))) return;
    const question = originalQuestion(conversation, messageIndex);
    if (question) return requestAnswer(conversation, question, messageIndex);
    showToast("The original question is unavailable in this browser.");
}

function logControlVisibility(label, element) {
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    console.info("[chat controls] " + label, {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        disabled: element.disabled === true
    });
}

questionForm.addEventListener("submit", function(event) {
    event.preventDefault();
    submitQuestion();
});

questionInput.addEventListener("input", function() {
    resizeComposer();
    updateComposerState();
});

questionInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        if (!sendButton.disabled) questionForm.requestSubmit();
    }
});

fileInput.addEventListener("change", function() {
    const file = fileInput.files && fileInput.files[0];
    if (file) {
        const size = file.size < 1024 * 1024
            ? Math.max(1, Math.round(file.size / 1024)) + " KB"
            : (file.size / (1024 * 1024)).toFixed(1) + " MB";
        fileName.textContent = "Selected locally (not uploaded): " + file.name + " · " + size;
    } else {
        fileName.textContent = "";
    }
});

emojiButton.addEventListener("click", function() {
    const open = emojiPicker.hidden;
    emojiPicker.hidden = !open;
    emojiButton.setAttribute("aria-expanded", String(open));
});

emojiPicker.addEventListener("click", function(event) {
    const emoji = event.target.closest("button");
    if (!emoji) return;
    const start = questionInput.selectionStart;
    const end = questionInput.selectionEnd;
    const value = questionInput.value;
    questionInput.value = value.slice(0, start) + emoji.textContent + value.slice(end);
    questionInput.setSelectionRange(start + emoji.textContent.length, start + emoji.textContent.length);
    resizeComposer();
    updateComposerState();
    questionInput.focus();
    closeEmojiPicker();
});

document.addEventListener("click", function(event) {
    if (!emojiPicker.hidden && !emojiPicker.contains(event.target) && !emojiButton.contains(event.target)) {
        closeEmojiPicker();
    }
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
console.info("[microphone] Speech recognition supported:", Boolean(SpeechRecognition));
logControlVisibility("Attachment icon", document.querySelector('label[for="fileInput"]'));
logControlVisibility("Microphone button", micButton);

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    let recognitionBaseValue = "";

    micButton.addEventListener("click", function() {
        if (isListening) {
            recognition.stop();
            return;
        }
        try {
            recognition.start();
        } catch (error) {
            console.error("[microphone] Could not start recognition:", error);
            showToast("Voice input could not start. Check microphone permissions and try again.");
        }
    });

    recognition.onstart = function() {
        isListening = true;
        recognitionBaseValue = questionInput.value.trimEnd();
        micButton.classList.add("is-listening");
        micButton.setAttribute("aria-pressed", "true");
        micButton.title = "Stop voice input";
        micButton.setAttribute("aria-label", "Stop voice input");
    };

    recognition.onresult = function(event) {
        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) {
            transcript += event.results[index][0].transcript;
        }
        questionInput.value = (recognitionBaseValue ? recognitionBaseValue + " " : "") + transcript;
        resizeComposer();
        updateComposerState();
    };

    recognition.onend = function() {
        isListening = false;
        micButton.classList.remove("is-listening");
        micButton.setAttribute("aria-pressed", "false");
        micButton.title = "Use voice input";
        micButton.setAttribute("aria-label", "Use voice input");
    };

    recognition.onerror = function(event) {
        console.error("[microphone] Recognition error:", event.error);
        if (event.error !== "no-speech" && event.error !== "aborted") {
            showToast("Voice input was not successful. Check microphone permissions and try again.");
        }
    };
} else {
    console.info("[microphone] Speech recognition is unavailable in this browser.");
    micButton.disabled = true;
    micButton.title = "Voice input is not supported by this browser";
    micButton.setAttribute("aria-label", "Voice input is not supported by this browser");
}

document.getElementById("newChatButton").addEventListener("click", startNewChat);
document.getElementById("sidebarCollapseButton").addEventListener("click", function() {
    const collapsed = chatLayout.classList.toggle("sidebar-collapsed");
    this.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    this.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    this.dataset.tooltip = this.title;
    try {
        localStorage.setItem(sidebarStateKey, String(collapsed));
    } catch (error) {
        console.warn("[chat sidebar] Could not save sidebar preference:", error);
    }
});

mobileSidebarButton.addEventListener("click", function() {
    const shouldOpen = mobileSidebarButton.getAttribute("aria-expanded") !== "true";
    toggleMobileSidebar(shouldOpen);
});
document.getElementById("mobileSidebarCloseButton").addEventListener("click", closeMobileSidebar);
document.getElementById("chatSidebarScrim").addEventListener("click", closeMobileSidebar);
recentQuestionsButton.addEventListener("click", function() {
    if (window.matchMedia("(max-width: 650px)").matches) {
        toggleMobileSidebar(true);
        window.setTimeout(function() { conversationSearch.focus(); }, 180);
    } else if (chatLayout.classList.contains("sidebar-collapsed")) {
        chatLayout.classList.remove("sidebar-collapsed");
        document.getElementById("sidebarCollapseButton").setAttribute("aria-label", "Collapse sidebar");
        document.getElementById("sidebarCollapseButton").title = "Collapse sidebar";
        conversationSearch.focus();
    } else {
        conversationSearch.focus();
    }
});

conversationSearch.addEventListener("input", renderConversationList);
conversationList.addEventListener("click", function(event) {
    const openButton = event.target.closest("[data-open-conversation]");
    if (openButton) {
        openConversation(openButton.dataset.openConversation);
        return;
    }
    const renameButton = event.target.closest("[data-rename-conversation]");
    if (renameButton) {
        beginRenameConversation(renameButton.dataset.renameConversation);
        return;
    }
    if (event.target.closest("[data-cancel-rename]")) {
        renderConversationList();
        return;
    }
    const deleteButton = event.target.closest("[data-delete-conversation]");
    if (deleteButton) deleteConversation(deleteButton.dataset.deleteConversation);
});
conversationList.addEventListener("submit", function(event) {
    const form = event.target.closest(".conversation-rename-form");
    if (!form) return;
    event.preventDefault();
    const row = form.closest(".conversation-row");
    const input = form.querySelector("input");
    saveConversationTitle(form.dataset.conversationId, input.value);
});

chatMessages.addEventListener("click", function(event) {
    const button = event.target.closest("[data-response-action]");
    if (button) handleResponseAction(button);
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeMobileSidebar();
        closeEmojiPicker();
    }
});

let shouldStartWithCollapsedSidebar = false;
try {
    shouldStartWithCollapsedSidebar = localStorage.getItem(sidebarStateKey) === "true";
} catch (error) {
    console.warn("[chat sidebar] Could not restore sidebar preference:", error);
}
if ((shouldStartWithCollapsedSidebar || window.matchMedia("(max-width: 900px) and (min-width: 651px)").matches) &&
    window.matchMedia("(min-width: 651px)").matches) {
    chatLayout.classList.add("sidebar-collapsed");
    const collapseButton = document.getElementById("sidebarCollapseButton");
    collapseButton.setAttribute("aria-label", "Expand sidebar");
    collapseButton.title = "Expand sidebar";
    collapseButton.dataset.tooltip = "Expand sidebar";
}

renderChatHistory();
updateComposerState();

if (pendingQuestion) {
    chatStorage.write("sessionStorage", pendingQuestionKey, null);
    questionInput.value = pendingQuestion;
    resizeComposer();
    updateComposerState();
    questionForm.requestSubmit();
}
