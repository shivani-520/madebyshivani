export function releasePointer(event) {
    try {
        if (event.target.hasPointerCapture?.(event.pointerId)) {
            event.target.releasePointerCapture(event.pointerId);
        }
    } catch {
        // A cancelled pointer may already have lost capture.
    }
}