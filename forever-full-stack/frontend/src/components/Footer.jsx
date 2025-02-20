import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInstagram, faFacebook, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { assets } from "../assets/assets";

const Footer = () => {
  return (
    <div>
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
        <div>
          <img src={assets.logo} className="mb-5 w-32" alt="" />
          <p className="w-full md:w-2/3 text-gray-600">
            Shashi Adda is your go-to e-commerce destination for stylish and
            high-quality clothing. We offer a carefully curated collection of
            trendy, comfortable, and elegant apparel designed to suit every
            occasion. With a focus on premium fabrics and modern designs, we
            ensure that you always stay ahead in fashion. Shop with us for the
            latest trends and experience seamless online shopping with great
            deals and fast delivery!
          </p>
        </div>

        <div>
          <p className="text-xl font-medium mb-5">COMPANY</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li className="flex items-center gap-2">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faInstagram} className="text-xl" />
              </a>
              Instagram
            </li>
            <li className="flex items-center gap-2">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faFacebook} className="text-xl" />
              </a>
              Facebook
            </li>
            <li className="flex items-center gap-2">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faXTwitter} className="text-xl" />
              </a>
              X
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xl font-medium mb-5">GET IN TOUCH</p>
          <ul className="flex flex-col gap-1 text-gray-600">
            <li>+91 73377 41922</li>
            <li>shashiadda05@gmail.com</li>
          </ul>
        </div>
      </div>

      <div>
        <hr />
        <p className="py-5 text-sm text-center">
          Copyright 2025@ shashiadda.in - All Right Reserved.
        </p>
      </div>
    </div>
  );
};

export default Footer;
