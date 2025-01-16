import { ReactNode } from "react";

type NameValueRowProps = {
  name: string;
  value: ReactNode;
  valueColor?: string;
};

export const NameValueRow = ({ name, value, valueColor }: NameValueRowProps) => {
  return (
    <div className="flex flex-row justify-between items-center">
      <span className="text-gray-500">{name}</span>
      <span style={{ color: valueColor }}>{value}</span>
    </div>
  );
};
