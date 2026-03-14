import { getRecordOptional, setPartialRecord } from '@arcagentic/schemas';
/**
 * Normalize Zod issue messages for stable, user-friendly display.
 */
function normalizeZodIssueMessage(issue) {
    if (issue.code === 'too_small') {
        const minimum = typeof issue.minimum === 'number' ? issue.minimum : 1;
        const lowerMessage = issue.message.toLowerCase();
        const isString = lowerMessage.includes('string') || lowerMessage.includes('character');
        const isNumber = lowerMessage.includes('number');
        if (isString) {
            const countLabel = minimum === 1 ? 'character' : 'characters';
            const comparator = issue.inclusive ? 'at least' : 'more than';
            return `String must contain ${comparator} ${minimum} ${countLabel}`;
        }
        if (isNumber) {
            const comparator = issue.inclusive ? 'greater than or equal to' : 'greater than';
            return `Number must be ${comparator} ${minimum}`;
        }
    }
    return issue.message;
}
export function mapZodErrorsToFields(error, opts) {
    const { pathToField, maxPerField = 1 } = opts;
    const result = {};
    for (const issue of error.issues) {
        const key = pathToField(issue.path);
        if (!key)
            continue;
        const message = normalizeZodIssueMessage(issue);
        const existing = getRecordOptional(result, key);
        if (!existing) {
            setPartialRecord(result, key, message);
        }
        else if (maxPerField > 1) {
            const messages = existing.split('\n');
            if (messages.length < maxPerField && !messages.includes(message)) {
                setPartialRecord(result, key, [...messages, message].join('\n'));
            }
        }
    }
    return result;
}
export function getInlineErrorProps(fieldKey, message) {
    if (!message)
        return {};
    const id = `${fieldKey}-error`;
    return {
        'aria-invalid': true,
        'aria-describedby': id,
    };
}
