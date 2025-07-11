/**
 * Test file to verify heading formatting behavior
 * Tests that headings don't have indentation issues and markers hide properly
 */

import { MarkdownEditor } from './markdown-editor.js'

// Test content with various heading levels
const testContent = `# Heading 1 Test
This is a paragraph after heading 1.

## Heading 2 Test
This is a paragraph after heading 2.

### Heading 3 Test
This is a paragraph after heading 3.

#### Heading 4 Test
This is a paragraph after heading 4.

##### Heading 5 Test
This is a paragraph after heading 5.

###### Heading 6 Test
This is a paragraph after heading 6.

## Mixed Content Test

Here we have **bold text** and *italic text* and _underlined text_.

### Expected Behavior:

1. **When cursor is NOT on a heading line:**
   - Hash symbols (#, ##, ###, etc.) should be hidden
   - Heading text should be styled (larger, bold)
   - NO indentation should be visible

2. **When cursor IS on a heading line:**
   - Hash symbols should be visible (raw markdown)
   - Text should appear normal (not styled)

3. **Inline formatting should work independently:**
   - Bold, italic, underline should work normally
   - Should not interfere with heading formatting

## Current Issues to Fix:

- ❌ Headings appear indented due to hidden hash symbols
- ❌ Inconsistent behavior between heading and inline formatting

## Expected Results:

- ✅ Clean heading alignment with no indentation
- ✅ Consistent active line detection
- ✅ Proper marker hiding/showing
`

// Function to initialize the heading test
export function initHeadingTest() {
  console.log('📝 Initializing heading formatting test...')
  
  const container = document.getElementById('editor-container')
  if (!container) {
    console.error('❌ Editor container not found!')
    return
  }
  
  const editor = new MarkdownEditor(container, testContent)
  
  console.log('✅ Heading test initialized!')
  console.log('📋 Test Instructions:')
  console.log('1. Move cursor to different heading lines')
  console.log('2. Check that headings are NOT indented when inactive')
  console.log('3. Check that hash symbols show/hide properly')
  console.log('4. Verify heading sizes are correct')
  console.log('5. Test inline formatting still works in paragraphs')
  
  return editor
}

// Export for use in main editor
export { testContent as headingTestContent } 