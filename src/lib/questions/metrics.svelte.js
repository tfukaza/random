import { untrack } from 'svelte';

// One session-local record for answers and behaviour. Nothing in this module
// persists or transmits data; consumers only receive cloned snapshots.
export const quizMetrics = $state({
	runId: 0,
	/** @type {Array<any>} */
	attempts: []
});

// Shared gate for timed/custom questions. Ordinary controls are also protected
// by the PatienceLens inert subtree; scenes use this to defer their own clocks.
export const deliveryState = $state({ locked: false });

/** @param {boolean} locked */
export function setInteractionLocked(locked) {
	untrack(() => {
		deliveryState.locked = !!locked;
	});
}

/** @type {any | null} */
let current = null;
let sequence = 0;

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now());
const safeClone = (/** @type {any} */ value) => {
	if (value === undefined) return undefined;
	// Svelte 5 state is a Proxy, and browsers throw DataCloneError when a Proxy
	// reaches structuredClone. Metrics deliberately accept JSON-safe answer data,
	// so serialization both unwraps reactive values and enforces that contract.
	return JSON.parse(JSON.stringify(value));
};
const same = (/** @type {any} */ a, /** @type {any} */ b) => JSON.stringify(a) === JSON.stringify(b);

/** @param {string} id @param {number} qNumber @param {string} delivery */
export function beginAttempt(id, qNumber, delivery = 'normal') {
	if (current && !current.terminal) recordEvent('abandoned');
	const startedAt = now();
	const attempt = {
		attemptId: `${quizMetrics.runId}:${++sequence}`,
		id,
		qNumber,
		delivery,
		startedAt,
		readyAt: null,
		firstInteractionAt: null,
		firstSelectionAt: null,
		submitAttemptedAt: null,
		submittedAt: null,
		hiddenMs: 0,
		hiddenAt: typeof document !== 'undefined' && document.hidden ? startedAt : null,
		selectionCount: 0,
		revisionCount: 0,
		submitAttempts: 0,
		validationFailures: 0,
		modalityCounts: {},
		draft: null,
		response: null,
		terminal: false,
		events: []
	};
	quizMetrics.attempts.push(attempt);
	// Mutate the proxy stored by $state, not the raw object passed to push.
	// Otherwise properties already observed by a metrics snapshot can retain
	// stale values (the same proxy boundary that caused Question 10's clone bug).
	current = quizMetrics.attempts[quizMetrics.attempts.length - 1];
	recordEvent('question-shown', { delivery });
	return current.attemptId;
}

export function currentAttempt() {
	return current;
}

/** @param {string} type @param {Record<string, any>} [detail] */
export function recordEvent(type, detail = {}) {
	untrack(() => {
		if (!current || current.terminal) return;
		const at = now();
		current.events.push({ type, at: Math.max(0, at - current.startedAt), ...safeClone(detail) });
	});
}

/** @param {string} modality */
export function recordInteraction(modality = 'unknown') {
	if (!current) return;
	const at = now();
	if (current.firstInteractionAt === null) current.firstInteractionAt = at;
	current.modalityCounts[modality] = (current.modalityCounts[modality] ?? 0) + 1;
	recordEvent('interaction', { modality });
}

/** @param {{format: string, value: any, label?: string, labels?: string[], action?: string}} draft */
export function recordDraft(draft) {
	if (!current || current.terminal) return;
	const next = safeClone(draft);
	if (current.draft && same(current.draft, next)) return;
	const at = now();
	const previous = current.draft;
	current.selectionCount += 1;
	if (previous !== null) current.revisionCount += 1;
	if (current.firstSelectionAt === null) current.firstSelectionAt = at;
	current.draft = next;
	recordEvent(previous === null ? 'draft-selected' : 'draft-changed', {
		previous: safeClone(previous),
		next
	});
}

export function recordSubmitAttempt() {
	if (!current || current.terminal) return;
	current.submitAttempts += 1;
	if (current.submitAttemptedAt === null) current.submitAttemptedAt = now();
	recordEvent('submit-attempt', { valid: current.draft !== null });
}

export function recordValidationFailure(reason = 'invalid') {
	if (!current || current.terminal) return;
	current.validationFailures += 1;
	recordEvent('validation-failed', { reason });
}

export function markReady(source = 'presentation') {
	if (!current || current.readyAt !== null) return;
	current.readyAt = now();
	recordEvent('controls-ready', { source });
}

/** @param {boolean} hidden */
export function recordVisibility(hidden) {
	if (!current || current.terminal) return;
	const at = now();
	if (hidden && current.hiddenAt === null) {
		current.hiddenAt = at;
		recordEvent('visibility-hidden');
	} else if (!hidden && current.hiddenAt !== null) {
		current.hiddenMs += Math.max(0, at - current.hiddenAt);
		current.hiddenAt = null;
		recordEvent('visibility-visible');
	}
}

/** @param {Record<string, number>} score @param {string} [outcome] */
export function finishAttempt(score, outcome = 'submitted') {
	if (!current || current.terminal) return;
	const at = now();
	if (current.hiddenAt !== null) {
		current.hiddenMs += Math.max(0, at - current.hiddenAt);
		current.hiddenAt = null;
	}
	current.submittedAt = current.submitAttemptedAt ?? at;
	current.response = {
		...(safeClone(current.draft) ?? { format: 'automatic', value: outcome }),
		score: safeClone(score),
		outcome
	};
	current.wallMs = Math.max(0, current.submittedAt - current.startedAt);
	current.presentationMs = Math.max(0, (current.readyAt ?? current.startedAt) - current.startedAt);
	current.decisionMs = Math.max(
		0,
		current.submittedAt - (current.readyAt ?? current.startedAt) - current.hiddenMs
	);
	current.firstInteractionMs =
		current.firstInteractionAt === null
			? null
			: Math.max(0, current.firstInteractionAt - (current.readyAt ?? current.startedAt));
	recordEvent('submitted', { outcome, response: current.response });
	current.terminal = true;
}

/** Final submitted response for cross-question checks. */
export function latestResponse(/** @type {string} */ id) {
	for (let i = quizMetrics.attempts.length - 1; i >= 0; i -= 1) {
		const attempt = quizMetrics.attempts[i];
		if (attempt.id === id && attempt.terminal) return attempt.response;
	}
	return null;
}

export function submittedAttempts() {
	return quizMetrics.attempts.filter((attempt) => attempt.terminal);
}

// Questions with a built-in wait measure the experience rather than the
// taker's decision. Keep them out of the self-audit, along with anything whose
// presentation was deliberately altered by the patience lens.
const UNCOUNTED_TIMING = new Set([
	'terms-consent',
	'circle-illusion',
	'rotating-snakes',
	'asteroid-impact',
	'elevator-doors'
]);

export function timingEntries() {
	return submittedAttempts()
		.filter((attempt) => attempt.delivery === 'normal' && !UNCOUNTED_TIMING.has(attempt.id))
		.map((attempt) => ({
			id: attempt.id,
			qNumber: attempt.qNumber,
			ms: attempt.decisionMs
		}));
}

export function averageDecisionSeconds() {
	const entries = timingEntries();
	return entries.length
		? entries.reduce((total, attempt) => total + attempt.ms, 0) / entries.length / 1000
		: 0;
}

export const DECISIVE_MAX = 0.25;
export const DELIBERATE_MIN = 1.5;

export function revisionRate() {
	const attempts = submittedAttempts();
	return attempts.length
		? attempts.reduce((total, attempt) => total + attempt.revisionCount, 0) / attempts.length
		: 0;
}

export function metricsSummary() {
	return submittedAttempts().map((attempt) => ({
		id: attempt.id,
		qNumber: attempt.qNumber,
		delivery: attempt.delivery,
		format: attempt.response?.format,
		wallMs: attempt.wallMs,
		presentationMs: attempt.presentationMs,
		decisionMs: attempt.decisionMs,
		firstInteractionMs: attempt.firstInteractionMs,
		selectionCount: attempt.selectionCount,
		revisionCount: attempt.revisionCount,
		submitAttempts: attempt.submitAttempts,
		validationFailures: attempt.validationFailures,
		modalityCounts: safeClone(attempt.modalityCounts),
		outcome: attempt.response?.outcome
	}));
}

export function snapshotMetrics() {
	return safeClone({ runId: quizMetrics.runId, attempts: quizMetrics.attempts });
}

export function resetMetrics() {
	quizMetrics.runId += 1;
	quizMetrics.attempts = [];
	current = null;
	sequence = 0;
	deliveryState.locked = false;
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
	// @ts-ignore -- development inspection hook, deliberately absent in production.
	window.__quizMetrics = Object.freeze({
		snapshot: snapshotMetrics,
		summary: () => safeClone(metricsSummary())
	});
}
