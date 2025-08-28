```javascript
// Smooth scrolling for pricing plan anchors
document.querySelectorAll('a[href^="#pricing-plan"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();

    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  });
});


// Add any other pricing-related JavaScript interactions here, such as:
// - Expanding plan details on hover
// - Accordion-style plan comparisons
// - Interactive pricing calculators (if applicable)

// Example: Plan details expansion on hover
const pricingPlans = document.querySelectorAll('.pricing-plan');
pricingPlans.forEach(plan => {
  plan.addEventListener('mouseover', () => {
    plan.classList.add('expanded');
  });
  plan.addEventListener('mouseout', () => {
    plan.classList.remove('expanded');
  });
});

```
