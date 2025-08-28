```javascript
document.addEventListener('DOMContentLoaded', () => {
  const heroSection = document.querySelector('.hero');
  const heroText = document.querySelector('.hero-text');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        heroText.classList.add('animate-in');
      } else {
        heroText.classList.remove('animate-in');
      }
    });
  }, { threshold: 0.5 });

  observer.observe(heroSection);


  const testimonials = document.querySelectorAll('.testimonial');
  testimonials.forEach(testimonial => {
    testimonial.addEventListener('mouseover', () => {
      testimonial.classList.add('active');
    });
    testimonial.addEventListener('mouseout', () => {
      testimonial.classList.remove('active');
    });
  });

});

```
