"use client";
import DOMPurify from "dompurify"; // ✅ install it if you haven't
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";
import { useState } from "react";
// import sanitizeHtml from "sanitize-html";

const ProductDescription = ({ description }: { description: string }) => {
  const [descExpanded, setDescExpanded] = useState(false);

  // Sanitize description
  // const sanitizedDescription = sanitizeHtml(description, {
  //   allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
  //   allowedAttributes: {
  //     ...sanitizeHtml.defaults.allowedAttributes,
  //     img: ["src", "alt", "width", "height"],
  //   },
  // });
  console.log("Raw description HTML:", description);

  const isLongDescription = description.length > MAX_DESCRIPTION_LENGTH;

  // const shortSanitized = sanitizeHtml(
  //   description.slice(0, MAX_DESCRIPTION_LENGTH),
  //   {
  //     allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
  //     allowedAttributes: {
  //       ...sanitizeHtml.defaults.allowedAttributes,
  //       img: ["src", "alt", "width", "height"],
  //     },
  //   }
  // );

  const shownDescription = descExpanded
    ? description
    : description.slice(0, MAX_DESCRIPTION_LENGTH) +
      (isLongDescription ? "..." : "");
  // const cleanedDescription = shownDescription
  //   .replace(/<li>\s*<p>/g, "<li>")
  //   .replace(/<\/p>\s*<\/li>/g, "</li>");
  const sanitizedDescription = DOMPurify.sanitize(shownDescription);
  //   , {
  //   ALLOWED_TAGS: [
  //     "h1",
  //     "h2",
  //     "h3",
  //     "h4",
  //     "h5",
  //     "h6",
  //     "strong",
  //     "em",
  //     "p",
  //     "br",
  //     "ul",
  //     "ol",
  //     "li",
  //   ],
  //   ALLOWED_ATTR: [],
  // });
  console.log("Baptized html: ", sanitizedDescription);
  return (
    <>
      <div className="mt-2 space-y-2">
        <p className="font-semibold text-gray-700">Maelezo</p>

        <div
          className="text-gray-600 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1"
          dangerouslySetInnerHTML={{
            __html:
              sanitizedDescription ||
              "<p class='text-gray-400'>No description</p>",
          }}
        />

        {isLongDescription && (
          <button
            className="ml-2 text-blue-600 underline text-xs"
            onClick={() => setDescExpanded((prev) => !prev)}
          >
            {descExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </>
  );
};

export default ProductDescription;
