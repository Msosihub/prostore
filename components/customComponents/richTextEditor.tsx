"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  List,
  Heading1,
  ListOrdered,
  Loader2,
} from "lucide-react";
import { useEffect } from "react";
import "./editor.css";
import Heading from "@tiptap/extension-heading";
import { cn } from "@/lib/utils";

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
        levels: [1, 2, 3],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] max-h-[300px] overflow-y-auto focus:outline-none text-slate-700 text-xs leading-relaxed p-3",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    onBlur() {
      onBlur?.();
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="w-full min-h-[200px] border border-slate-100 rounded-xl flex items-center justify-center bg-slate-50/50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full border border-slate-200 rounded-2xl bg-white overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all",
        className
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        data-placeholder={placeholder}
        className="prose prose-sm max-w-none focus:outline-none"
      />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-100 p-1.5 select-none">
      {/* Bold Trigger */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
          editor.isActive("bold") &&
            "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700"
        )}
      >
        <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Italic Trigger */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
          editor.isActive("italic") &&
            "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700"
        )}
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* Unordered Bullet List */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
          editor.isActive("bulletList") &&
            "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700"
        )}
      >
        <List className="w-3.5 h-3.5" />
      </button>

      {/* Ordered Numbered List */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
          editor.isActive("orderedList") &&
            "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700"
        )}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* Heading Line Item */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          "p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors",
          editor.isActive("heading", { level: 1 }) &&
            "bg-orange-100 text-orange-700 hover:bg-orange-100 hover:text-orange-700"
        )}
      >
        <Heading1 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
