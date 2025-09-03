import { OurFileRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone } from "@uploadthing/react";
import { useState } from "react";
// your file router type

export default function QuoteForm() {
  const [attachments, setAttachments] = useState<
    { name: string; url: string }[]
  >([]);

  return (
    <div className="space-y-4">
      {/* Upload UI */}
      <UploadDropzone<OurFileRouter>
        endpoint="quoteAttachment"
        onClientUploadComplete={(res) => {
          // res is an array of uploaded files
          const files = res.map((file) => ({
            name: file.name,
            url: file.url,
          }));
          setAttachments(files);
        }}
        onUploadError={(error) => {
          console.error("Upload failed", error);
        }}
      />

      {/* Optional: Preview uploaded files */}
      <ul className="text-sm text-muted-foreground">
        {attachments.map((file, idx) => (
          <li key={idx} className="mt-1">
            📎 {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
