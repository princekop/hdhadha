```javascript
// Simple animation on scroll

window.addEventListener('scroll', () => {
  const logo = document.querySelector('.logo');
  const scrolled = window.pageYOffset;
  logo.style.transform = `translateY(${scrolled * 0.1}px)`;
});


//Optional: Add more interactive elements here as needed.  Example below.

// const button = document.getElementById("myButton");
// button.addEventListener("click", function() {
//   alert("Button clicked!");
// });

```
