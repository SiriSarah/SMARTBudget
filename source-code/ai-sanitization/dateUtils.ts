/**
 * Parses a YYYY-MM-DD date string as a local Date object.
 * This avoids the common issue where 'YYYY-MM-DD' is interpreted as UTC,
 * causing timezone-related bugs when comparing with local current dates.
 */
export const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();

    // Extract YYYY-MM-DD from strings like "2024-03-15T..." or "2024-03-15"
    const dateMatch = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);

    if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const day = parseInt(dateMatch[3], 10);
        return new Date(year, month - 1, day);
    }

    // Fallback for other formats if possible, but warn or log in a real app
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
        return fallback;
    }

    return new Date();
};
