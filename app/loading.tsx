import loader from "@/assets/loader.gif";
import Image from "next/image";

const LoadingPage = () => {
  return (
    <div className="flex justify-center items-center h-screen w-screen">
      <Image src={loader} height={150} width={150} alt="Loading..." />
    </div>
  );
};

export default LoadingPage;
