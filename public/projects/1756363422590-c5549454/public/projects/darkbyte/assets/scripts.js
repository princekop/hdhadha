```javascript
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('section');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {threshold: 0.5});

  sections.forEach(section => {
    observer.observe(section);
  });


  //Example animation (replace with your desired animation)
  const animatedElements = document.querySelectorAll('.animated');
  animatedElements.forEach(element => {
    element.classList.add('fade-in');
  });

});

```
