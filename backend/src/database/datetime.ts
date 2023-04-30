export const formatDateToDatetime = (date: Date): string => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

export const formatDatetimeToDate = (timestamp: string): Date => {
    if (isDatetime(timestamp)) {
        return new Date(timestamp + "Z");
    } else if (isTimestamp(timestamp)) {
        return new Date(timestamp + "Z");
    } else if (isDate(timestamp)) {
        return new Date(timestamp);
    } else {
        throw new Error("Invalid date format");
    }
}

export const isDatetime = (timestamp: string): boolean => {
    const tested = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp);
    return tested;
}

export const isDate = (date: string): boolean => {
    const tested = /^\d{4}-\d{2}-\d{2}$/.test(date);
    return tested;
}

export const isTime = (time: string): boolean => {
    const tested = /^\d{2}:\d{2}:\d{2}$/.test(time);
    return tested;
}

export const isTimestamp = (timestamp: string): boolean => {
    const tested = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp);
    return tested;
}
