// Shared label/formatting helpers for rendering a User record — used by
// both the users list (pages/users/index.tsx) and the user detail page
// (pages/users/show.tsx) so the two stay in sync.

export const ROLE_LABELS: Record<string, string> = {
    agent: 'Agent',
    admin: 'Admin',
    'super-admin': 'Super Admin',
};

export const ROLE_BADGE_CLASSES: Record<string, string> = {
    agent: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    admin: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    'super-admin':
        'border-transparent bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
};

export const SOURCE_LABELS: Record<string, string> = {
    manual: 'Manual',
    customer_api: 'Customer API',
    pitch_health: 'Pitch Health',
    pitch_perfect: 'PitchPerfect',
    self_registered: 'Self-registered',
};

export function formatSource(source: string | null) {
    if (!source) {
        return '—';
    }

    return SOURCE_LABELS[source] ?? source;
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export function formatDateTime(value: string | null) {
    return value ? dateTimeFormatter.format(new Date(value)) : null;
}

export function formatLastLogin(value: string | null) {
    return formatDateTime(value) ?? 'Never';
}

/**
 * Turn a snake_case/camelCase metadata key (as pulled in from the Customer
 * API, Pitch Health, or PitchPerfect) into a readable label.
 */
export function humanizeMetadataKey(key: string) {
    return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/^./, (char) => char.toUpperCase());
}
