```javascript
// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});


//Import and initialize component scripts.
import './components/_hero.js';
import './components/_features.js';
import './components/_pricing.js';


// Add more global JS functions here as needed...

```
