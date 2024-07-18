/**
 * @constant Loading is a full page loading spinner using a LottieFiles JSON animation
 */
import React from "react";
import Lottie from "react-lottie";
import loader from "@/assets/loader.json";

const Loading = () => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: loader,
  };
  return (
    <div id="loading-screen">
      <div className="loader">
        <Lottie options={defaultOptions} />
      </div>
    </div>
  );
};

export default Loading;
