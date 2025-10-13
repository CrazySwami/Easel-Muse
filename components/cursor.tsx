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
      {/* Pointer triangle */}
      <svg className="relative" width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1 L17 9 L9 10 L8 17 Z" fill={color} />
        <path d="M1 1 L17 9" stroke="#fff" strokeOpacity="0.9" strokeWidth="1" />
      </svg>

      {message && (
        <div
          className="absolute left-3 top-3 flex items-center gap-2 rounded-full pl-2.5 pr-4 py-1.5 shadow-sm"
          style={{ backgroundColor: color }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={message} width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
          ) : null}
          <p className="whitespace-nowrap text-[11px] leading-normal text-white">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
