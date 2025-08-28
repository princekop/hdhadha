```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Add your JavaScript code here.  For example:
  const logo = document.getElementById('logo');
  if (logo) {
    logo.addEventListener('click', () => {
      alert('Darkbyte!');
    });
  }

  //Simple animation on scroll
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const header = document.querySelector('header');
    if(header){
      header.style.opacity = 1 - scrolled / 500;
    }
  });
});

```
