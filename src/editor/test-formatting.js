/**
 * Simple test to verify markdown formatting behavior
 * This file demonstrates how the formatting should work:
 * - Markers should be hidden when cursor is NOT on the line
 * - Markers should be visible when cursor IS on the line
 * - Bold, italic, and underline should work correctly
 */

import { MarkdownEditor } from './markdown-editor.js'

// Test content with various markdown formatting
const testContent = `# Test Document

This is **bold text** that should hide markers when not active.

This is *italic text* that should hide markers when not active.

This is _underlined text_ that should hide markers when not active.

Mixed formatting: **bold** and *italic* and _underlined_ text.

Complex example: This **bold _underlined_ text** should work properly.

## Instructions for Testing

1. Click on different lines in the editor
2. When your cursor is on a line with formatting:
   - You should see the raw markdown (**, *, _)
3. When your cursor is NOT on a line with formatting:
   - The markers should be hidden
   - The text should appear formatted (bold, italic, underlined)

## Expected Behavior

**Active line (cursor here):** You see the raw markdown markers
**Inactive line:** You see formatted text without markers

Try moving your cursor around to test this behavior!
`

// Function to initialize the test
export function initFormattingTest() {
  console.log('🔧 Initializing formatting test...')
  
  const container = document.getElementById('editor-container')
  if (!container) {
    console.error('❌ Editor container not found!')
    return
  }
  
  const editor = new MarkdownEditor(container, testContent)
  
  console.log('✅ Formatting test initialized!')
  console.log('📝 Instructions:')
  console.log('1. Move your cursor to different lines')
  console.log('2. Lines with cursor should show raw markdown markers')
  console.log('3. Lines without cursor should show formatted text')
  
  return editor
}

// Add some debugging helpers
export function debugFormattingState(editor) {
  const state = editor.view.state
  const cursor = state.selection.main.head
  const line = state.doc.lineAt(cursor)
  
  console.log('🐛 Debug info:')
  console.log(`   Cursor position: ${cursor}`)
  console.log(`   Active line: ${line.number} (${line.from}-${line.to})`)
  console.log(`   Line text: "${line.text}"`)
  console.log(`   Has formatting: ${/(\*\*|_|\*)/.test(line.text)}`)
} 