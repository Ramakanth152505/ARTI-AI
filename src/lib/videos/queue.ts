/**
 * Generation-queue logic: job lifecycle, retry/duplication rules and queue
 * summaries. Pure functions and constants only, so the behaviour that matters is
 * unit-testable without a worker.
 *
 * Two honesty rules live here:
 *  - A percentage is shown ONLY when the backend reported one. `jobProgress()`
 *    returns null otherwise, and the UI falls back to a stage label.
 *  - A retry never duplicates a completed output. `shouldRetry()` and
 *    `canRetryJob()` refuse to re-run a job that already produced assets.
 */

import type { GenerationJob, JobStage } from './types';

/** Terminal stages: no further automatic work happens. */
export const TERMINAL_STAGES: JobStage[] = ['completed', 'failed', 'cancelled'];

/** Stages that mean the job is actively doing work. */
export const ACTIVE_STAGES: JobStage[] = ['preparing', 'generating', 'upscaling', 'encoding', 'quality-checking'];

/** Stages a job can be paused from (a worker checkpoint is required). */
export const PAUSABLE_STAGES: JobStage[] = ['queued', 'preparing', 'generating'];

export function isTerminal(stage: JobStage): boolean {
        return TERMINAL_STAGES.includes(stage);
}

export function isActive(stage: JobStage): boolean {
        return ACTIVE_STAGES.includes(stage);
}

/** Human label for a stage, shown when no percentage is available. */
export const STAGE_LABELS: Record<JobStage, string> = {
        draft: 'Draft',
        validating: 'Validating',
        queued: 'Queued',
        preparing: 'Preparing',
        generating: 'Generating',
        upscaling: 'Upscaling',
        encoding: 'Encoding',
        'quality-checking': 'Checking quality',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled'
};

export function stageLabel(stage: JobStage): string {
        return STAGE_LABELS[stage] ?? stage;
}

/**
 * The progress to display: a percentage only when the backend reported one, else
 * null so the caller can show a stage label instead of a fabricated number.
 */
export function jobProgress(job: Pick<GenerationJob, 'progress' | 'stage'>): number | null {
        if (job.progress === null || job.progress === undefined) return null;
        if (isTerminal(job.stage)) return job.stage === 'completed' ? 100 : job.progress;
        return Math.max(0, Math.min(100, Math.round(job.progress)));
}

/** Whether a job produced at least one real asset. */
export function producedAssets(job: Pick<GenerationJob, 'assetIds'>): boolean {
        return job.assetIds.length > 0;
}

/**
 * Whether a job may be retried. A job that already produced assets is NOT
 * retryable here, because retrying would risk duplicating a completed output; the
 * user re-runs the shot instead, which creates a new job deliberately.
 */
export function canRetryJob(job: Pick<GenerationJob, 'stage' | 'retryCount' | 'maxRetries' | 'assetIds'>): boolean {
        if (job.stage !== 'failed' && job.stage !== 'cancelled') return false;
        if (job.assetIds.length > 0) return false;
        return job.retryCount < job.maxRetries;
}

export interface RetryDecision {
        ok: boolean;
        reason?: string;
        /** Incremented retry count when the retry is allowed. */
        retryCount?: number;
}

/** Decides whether to retry a job, with the reason when it is refused. */
export function shouldRetry(job: GenerationJob): RetryDecision {
        if (job.stage === 'completed') return { ok: false, reason: 'This job already completed.' };
        if (job.assetIds.length > 0) {
                return { ok: false, reason: 'This job already produced an output, so it will not be re-run automatically.' };
        }
        if (job.stage !== 'failed' && job.stage !== 'cancelled') {
                return { ok: false, reason: 'Only a failed or cancelled job can be retried.' };
        }
        if (job.retryCount >= job.maxRetries) {
                return { ok: false, reason: `Retry limit reached (${job.maxRetries}). Start a new job instead.` };
        }
        return { ok: true, retryCount: job.retryCount + 1 };
}

/** Whether a job can be cancelled while it runs. */
export function canCancelJob(job: Pick<GenerationJob, 'stage'>): boolean {
        return !isTerminal(job.stage) && job.stage !== 'draft';
}

/** Whether a job can be paused (requires worker checkpoint support). */
export function canPauseJob(job: Pick<GenerationJob, 'stage'>): boolean {
        return PAUSABLE_STAGES.includes(job.stage);
}

export interface QueueSummary {
        total: number;
        active: number;
        queued: number;
        completed: number;
        failed: number;
        cancelled: number;
        drafts: number;
        /** Jobs whose failure is retryable. */
        retryable: number;
        /** Total planned seconds still to be produced (queued + active). */
        pendingPlannedSeconds: number;
}

/** Builds the queue summary shown above the job list. */
export function summariseQueue(jobs: GenerationJob[]): QueueSummary {
        const summary: QueueSummary = {
                total: jobs.length,
                active: 0,
                queued: 0,
                completed: 0,
                failed: 0,
                cancelled: 0,
                drafts: 0,
                retryable: 0,
                pendingPlannedSeconds: 0
        };
        for (const job of jobs) {
                if (isActive(job.stage)) summary.active += 1;
                else if (job.stage === 'queued' || job.stage === 'validating') summary.queued += 1;
                else if (job.stage === 'completed') summary.completed += 1;
                else if (job.stage === 'failed') summary.failed += 1;
                else if (job.stage === 'cancelled') summary.cancelled += 1;
                else if (job.stage === 'draft') summary.drafts += 1;
                if (canRetryJob(job)) summary.retryable += 1;
                if (!isTerminal(job.stage)) summary.pendingPlannedSeconds += job.requestedDurationSeconds;
        }
        return summary;
}

/**
 * Sorts jobs for display: running work first, then queued, then the rest newest
 * first — so the user always sees what is in progress without scrolling.
 */
export function sortJobs(jobs: GenerationJob[]): GenerationJob[] {
        const rank = (job: GenerationJob): number => {
                if (isActive(job.stage)) return 0;
                if (job.stage === 'queued' || job.stage === 'validating') return 1;
                if (job.stage === 'draft') return 2;
                if (job.stage === 'failed') return 3;
                if (job.stage === 'cancelled') return 4;
                return 5;
        };
        return [...jobs].sort((a, b) => {
                const byRank = rank(a) - rank(b);
                if (byRank !== 0) return byRank;
                if (a.priority !== b.priority) return a.priority - b.priority;
                return b.createdAt.localeCompare(a.createdAt);
        });
}

/**
 * Builds an idempotency key for a job request. The same key for the same request
 * means a refresh or a double-click cannot create a second job.
 */
export function idempotencyKey(parts: {
        projectId: string;
        shotId: string | null;
        sceneId: string | null;
        promptVersionId: string;
        requestedDurationSeconds: number;
        requestedResolution: string;
}): string {
        return [
                parts.projectId,
                parts.shotId ?? '-',
                parts.sceneId ?? '-',
                parts.promptVersionId,
                parts.requestedDurationSeconds,
                parts.requestedResolution
        ].join(':');
}

/** Aggregates job counts by project, for project cards and the studio overview. */
export function jobsByProject(jobs: GenerationJob[]): Map<string, GenerationJob[]> {
        const map = new Map<string, GenerationJob[]>();
        for (const job of jobs) {
                const list = map.get(job.projectId) ?? [];
                list.push(job);
                map.set(job.projectId, list);
        }
        return map;
}
