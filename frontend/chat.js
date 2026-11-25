"use strict";

const conversationsKey = "uniliaConversations";
const activeChatKey = "uniliaActiveChatId";
const sidebarStateKey = "uniliaChatSidebarCollapsed";
const demoResponse = "Thank you for your question. I am the UNILIA AI Student Assistant. This is a demonstration response. The university knowledge base and AI backend have not yet been connected.";

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
let loadingMessage = null;
let responseTimer = null;
let toastTimer = null;
let isGenerating = false;
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

function readConversations() {
    try {
        const parsed = JSON.parse(localStorage.getItem(conversationsKey) || "[]");
        if (Array.isArray(parsed)) return parsed;
        console.warn("[chat history] Stored conversations were not an array.");
    } catch (error) {
        console.warn("[chat history] Could not read stored conversations:", error);
    }
    return [];
}

function writeConversations(conversations) {
    try {
        localStorage.setItem(conversationsKey, JSON.stringify(conversations));
        return true;
    } catch (error) {
        console.error("[chat history] Could not save conversations:", error);
        showToast("Conversation changes could not be saved in this browser. Check available storage.");
        return false;
    }
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

function migrateLegacyHistory(conversations) {
    let legacyHistory;
    try {
        legacyHistory = JSON.parse(sessionStorage.getItem("chatHistory") || "[]");
    } catch (error) {
        console.warn("[chat history] Could not read legacy session history:", error);
        return conversations;
    }
    if (!Array.isArray(legacyHistory) || legacyHistory.length === 0) return conversations;

    const firstQuestion = legacyHistory.find(function(item) { return item.role === "student"; });
    conversations.push({
        id: "chat-legacy-" + Date.now(),
        title: firstQuestion ? firstQuestion.message : "UNILIA conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: legacyHistory.map(function(item) {
            return {
                role: item.role,
                message: String(item.message || ""),
                time: item.time || getTime(),
                timestamp: Date.now()
            };
        })
    });
    sessionStorage.removeItem("chatHistory");
    writeConversations(conversations);
    return conversations;
}

function setConversationUrl(chatId) {
    const url = new URL(window.location.href);
    url.searchParams.set("chatId", chatId);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

function ensureActiveConversation() {
    let conversations = migrateLegacyHistory(readConversations());
    const requestedId = new URLSearchParams(window.location.search).get("chatId");
    const storedId = localStorage.getItem(activeChatKey);
    let activeConversation = conversations.find(function(chat) {
        return chat.id === requestedId;
    }) || conversations.find(function(chat) {
        return chat.id === storedId;
    });

    if (!activeConversation) {
        activeConversation = createConversation();
        conversations.unshift(activeConversation);
        writeConversations(conversations);
    }

    activeConversationId = activeConversation.id;
    localStorage.setItem(activeChatKey, activeConversationId);
    setConversationUrl(activeConversationId);
    return activeConversation;
}

function getActiveConversation() {
    return readConversations().find(function(chat) {
        return chat.id === activeConversationId;
    });
}

function saveMessage(role, message) {
    const conversations = readConversations();
    let conversation = conversations.find(function(chat) {
        return chat.id === activeConversationId;
    });

    if (!conversation) {
        conversation = createConversation();
        conversations.unshift(conversation);
        activeConversationId = conversation.id;
        localStorage.setItem(activeChatKey, conversation.id);
        setConversationUrl(conversation.id);
    }

    const record = {
        id: "message-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        role: role,
        message: message,
        time: getTime(),
        timestamp: Date.now()
    };
    conversation.messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    conversation.messages.push(record);
    if (role === "student" && (conversation.title === "New chat" || conversation.title === "New UNILIA conversation")) {
        conversation.title = message.length > 54 ? message.slice(0, 54).trimEnd() + "…" : message;
    }
    conversation.updatedAt = record.timestamp;
    conversations.sort(function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); });
    writeConversations(conversations);
    renderConversationList();
    return { record: record, index: conversation.messages.length - 1 };
}

function updateMessage(conversationId, messageIndex, update) {
    const conversations = readConversations();
    const conversation = conversations.find(function(chat) { return chat.id === conversationId; });
    if (!conversation || !conversation.messages || !conversation.messages[messageIndex]) {
        showToast("That response is no longer available in conversation history.");
        return false;
    }
    update(conversation.messages[messageIndex]);
    conversation.updatedAt = Date.now();
    conversations.sort(function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); });
    return writeConversations(conversations);
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

        const paragraphLines = [];
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

function scrollToLatest(force) {
    if (force || shouldStickToBottom()) {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
    }
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

    const sourceBox = document.createElement("div");
    sourceBox.className = "source-reference";
    const sourceHeading = document.createElement("h5");
    sourceHeading.textContent = "Source References";
    const sourceText = document.createElement("p");
    sourceText.textContent = "No university document is currently connected. Actual references will appear when the knowledge base is integrated.";
    sourceBox.append(sourceHeading, sourceText);

    const actions = document.createElement("div");
    actions.className = "response-actions";
    const copyButton = actionButton("Copy response", "Copy", "copy", options.conversationId, options.messageIndex);
    const helpfulButton = actionButton("Mark response helpful", "Helpful", "helpful", options.conversationId, options.messageIndex);
    const notHelpfulButton = actionButton("Mark response not helpful", "Not helpful", "not-helpful", options.conversationId, options.messageIndex);
    const regenerateButton = actionButton("Regenerate response", "Regenerate", "regenerate", options.conversationId, options.messageIndex);
    actions.append(copyButton, helpfulButton, notHelpfulButton, regenerateButton);

    const feedbackMessage = document.createElement("small");
    feedbackMessage.className = "feedback-message";
    if (options.feedback) {
        response.classList.add(options.feedback === "helpful" ? "feedback-helpful" : "feedback-not-helpful");
        feedbackMessage.textContent = "Feedback saved in this browser.";
        helpfulButton.disabled = true;
        notHelpfulButton.disabled = true;
    }

    message.append(heading, response, timestamp, sourceBox, actions, feedbackMessage);
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
    text.textContent = "Preparing a demonstration response";
    const dots = document.createElement("span");
    dots.className = "thinking-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = "<i></i><i></i><i></i>";
    message.append(heading, text, dots);
    return message;
}

function showStudentMessage(question) {
    const saved = saveMessage("student", question);
    const conversation = getActiveConversation();
    const record = conversation && conversation.messages[saved.index];
    chatMessages.appendChild(createStudentMessage(question, record && record.time));
    scrollToLatest(true);
}

function showAIResponse(question) {
    const shouldScroll = shouldStickToBottom();
    const saved = saveMessage("ai", demoResponse);
    const conversation = getActiveConversation();
    const record = conversation && conversation.messages[saved.index];
    chatMessages.appendChild(createAIMessage(demoResponse, {
        conversationId: activeConversationId,
        messageIndex: saved.index,
        time: record && record.time,
        question: question
    }));
    scrollToLatest(shouldScroll);
}

function clearPendingResponse() {
    window.clearTimeout(responseTimer);
    responseTimer = null;
    if (loadingMessage) loadingMessage.remove();
    loadingMessage = null;
    isGenerating = false;
    updateComposerState();
}

function updateComposerState() {
    sendButton.disabled = isGenerating || questionInput.value.trim().length === 0;
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

function renderChatHistory() {
    clearPendingResponse();
    chatMessages.replaceChildren();
    const conversation = ensureActiveConversation();
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    messages.forEach(function(item, index) {
        if (item.role === "student") {
            chatMessages.appendChild(createStudentMessage(String(item.message || ""), item.time));
            return;
        }
        if (item.role !== "ai") return;
        let previousQuestion = "";
        for (let previous = index - 1; previous >= 0; previous -= 1) {
            if (messages[previous].role === "student") {
                previousQuestion = messages[previous].message || "";
                break;
            }
        }
        chatMessages.appendChild(createAIMessage(String(item.message || ""), {
            conversationId: conversation.id,
            messageIndex: index,
            time: item.time,
            question: previousQuestion,
            feedback: item.feedback
        }));
    });
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
    clearPendingResponse();
    activeConversationId = conversationId;
    localStorage.setItem(activeChatKey, conversationId);
    setConversationUrl(conversationId);
    renderChatHistory();
    closeMobileSidebar();
    questionInput.focus();
}

function startNewChat() {
    clearPendingResponse();
    const conversations = readConversations();
    const conversation = createConversation();
    conversations.unshift(conversation);
    activeConversationId = conversation.id;
    localStorage.setItem(activeChatKey, conversation.id);
    writeConversations(conversations);
    setConversationUrl(conversation.id);
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
    if (writeConversations(conversations)) {
        renderConversationList();
        showToast("Conversation renamed.");
    }
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
        activeConversationId = next.id;
        localStorage.setItem(activeChatKey, activeConversationId);
        setConversationUrl(activeConversationId);
    }
    if (!writeConversations(remaining)) return;
    if (deletingActiveConversation || !remaining.some(function(chat) { return chat.id === activeConversationId; })) {
        renderChatHistory();
    } else {
        renderConversationList();
    }
    showToast("Conversation deleted from this browser.");
}

function submitQuestion() {
    if (isGenerating) return;
    const question = questionInput.value.trim();
    if (!question) {
        updateComposerState();
        return;
    }
    showStudentMessage(question);
    resetComposer();
    if (fileInput.files && fileInput.files.length) {
        showToast("The selected file was not uploaded. The demo only processes your text question.");
        fileInput.value = "";
        fileName.textContent = "";
    }
    isGenerating = true;
    updateComposerState();
    loadingMessage = createLoadingMessage();
    chatMessages.appendChild(loadingMessage);
    scrollToLatest(true);

    responseTimer = window.setTimeout(function() {
        if (loadingMessage) loadingMessage.remove();
        loadingMessage = null;
        isGenerating = false;
        showAIResponse(question);
        updateComposerState();
        questionInput.focus();
    }, 450);
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

    const card = button.closest(".ai-message");
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
        const feedback = button.dataset.responseAction === "helpful" ? "helpful" : "not-helpful";
        if (!updateMessage(conversationId, messageIndex, function(item) { item.feedback = feedback; })) return;
        const response = card.querySelector(".ai-response-text");
        response.classList.add(feedback === "helpful" ? "feedback-helpful" : "feedback-not-helpful");
        card.querySelectorAll('[data-response-action="helpful"], [data-response-action="not-helpful"]').forEach(function(feedbackButton) {
            feedbackButton.disabled = true;
        });
        card.querySelector(".feedback-message").textContent = "Thank you. Your feedback is saved in this browser.";
        renderConversationList();
        return;
    }

    if (button.dataset.responseAction === "regenerate") {
        regenerateResponse(conversationId, messageIndex, card, button);
    }
}

function regenerateResponse(conversationId, messageIndex, card, button) {
    if (isGenerating) {
        showToast("Please wait for the current response to finish.");
        return;
    }
    const conversation = readConversations().find(function(chat) { return chat.id === conversationId; });
    const messages = conversation && conversation.messages;
    if (!messages || !messages[messageIndex]) return;
    let question = "";
    for (let index = messageIndex - 1; index >= 0; index -= 1) {
        if (messages[index].role === "student") {
            question = messages[index].message || "";
            break;
        }
    }
    isGenerating = true;
    button.disabled = true;
    updateComposerState();
    const pending = createLoadingMessage();
    card.insertAdjacentElement("afterend", pending);
    scrollToLatest(false);
    responseTimer = window.setTimeout(function() {
        if (!updateMessage(conversationId, messageIndex, function(item) {
            item.message = demoResponse;
            item.time = getTime();
            item.timestamp = Date.now();
            delete item.feedback;
        })) {
            pending.remove();
            isGenerating = false;
            updateComposerState();
            return;
        }
        const updatedConversation = readConversations().find(function(chat) { return chat.id === conversationId; });
        const updatedRecord = updatedConversation.messages[messageIndex];
        const replacement = createAIMessage(demoResponse, {
            conversationId: conversationId,
            messageIndex: messageIndex,
            time: updatedRecord.time,
            question: question
        });
        card.replaceWith(replacement);
        pending.remove();
        isGenerating = false;
        updateComposerState();
        renderConversationList();
        scrollToLatest(false);
    }, 450);
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
    if (!emojiPicker.hidden && !emojiPicker.contains(event.target) && event.target !== emojiButton) {
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

const pendingQuestion = sessionStorage.getItem("uniliaPendingQuestion");
if (pendingQuestion) {
    sessionStorage.removeItem("uniliaPendingQuestion");
    questionInput.value = pendingQuestion;
    resizeComposer();
    updateComposerState();
    questionForm.requestSubmit();
}
