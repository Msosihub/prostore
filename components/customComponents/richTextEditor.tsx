"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, Heading1, Loader } from "lucide-react";
import { useEffect } from "react";
import "./editor.css"; // ✅ Import this
import Heading from "@tiptap/extension-heading";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({
        levels: [1, 2, 3], // ✅ You can adjust this
      }),
    ],

    content: value,
    editorProps: {
      attributes: {
        class: "min-h-[150px] focus:outline-none",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    onBlur: ({ event }) => {
      onBlur?.();
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return <Loader className="w-10 h-10 animate-spin" />;

  return (
    <div className={`border rounded-md p-2 space-y-2 ${className ?? ""}`}>
      {/* Toolbar */}
      {editor && <Toolbar editor={editor} />}
      {/* Editor Area */}
      {editor && (
        <EditorContent
          editor={editor}
          data-placeholder={placeholder}
          className="prose prose-sm max-w-none dark:prose-invert focus:outline-none"
        />
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex gap-2 border-b pb-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive("bold") ? "font-bold text-blue-600" : ""}
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive("italic") ? "italic text-blue-600" : ""}
      >
        <Italic size={16} />
      </button>

      {/* 🔹 Unordered List */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive("bulletList") ? "text-blue-600" : ""}
      >
        <List size={16} />
      </button>

      {/* 🔸 Ordered List */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive("orderedList") ? "text-blue-600" : ""}
      >
        <span className="text-sm font-semibold">1.</span>
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={
          editor.isActive("heading", { level: 1 }) ? "text-blue-600" : ""
        }
      >
        <Heading1 size={16} />
      </button>
    </div>
  );
}
