"use strict";

const chatStorage = (() => {
    const historyKey = "uniliaConversations";
    const legacyKey = "chatHistory";
    let unsavedConversations = null;
    let migratedLegacyHistory = false;

    function read(scope, key) {
        try {
            return window[scope].getItem(key);
        } catch (error) {
            return null;
        }
    }

    function write(scope, key, value) {
        try {
            if (value === null) window[scope].removeItem(key);
            else window[scope].setItem(key, value);
            return true;
        } catch (error) {
            return false;
        }
    }

    function readArray(scope, key) {
        try {
            const value = JSON.parse(read(scope, key));
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    }

    function normalizeMessages(messages) {
        if (!Array.isArray(messages)) return [];
        return messages.filter(function(item) {
            return item && (item.role === "student" || item.role === "ai");
        }).map(function(item) {
            return { ...item, message: typeof item.message === "string" ? item.message : "" };
        });
    }

    function readConversations() {
        if (unsavedConversations) return unsavedConversations;
        return readArray("localStorage", historyKey).filter(function(conversation) {
            return conversation && typeof conversation.id === "string" && conversation.id.length > 0;
        }).map(function(conversation) {
            return { ...conversation, messages: normalizeMessages(conversation.messages) };
        });
    }

    function writeConversations(conversations) {
        const persisted = write("localStorage", historyKey, JSON.stringify(conversations));
        unsavedConversations = persisted ? null : conversations;
        if (persisted && migratedLegacyHistory) write("sessionStorage", legacyKey, null);
        return persisted;
    }

    function migrateLegacyHistory(conversations) {
        if (migratedLegacyHistory) return;
        const messages = normalizeMessages(readArray("sessionStorage", legacyKey));
        if (!messages.length) return;

        const firstQuestion = messages.find(function(item) { return item.role === "student"; });
        const timestamp = Date.now();
        conversations.push({
            id: "chat-legacy-" + timestamp + "-" + Math.random().toString(36).slice(2, 8),
            title: firstQuestion?.message || "UNILIA conversation",
            createdAt: timestamp,
            updatedAt: timestamp,
            messages: messages
        });
        migratedLegacyHistory = true;
        writeConversations(conversations);
    }

    return { read, write, readConversations, writeConversations, migrateLegacyHistory };
})();
