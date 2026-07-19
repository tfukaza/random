/**
 * Ask supporting browsers to treat quiz sound as intentional media playback.
 * On iOS this makes Web Audio follow the media volume instead of the ring/silent
 * switch, without user-agent sniffing or a permanently playing hidden element.
 *
 * @param {{ audioSession?: { type?: string, state?: string, addEventListener?: (type: string, listener: () => void) => void } }} navigatorLike
 */
export function configureAudioSession(navigatorLike) {
	const session = navigatorLike?.audioSession;
	if (!session) return null;
	try {
		session.type = 'playback';
		return session;
	} catch {
		return null;
	}
}
