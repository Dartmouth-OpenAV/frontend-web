/*
 *
 * Camera Pan/Tilt (stateless)
 * 
 */

import { updateStatus} from '../main.js';

function handlePanTiltZoom(e) {
	var btn = e.target ;

	// visual feedback
	btn.classList.add('active');

	// update backend
	const value = btn.getAttribute('data-value');
	const payload = btn.parentElement.getAttribute('data-path').replace(/<value>/, value);
	updateStatus(payload, null);
}

function handlePanTiltZoomStop(e) {
	var btn = e.target ;

	// visual feedback
	btn.classList.remove('active');

	// update backend
	const panCommands = [ '"left"', '"right"', '"up"', '"down"' ]; // zoom commands are 'in' and 'out'
	const value = panCommands.includes( btn.getAttribute('data-value') ) ? '"pan stop"' : '"zoom stop"' ; 
	const payload = btn.parentElement.getAttribute('data-path').replace(/<value>/, value);
	updateStatus(payload, null);
}

// Export functions
export { 
    handlePanTiltZoom,
    handlePanTiltZoomStop 
};