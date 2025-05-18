import React from "react";
import { Button } from "antd";
import { ConfigProvider } from "antd";

function GoldButton({ children, onClick, disabled, bgColor }) {
  return (
    <ConfigProvider
      theme={{
        components: {
          Button: {
            // defaultHoverBorderColor: "#a6702e",
          },
        },
      }}
    >
      <Button
        style={{
          backgroundColor: bgColor || "#1D80E9",
          color: "white",
          fontWeight: "bold",
          fontFamily: "Archivo, Arial, Helvetica, sans-serif",
          letterSpacing: "1px",
          padding: "10px 20px",
          border: "none",
        }}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </Button>
    </ConfigProvider>
  );
}

export default GoldButton;
