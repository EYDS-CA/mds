import React from "react";
import Icon from "@ant-design/icons";

const EditSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21.1784 8.88387L8.55161 21.5079L4.20485 21.9886C2.94506 22.1281 1.8728 21.0656 2.01224 19.7965L2.49307 15.4507L15.1198 2.82664C16.2209 1.72576 18 1.72576 19.0963 2.82664L21.1736 4.9034C22.2747 6.00428 22.2747 7.7878 21.1784 8.88387ZM16.4277 10.3693L13.634 7.57628L4.70011 16.5131L4.3491 19.6523L7.48896 19.3013L16.4277 10.3693ZM19.5435 6.53789L17.4663 4.46113C17.2692 4.26403 16.947 4.26403 16.7547 4.46113L15.2689 5.94659L18.0626 8.73965L19.5483 7.25418C19.7407 7.05228 19.7407 6.73499 19.5435 6.53789Z"
      fill="#3C3636"
    />
  </svg>
);

const EditIcon = (props) => <Icon component={EditSvg} {...props} />;

export default EditIcon;
