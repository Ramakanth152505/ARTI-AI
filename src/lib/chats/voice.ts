/**
 * Voice input boundary.
 *
 * Voice is the feature most easily faked, so this module is explicit about what
 * is true. The control asks the browser for microphone access only after a
 * genuine user action, uses the platform `SpeechRecognition` implementation when
 * present, and surfaces every outcome (unsupported, denied, error) as text. When
 * the browser has no speech-recognition implementation it reports that plainly
 * instead of showing a recording animation that records nothing.
 *
 * The interface is deliberately small so ARTI can later swap in its own speech
 * service without touching the composer.
 */

/** Minimal shape of the vendor-prefixed Web Speech API used here. */
interface SpeechRecognitionLike {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((event: SpeechResultEventLike) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
}

interface SpeechResultEventLike {
	resultIndex: number;
	results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
	if (typeof window === 'undefined') return null;
	const w = window as unknown as {
		SpeechRecognition?: RecognitionCtor;
		webkitSpeechRecognition?: RecognitionCtor;
	};
	return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Whether this browser exposes a usable speech-recognition implementation. */
export function isVoiceSupported(): boolean {
	return getRecognitionCtor() !== null;
}

export type VoiceEvent =
	| { type: 'final'; transcript: string }
	| { type: 'interim'; transcript: string }
	| { type: 'error'; message: string }
	| { type: 'end' };

export interface VoiceSession {
	stop(): void;
}

/** Maps raw Web Speech error codes to plain, actionable text. */
export function describeVoiceError(code: string): string {
	switch (code) {
		case 'not-allowed':
		case 'service-not-allowed':
			return 'Microphone permission was denied. Enable it in your browser settings to use voice input.';
		case 'no-speech':
			return 'No speech was detected. Try again closer to the microphone.';
		case 'audio-capture':
			return 'No microphone was found. Check that one is connected.';
		case 'network':
			return 'Speech recognition needs a network connection that is currently unavailable.';
		case 'aborted':
			return 'Voice input was stopped.';
		default:
			return 'Voice input could not continue.';
	}
}

/**
 * Starts a recognition session. Returns null when unsupported so the caller can
 * present the honest unavailable state rather than pretending to record.
 */
export function startVoice(onEvent: (event: VoiceEvent) => void): VoiceSession | null {
	const Ctor = getRecognitionCtor();
	if (!Ctor) return null;

	const recognition = new Ctor();
	recognition.lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
	recognition.continuous = false;
	recognition.interimResults = true;

	recognition.onresult = (event) => {
		let interim = '';
		for (let i = event.resultIndex; i < event.results.length; i += 1) {
			const result = event.results[i];
			const transcript = result[0]?.transcript ?? '';
			if (result.isFinal) {
				onEvent({ type: 'final', transcript });
			} else {
				interim += transcript;
			}
		}
		if (interim) onEvent({ type: 'interim', transcript: interim });
	};

	recognition.onerror = (event) => {
		onEvent({ type: 'error', message: describeVoiceError(event.error) });
	};

	recognition.onend = () => {
		onEvent({ type: 'end' });
	};

	try {
		recognition.start();
	} catch {
		onEvent({ type: 'error', message: 'Voice input could not start.' });
		return null;
	}

	return {
		stop: () => {
			try {
				recognition.stop();
			} catch {
				// Already stopped; nothing further to do.
			}
		}
	};
}
