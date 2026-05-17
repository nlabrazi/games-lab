import { registerMobileControls } from './MobileControls.js';
import { StreetFighterGame } from './StreetFighterGame.js';

window.onload = () => {
	registerMobileControls();
	new StreetFighterGame().start();
};
