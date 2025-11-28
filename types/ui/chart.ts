/**
 * Recharts 图表组件类型定义
 * 用于替换组件中的 any 类型
 */

/**
 * Recharts Tooltip 组件的 Payload 项
 */
export interface TooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  color?: string;
  fill?: string;
  stroke?: string;
  payload?: Record<string, unknown>;
}

/**
 * Recharts CustomTooltip 组件的 Props
 */
export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

/**
 * 扩展的 Tooltip Props，包含业务相关字段
 */
export interface ExtendedTooltipProps extends ChartTooltipProps {
  currency?: string;
  kind?: string;
  catMeta?: Map<string, { label: string; icon?: string }>;
}

/**
 * Recharts Legend 组件的 Payload 项
 */
export interface LegendPayloadItem {
  value: string;
  type?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye';
  id?: string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

/**
 * Recharts CustomLegend 组件的 Props
 */
export interface ChartLegendProps {
  payload?: LegendPayloadItem[];
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * 饼图数据项
 */
export interface PieChartDataItem {
  name: string;
  value: number;
  fill?: string;
  percentage?: number;
}

/**
 * 柱状图/折线图数据项
 */
export interface BarLineChartDataItem {
  name: string;
  [key: string]: string | number | undefined;
}
