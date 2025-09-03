// "use client";
// import React from "react";
// import { useRouter } from "next/navigation";

// interface PaginationProps {
//   currentPage: number;
//   totalItems: number;
//   itemsPerPage: number;
// }

// const Pagination: React.FC<PaginationProps> = ({
//   currentPage,
//   totalItems,
//   itemsPerPage,
// }) => {
//   const router = useRouter();
//   const totalPages = Math.ceil(totalItems / itemsPerPage);

//   const navigateToPage = (page: number) => {
//     if (page < 1 || page > totalPages || page === currentPage) return;
//     router.push({
//       pathname: router.pathname,
//       query: { ...router.query, page },
//     });
//   };

//   const getVisiblePages = (): (number | "...")[] => {
//     if (totalPages <= 5) {
//       return Array.from({ length: totalPages }, (_, i) => i + 1);
//     }

//     const pages: (number | "...")[] = [];

//     if (currentPage <= 3) {
//       pages.push(1, 2, 3, "...", totalPages);
//     } else if (currentPage >= totalPages - 2) {
//       pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
//     } else {
//       pages.push(
//         1,
//         "...",
//         currentPage - 1,
//         currentPage,
//         currentPage + 1,
//         "...",
//         totalPages
//       );
//     }

//     return pages;
//   };

//   const visiblePages = getVisiblePages();

//   return (
//     <div className="flex items-center justify-center gap-2 mt-6">
//       <button
//         onClick={() => navigateToPage(currentPage - 1)}
//         disabled={currentPage === 1}
//         className="px-3 py-1 rounded bg-muted text-sm disabled:opacity-50"
//       >
//         Previous
//       </button>

//       {visiblePages.map((page, idx) =>
//         page === "..." ? (
//           <span key={idx} className="px-2 text-muted text-sm">
//             ...
//           </span>
//         ) : (
//           <button
//             key={page}
//             onClick={() => navigateToPage(page)}
//             disabled={page > totalPages}
//             className={`px-3 py-1 rounded text-sm ${
//               page === currentPage ? "bg-primary text-white" : "bg-muted"
//             }`}
//           >
//             {page}
//           </button>
//         )
//       )}

//       <button
//         onClick={() => navigateToPage(currentPage + 1)}
//         disabled={currentPage === totalPages}
//         className="px-3 py-1 rounded bg-muted text-sm disabled:opacity-50"
//       >
//         Next
//       </button>
//     </div>
//   );
// };

// export default Pagination;
