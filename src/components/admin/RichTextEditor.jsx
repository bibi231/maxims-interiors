// src/components/admin/RichTextEditor.jsx
// WYSIWYG editor for journal posts (TipTap). Produces plain semantic HTML
// (headings, lists, links, images, quotes). The API sanitises it again
// with an allowlist before saving, so nothing here is trusted.
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UIcon, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote,
  Link2, Unlink, ImagePlus, Undo2, Redo2, Minus, Pilcrow,
} from 'lucide-react'
import { uploadFile, BUCKETS } from '@/lib/storage'
import { cn } from '@/lib/utils'

function Btn({ on, active, disabled, label, children }) {
  return (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={on} disabled={disabled} aria-label={label} title={label} aria-pressed={!!active}
      className={cn('min-w-[44px] min-h-[44px] grid place-items-center border transition-colors disabled:opacity-30',
        active ? 'bg-gold/20 border-gold/60 text-gold' : 'border-transparent text-cream-soft/85 hover:text-gold hover:border-gold/30')}>
      {children}
    </button>
  )
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write your post...' }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  const lastEmitted = useRef(value)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: { attributes: { class: 'prose-maxims prose-admin min-h-[320px] px-4 py-3 focus:outline-none', 'aria-label': 'Post content' } },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? '' : ed.getHTML()
      lastEmitted.current = html
      onChange(html)
    },
  })

  // Load new content when a different post is opened.
  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      editor.commands.setContent(value || '', false)
      lastEmitted.current = value
    }
  }, [value, editor])

  if (!editor) return null

  function setLink() {
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('Link address (https://...)', prev)
    if (url === null) return
    if (!url.trim()) { editor.chain().focus().unsetLink().run(); return }
    const href = /^(https?:|mailto:|tel:|\/)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  async function addImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true); setErr('')
    try {
      const url = await uploadFile(BUCKETS.blog, file)
      const alt = window.prompt('Describe the image (for accessibility and search engines)', '') || ''
      editor.chain().focus().setImage({ src: url, alt }).run()
    } catch (e2) { setErr(e2.message || 'Upload failed') }
    setUploading(false)
  }

  const c = () => editor.chain().focus()
  return (
    <div className="border border-gold/25 bg-charcoal">
      <div className="flex flex-wrap gap-0.5 p-1 border-b border-gold/20 bg-charcoal-mid sticky top-0 z-10" role="toolbar" aria-label="Formatting">
        <Btn label="Paragraph" on={() => c().setParagraph().run()} active={editor.isActive('paragraph')}><Pilcrow size={16} /></Btn>
        <Btn label="Heading" on={() => c().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 size={17} /></Btn>
        <Btn label="Subheading" on={() => c().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 size={17} /></Btn>
        <Btn label="Bold" on={() => c().toggleBold().run()} active={editor.isActive('bold')}><Bold size={16} /></Btn>
        <Btn label="Italic" on={() => c().toggleItalic().run()} active={editor.isActive('italic')}><Italic size={16} /></Btn>
        <Btn label="Underline" on={() => c().toggleUnderline().run()} active={editor.isActive('underline')}><UIcon size={16} /></Btn>
        <Btn label="Strikethrough" on={() => c().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough size={16} /></Btn>
        <Btn label="Bulleted list" on={() => c().toggleBulletList().run()} active={editor.isActive('bulletList')}><List size={17} /></Btn>
        <Btn label="Numbered list" on={() => c().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered size={17} /></Btn>
        <Btn label="Quote" on={() => c().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote size={16} /></Btn>
        <Btn label="Divider" on={() => c().setHorizontalRule().run()}><Minus size={17} /></Btn>
        <Btn label="Add link" on={setLink} active={editor.isActive('link')}><Link2 size={16} /></Btn>
        <Btn label="Remove link" on={() => c().unsetLink().run()} disabled={!editor.isActive('link')}><Unlink size={16} /></Btn>
        <Btn label={uploading ? 'Uploading image' : 'Insert image'} on={() => fileRef.current?.click()} disabled={uploading}><ImagePlus size={17} className={uploading ? 'animate-pulse' : ''} /></Btn>
        <Btn label="Undo" on={() => c().undo().run()} disabled={!editor.can().undo()}><Undo2 size={16} /></Btn>
        <Btn label="Redo" on={() => c().redo().run()} disabled={!editor.can().redo()}><Redo2 size={16} /></Btn>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={addImage} />
      </div>
      {err && <p className="px-4 pt-2 font-body text-[0.88rem] text-amber-400">{err}</p>}
      <EditorContent editor={editor} />
    </div>
  )
}
