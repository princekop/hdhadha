```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Add your JavaScript code here.  Keep it minimal and relevant to a basic webpage.  For example:
  console.log("Darkbyte project loaded.");
  const elements = document.querySelectorAll('.sky-blue');
  elements.forEach(element => {
    element.addEventListener('mouseover', () => {
      element.style.backgroundColor = '#007bff'; // Brighter blue on hover
    });
    element.addEventListener('mouseout', () => {
      element.style.backgroundColor = '#77b5fe'; // Original sky-blue
    });
  });
});

```
