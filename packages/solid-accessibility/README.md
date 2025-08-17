## Pragmatic drag and drop

An optional package for Pragmatic drag and drop containing `Solid.js` components to assist with setting up accessible experiences.

If you want these buttons to pick up the same Atlassian token colors, define CSS vars in your app theme (optional):
// Bring in default tokens
import '@arminmajerie/pragmatic-drag-and-drop-accessibility/styles.css';

// Later, they can override any variable in their own CSS (loaded after)
```css
:root {
--pddd-color-background-neutral: #f1f2f4;
--pddd-color-background-neutral-subtle: transparent;
--pddd-color-background-selected: #0c66e4;
--pddd-color-text: #172b4d;
--pddd-color-text-selected: #ffffff;
}
```
[📖 Documentation](https://atlassian.design/components/pragmatic-drag-and-drop/)
