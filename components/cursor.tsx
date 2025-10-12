import React from "react";

type Props = {
  color: string;
  x: number;
  y: number;
  message?: string;
  avatar?: string;
};

export default function Cursor({ color, x, y, message, avatar }: Props) {
  return (
    <div
      className="pointer-events-none absolute top-0 left-0"
      style={{
        transform: `translateX(${x}px) translateY(${y}px)`,
      }}
    >
      <svg
        className="relative"
        width="28"
        height="42"
        viewBox="0 0 24 36"
        fill="none"
        stroke="white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill={color}
        />
      </svg>

      {message && (
        <div
          className="absolute top-5 left-2 flex items-center gap-2 rounded-3xl pl-3 pr-5 py-2"
          style={{ backgroundColor: color, borderRadius: 20 }}
        >
          {avatar ? (
            <img src={avatar} alt={message} width={24} height={24} className="rounded-full" />
          ) : null}
          <p className="whitespace-nowrap text-xs leading-normal text-white">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
