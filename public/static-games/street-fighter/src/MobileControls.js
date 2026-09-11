import { Control } from './constants/controls.js';
import { setVirtualControl } from './engine/InputHandler.js';

const PLAYER_ONE = 0;

const controlMap = {
	left: Control.LEFT,
	right: Control.RIGHT,
	up: Control.UP,
	down: Control.DOWN,
	lightPunch: Control.LIGHT_PUNCH,
	mediumPunch: Control.MEDIUM_PUNCH,
	heavyPunch: Control.HEAVY_PUNCH,
	lightKick: Control.LIGHT_KICK,
	mediumKick: Control.MEDIUM_KICK,
	heavyKick: Control.HEAVY_KICK,
};

const clearControl = (button, control, event) => {
	event?.preventDefault();
	button.classList.remove('is-active');
	setVirtualControl(PLAYER_ONE, control, false);
	if (event?.pointerId !== undefined && button.hasPointerCapture?.(event.pointerId)) {
		button.releasePointerCapture(event.pointerId);
	}
};

const bindVirtualButton = (button) => {
	const control = controlMap[button.dataset.mobileControl];
	if (!control) return;

	button.addEventListener('pointerdown', (event) => {
		event.preventDefault();
		button.setPointerCapture?.(event.pointerId);
		button.classList.add('is-active');
		if (navigator.vibrate) {
			try {
				navigator.vibrate(button.classList.contains('attack') ? 12 : 6);
			} catch (_) {}
		}
		setVirtualControl(PLAYER_ONE, control, true);
	});
	button.addEventListener('pointerup', (event) => clearControl(button, control, event));
	button.addEventListener('pointercancel', (event) => clearControl(button, control, event));
	button.addEventListener('lostpointercapture', () => clearControl(button, control));
};

export const registerMobileControls = () => {
	const controls = document.querySelector('.mobile-fight-controls');
	if (!controls) return;

	controls.querySelectorAll('[data-mobile-control]').forEach(bindVirtualButton);
};
