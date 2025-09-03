const NoInternet = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-lg font-semibold text-red-600">
        Couldn’t load product details
      </p>
      <p className="text-gray-600 text-sm">
        Check your internet connection or try again later.
      </p>
    </div>
  );
};

export default NoInternet;
