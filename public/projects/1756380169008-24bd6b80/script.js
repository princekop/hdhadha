```javascript
// script.js
document.addEventListener('DOMContentLoaded', () => {
  // Add any JavaScript logic here if needed.  For example:
  // Smooth scrolling for anchor links:
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });


  //Example of a simple animation (optional)
  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    heroSection.classList.add('animate-in');
  }

});

```
