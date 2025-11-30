import {
  CreditCard,
  Smartphone,
  Landmark,
  Banknote,
} from 'lucide-react';
import {
  AlipayIcon,
  WechatPayIcon,
} from '@/components/icons/PaymentBrandIcons';
import type { PaymentMethod } from '@/lib/api/services/payment-methods';
import { getPaymentMethodTypeConfig, PAYMENT_METHOD_TYPES } from '../constants';

// 支付方式类型图标映射
const PAYMENT_TYPE_ICONS: Record<PaymentMethod['type'], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  alipay: AlipayIcon,
  wechat: WechatPayIcon,
  cash: Banknote,
  debit_card: Landmark,
  credit_card: CreditCard,
  other: Smartphone,
};

// 渲染支付方式图标
export function PaymentIcon({ method, className = "h-6 w-6" }: { method: PaymentMethod; className?: string }) {
  const Icon = PAYMENT_TYPE_ICONS[method.type];
  const typeConfig = getPaymentMethodTypeConfig(method.type);

  // 如果用户自定义了 emoji 图标
  const hasCustomIcon = method.icon && !Object.values(PAYMENT_METHOD_TYPES).some(t => t.icon === method.icon);

  if (hasCustomIcon) {
    return <span className="text-2xl flex items-center justify-center">{method.icon}</span>;
  }

  // 判断是否为品牌图标（支付宝、微信）
  const isBrandIcon = method.type === 'alipay' || method.type === 'wechat';

  // 对于品牌图标，使用 SVG 组件；对于其他图标，使用 Lucide 图标并设置颜色
  if (isBrandIcon) {
    return <Icon className={className} style={{ display: 'block' }} />;
  }

  // 对于 Lucide 图标，设置颜色和样式
  return (
    <Icon
      className={className}
      style={{
        color: method.color || typeConfig.color,
        display: 'block',
      }}
    />
  );
}

// 渲染类型图标（用于类型选择按钮）
export function TypeIcon({ type, className = "h-8 w-8" }: { type: PaymentMethod['type']; className?: string }) {
  const Icon = PAYMENT_TYPE_ICONS[type];
  const typeConfig = getPaymentMethodTypeConfig(type);

  // 判断是否为品牌图标
  const isBrandIcon = type === 'alipay' || type === 'wechat';

  if (isBrandIcon) {
    return (
      <div className="flex items-center justify-center">
        <Icon className={className} style={{ display: 'block' }} />
      </div>
    );
  }

  // 对于 Lucide 图标，设置颜色
  return (
    <div className="flex items-center justify-center">
      <Icon
        className={className}
        style={{
          color: typeConfig.color,
          display: 'block',
        }}
      />
    </div>
  );
}
