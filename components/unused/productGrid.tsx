// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>ShopGrid Showcase</title>
//     <script src="https://cdn.tailwindcss.com"></script>
//     <script src="https://unpkg.com/feather-icons"></script>
//     <script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js"></script>
//     <style>
//         .card-hover:hover {
//             transform: translateY(-5px);
//             box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
//         }
//         .image-hover:hover {
//             opacity: 0.9;
//         }
//     </style>
// </head>
// <body class="bg-gray-50 font-sans">
//     <div class="container mx-auto px-4 py-8">
//         <!-- Main Card Container -->
//         <div id="CardInstanceMvcYhZ_DqfhQ" class="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 card-hover">
//             <!-- Card Header -->
//             <div class="px-6 py-4 border-b border-gray-200">
//                 <h2 class="text-xl font-semibold text-gray-800">Shop Categories</h2>
//             </div>

//             <!-- Grid Container -->
//             <div class="p-4">
//                 <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
//                     <!-- Item 1 -->
//                     <div class="group relative">
//                         <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 image-hover transition-all duration-300">
//                             <img src="http://static.photos/retail/640x360/1" alt="Category 1" class="w-full h-full object-cover">
//                         </div>
//                         <div class="mt-2 text-center">
//                             <p class="text-sm font-medium text-gray-900 truncate">Electronics</p>
//                         </div>
//                     </div>

//                     <!-- Item 2 -->
//                     <div class="group relative">
//                         <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 image-hover transition-all duration-300">
//                             <img src="http://static.photos/retail/640x360/2" alt="Category 2" class="w-full h-full object-cover">
//                         </div>
//                         <div class="mt-2 text-center">
//                             <p class="text-sm font-medium text-gray-900 truncate">Fashion</p>
//                         </div>
//                     </div>

//                     <!-- Item 3 -->
//                     <div class="group relative">
//                         <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 image-hover transition-all duration-300">
//                             <img src="http://static.photos/retail/640x360/3" alt="Category 3" class="w-full h-full object-cover">
//                         </div>
//                         <div class="mt-2 text-center">
//                             <p class="text-sm font-medium text-gray-900 truncate">Home & Kitchen</p>
//                         </div>
//                     </div>

//                     <!-- Item 4 -->
//                     <div class="group relative">
//                         <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 image-hover transition-all duration-300">
//                             <img src="http://static.photos/retail/640x360/4" alt="Category 4" class="w-full h-full object-cover">
//                         </div>
//                         <div class="mt-2 text-center">
//                             <p class="text-sm font-medium text-gray-900 truncate">Beauty</p>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             <!-- Card Footer -->
//             <div class="px-6 py-3 bg-gray-50 text-center">
//                 <a href="#" class="text-sm font-medium text-blue-600 hover:text-blue-800">See all categories <i data-feather="chevron-right" class="inline w-4 h-4"></i></a>
//             </div>
//         </div>
//     </div>

//     <script>
//         feather.replace();

//         // This would be replaced with your actual data fetching logic in Next.js
//         document.addEventListener('DOMContentLoaded', () => {
//             // Example of how you might fetch and populate data in a real implementation
//             // fetch('/api/banners')
//             //   .then(response => response.json())
//             //   .then(data => populateBannerItems(data));

//             // Animation for hover effects
//             const cards = document.querySelectorAll('.group');
//             cards.forEach(card => {
//                 card.addEventListener('mouseenter', () => {
//                     card.querySelector('img').style.transform = 'scale(1.05)';
//                 });
//                 card.addEventListener('mouseleave', () => {
//                     card.querySelector('img').style.transform = 'scale(1)';
//                 });
//             });
//         });

//         // Function to populate banner items (example)
//         function populateBannerItems(items) {
//             const gridContainer = document.querySelector('.grid');
//             gridContainer.innerHTML = '';

//             items.slice(0, 4).forEach(item => {
//                 gridContainer.innerHTML += `
//                     <div class="group relative">
//                         <div class="aspect-square overflow-hidden rounded-lg bg-gray-100 image-hover transition-all duration-300">
//                             <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover">
//                         </div>
//                         <div class="mt-2 text-center">
//                             <p class="text-sm font-medium text-gray-900 truncate">${item.title}</p>
//                         </div>
//                     </div>
//                 `;
//             });

//             feather.replace();
//         }
//     </script>
// </body>
// </html>
