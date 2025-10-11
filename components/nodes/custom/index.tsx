import { CustomPrimitive } from './primitive';

export type CustomNodeProps = {
  type: string;
  data: {
    width?: number;
    height?: number;
    resizable?: boolean;
    updatedAt?: string;
  };
  id: string;
};

export const CustomNode = (props: CustomNodeProps) => (
  <CustomPrimitive {...props} title="Custom" />
);
