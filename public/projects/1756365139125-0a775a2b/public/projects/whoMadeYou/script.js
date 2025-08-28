```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Add any JavaScript logic here.  For this example, let's just add an event listener to change a text color.

  const titleElement = document.getElementById('main-title');
  if (titleElement) {
    titleElement.addEventListener('mouseover', () => {
      titleElement.style.color = 'lightblue';
    });
    titleElement.addEventListener('mouseout', () => {
      titleElement.style.color = 'lightcyan';
    });
  }

  //Example of responsive behavior (adjusting font size based on screen width):
  function adjustFontSize() {
    const screenWidth = window.innerWidth;
    const title = document.getElementById('main-title');
    if (title) {
      if (screenWidth < 480) {
        title.style.fontSize = '1.5em';
      } else if (screenWidth < 768) {
        title.style.fontSize = '2em';
      } else {
        title.style.fontSize = '3em';
      }
    }
  }

  window.addEventListener('resize', adjustFontSize);
  adjustFontSize(); //initial adjustment


});
```
