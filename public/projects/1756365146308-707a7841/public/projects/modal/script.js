```javascript
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  const openModalBtn = document.getElementById('open-modal');
  const closeModalBtn = document.getElementById('close-modal');

  openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
  });

  closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  });

  window.addEventListener('resize', () => {
    // Adjust modal content based on screen size if needed.  
    //Example:
    // if (window.innerWidth < 768) {
    //   modalContent.style.fontSize = '14px';
    // } else {
    //   modalContent.style.fontSize = '16px';
    // }
  });

  //Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  });
});

```
