import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "@/auth";

const f = createUploadthing();

export const ourFileRouter = {
  // Existing image uploader (unchanged)
  imageUploader: f({
    image: { maxFileSize: "4MB" },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata }) => {
      return { uploadedBy: metadata.userId };
    }),

  // ✅ New quote attachment uploader (PDFs, docs, etc.)
  quoteAttachment: f({
    pdf: { maxFileSize: "4MB" },
    image: { maxFileSize: "4MB" }, // jpg, png, webp…
    // Optional: allow other formats like .docx or .xlsx
    text: { maxFileSize: "2MB" },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session) throw new UploadThingError("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      //console.log(`📎 File uploaded by ${metadata.userId}: ${file.name}`);
      return { uploadedBy: metadata.userId, fileUrl: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
