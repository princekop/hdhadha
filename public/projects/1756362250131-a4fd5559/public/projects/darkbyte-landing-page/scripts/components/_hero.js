```javascript
document.addEventListener('DOMContentLoaded', () => {
  const heroSection = document.querySelector('.hero');
  const headline = heroSection.querySelector('h1');
  const tagline = heroSection.querySelector('p');
  const buttons = heroSection.querySelectorAll('button');

  // Simple animation on scroll
  const options = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate');
      }
    });
  }, options);

  observer.observe(headline);
  observer.observe(tagline);
  buttons.forEach(button => observer.observe(button));


  // Button hover effects
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      button.classList.add('hover');
    });
    button.addEventListener('mouseleave', () => {
      button.classList.remove('hover');
    });
  });

});

```
