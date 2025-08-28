```javascript
// Simple JavaScript to demonstrate interactivity (optional)

document.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('.interactive');

  elements.forEach(element => {
    element.addEventListener('mouseover', () => {
      element.style.backgroundColor = 'rgba(100, 149, 237, 0.2)'; // Light blue hover effect
    });

    element.addEventListener('mouseout', () => {
      element.style.backgroundColor = ''; // Reset background on mouseout
    });
  });
});

```
