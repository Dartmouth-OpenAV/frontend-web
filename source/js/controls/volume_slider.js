/*
 *
 * Volume slider
 * 
 */

import { refresh, availableTimers, updateStatus } from '../main.js';
import { appendUIInteractionJSON } from '../utilities.js';

function setVolumeSliderState(slider, level) {
  const color = slider.getAttribute('data-muted') === "true" ? 'var(--slider-muted)' : 'var(--theme-color)';
  level = level && parseInt(level) ? level : 0 ; // parse error values as 0
  slider.value = level ; 
  slider.setAttribute('style', `background:linear-gradient(to right, ${color}, ${color} ${level}%, var(--slider-muted) ${level}%, var(--slider-muted))`);

  // handlers
  if (slider.hasAttribute('data-allow-events')) {
    slider.addEventListener('input', handleVolumeSlider);
  }
}

var handleVolumeOngoing = false ;
function handleVolumeSlider(e, isRecursion=false) {
	const slider = e.target ;

	//clear timeouts
	window.clearTimeout(refresh);
	const timerId = parseInt( slider.getAttribute( 'data-timer' ) );
	window.clearTimeout( availableTimers[timerId] );

	if( !isRecursion ) {
		// visual feedback
		setVolumeSliderState( slider, slider.value );
	}

	if( handleVolumeOngoing===false ) {
		handleVolumeOngoing = true ;
		const path = slider.getAttribute('data-path') ;
		const payload = path.replace( /<value>/, slider.value );
		updateStatus(appendUIInteractionJSON(payload), function() {
			handleVolumeOngoing = false ;
		} );
	} else {
		availableTimers[timerId] = setTimeout( function() { handleVolumeSlider(e, true) ; }, 200 ) ;
	}
}

// Export functions
export {
  setVolumeSliderState,
  handleVolumeSlider,
  handleVolumeOngoing
};