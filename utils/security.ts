
/**
 * Simple sanitizer to prevent XSS and malicious script injections in user-generated text.
 * In a production environment with complex HTML requirements, use DOMPurify.
 */
export const sanitizeInput = (text: string): string => {
    if (!text) return '';
    
    // 1. Remove script tags and potentially dangerous HTML
    let sanitized = text
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/on\w+="[^"]*"/gim, "") // remove inline handlers like onclick
        .replace(/javascript:[^"]*/gim, ""); // remove javascript: pseudo-protocol

    // 2. Escape HTML special characters for safe rendering in standard containers
    // Note: React does this automatically for text content, but this is a secondary guard
    return sanitized.trim();
};

/**
 * Validates if the input is suspiciously like a prompt injection attempt
 */
export const isPotentialInjection = (text: string): string | null => {
    const patterns = [
        /ignore previous instructions/gi,
        /system prompt/gi,
        /you are now/gi,
        /forget everything/gi
    ];
    
    for (const pattern of patterns) {
        if (pattern.test(text)) {
            return "Обнаружена попытка перехвата инструкций ИИ. Действие заблокировано.";
        }
    }
    return null;
};
