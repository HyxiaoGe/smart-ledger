'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Star,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Wallet,
  Smartphone,
  Landmark,
  Banknote,
} from 'lucide-react';
import {
  AlipayIcon,
  WechatPayIcon,
} from '@/components/icons/PaymentBrandIcons';
import {
  getPaymentMethodsWithStats,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getPaymentMethodTypeConfig,
  formatLast4Digits,
  type PaymentMethod,
  PAYMENT_METHOD_TYPES,
  PAYMENT_ICONS,
  PAYMENT_COLORS,
} from '@/lib/services/paymentMethodService';
import { ProgressToast } from '@/components/shared/ProgressToast';

// 支付方式类型图标映射（支付宝和微信使用品牌图标，其他使用 Lucide 官方图标）
const PAYMENT_TYPE_ICONS: Record<PaymentMethod['type'], React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  alipay: AlipayIcon,
  wechat: WechatPayIcon,
  cash: Banknote,
  debit_card: Landmark,
  credit_card: CreditCard,
  other: Smartphone,
};

// 渲染支付方式图标
function PaymentIcon({ method, className = "h-6 w-6" }: { method: PaymentMethod; className?: string }) {
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
function TypeIcon({ type, className = "h-8 w-8" }: { type: PaymentMethod['type']; className?: string }) {
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

export default function PaymentMethodsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const data = await getPaymentMethodsWithStats();
      setPaymentMethods(data);
    } catch (error) {
      console.error('加载支付方式失败:', error);
      setToastMessage('❌ 加载支付方式失败，请刷新页面重试');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      await loadPaymentMethods();
      setToastMessage('✅ 默认支付方式设置成功！');
      setShowToast(true);
    } catch (error) {
      console.error('设置默认支付方式失败:', error);
      setToastMessage('❌ 设置默认支付方式失败，请重试');
      setShowToast(true);
    }
  };

  // 统计数据
  const stats = {
    total: paymentMethods.length,
    default: paymentMethods.find((pm) => pm.is_default)?.name || '未设置',
    mostUsed: paymentMethods.reduce(
      (max, pm) => (pm.usage_count! > (max?.usage_count || 0) ? pm : max),
      null as PaymentMethod | null
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 返回按钮骨架 */}
          <div className="mb-6">
            <Skeleton className="h-10 w-32" />
          </div>

          {/* 标题骨架 */}
          <div className="mb-8">
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* 统计卡片骨架 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-md">
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 支付方式列表骨架 */}
          <Card className="border-0 shadow-md bg-white dark:bg-gray-800 dark:bg-gray-800">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button
              variant="ghost"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 dark:text-gray-100 hover:bg-gray-50 rounded-lg px-3 py-2"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-blue-600" />
            支付方式管理
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            管理您的支付账户，让记账更加便捷准确
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">支付方式总数</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">默认支付方式</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 truncate">
                    {stats.default}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Star className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">最常使用</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 truncate">
                    {stats.mostUsed?.name || '暂无数据'}
                  </p>
                  {stats.mostUsed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      使用 {stats.mostUsed.usage_count} 次
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900 dark:bg-green-900 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 支付方式列表 */}
        <Card className="border-0 shadow-md bg-white dark:bg-gray-800 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">我的支付方式</CardTitle>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              添加支付方式
            </Button>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <CreditCard className="h-8 w-8 text-gray-400 dark:text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-2">
                  还没有支付方式
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  添加您常用的支付方式，让记账更加便捷
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加第一个支付方式
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    onEdit={() => setEditingMethod(method)}
                    onDelete={() => setDeletingMethod(method)}
                    onSetDefault={() => handleSetDefault(method.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用提示 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 提示：设置默认支付方式后，添加账单时会自动选择该支付方式
          </p>
        </div>
      </div>

      {/* 添加支付方式对话框 */}
      {showAddDialog && (
        <AddPaymentMethodDialog
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            loadPaymentMethods();
            setToastMessage('✅ 支付方式添加成功！');
            setShowToast(true);
          }}
          setToastMessage={setToastMessage}
          setShowToast={setShowToast}
        />
      )}

      {/* 编辑支付方式对话框 */}
      {editingMethod && (
        <EditPaymentMethodDialog
          method={editingMethod}
          onClose={() => setEditingMethod(null)}
          onSuccess={() => {
            setEditingMethod(null);
            loadPaymentMethods();
            setToastMessage('✅ 支付方式更新成功！');
            setShowToast(true);
          }}
          setToastMessage={setToastMessage}
          setShowToast={setShowToast}
        />
      )}

      {/* 删除支付方式对话框 */}
      {deletingMethod && (
        <DeletePaymentMethodDialog
          method={deletingMethod}
          allMethods={paymentMethods}
          onClose={() => setDeletingMethod(null)}
          onSuccess={() => {
            setDeletingMethod(null);
            loadPaymentMethods();
            setToastMessage('✅ 支付方式删除成功！');
            setShowToast(true);
          }}
          setToastMessage={setToastMessage}
          setShowToast={setShowToast}
        />
      )}

      {/* Toast 提示 */}
      {showToast && (
        <ProgressToast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

// 支付方式卡片组件
function PaymentMethodCard({
  method,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  method: PaymentMethod;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const typeConfig = getPaymentMethodTypeConfig(method.type);

  return (
    <div
      className="group relative rounded-xl border-2 border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:border-blue-700 hover:shadow-lg transition-all duration-200"
      style={{
        borderLeftColor: method.color || typeConfig.color,
        borderLeftWidth: '4px',
      }}
    >
      {/* 默认标记 */}
      {method.is_default && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-yellow-50 dark:bg-yellow-9500 text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
            <Star className="h-3 w-3 fill-white" />
            默认
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* 图标 */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
            style={{
              backgroundColor: `${method.color || typeConfig.color}20`,
            }}
          >
            <PaymentIcon method={method} className="h-7 w-7 flex-shrink-0" />
          </div>

          {/* 名称和类型 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center gap-2">
              {method.name}
              {method.last_4_digits && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                  {formatLast4Digits(method.last_4_digits)}
                </span>
              )}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {typeConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* 使用统计 */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">使用次数</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">
            {method.usage_count || 0} 次
          </p>
        </div>
        {method.last_used && (
          <div>
            <p className="text-gray-500 dark:text-gray-400">最后使用</p>
            <p className="text-sm text-gray-700">
              {new Date(method.last_used).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {!method.is_default && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetDefault}
            className="flex-1"
          >
            <Star className="h-3 w-3 mr-1" />
            设为默认
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-1"
        >
          <Pencil className="h-3 w-3 mr-1" />
          编辑
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:bg-red-950"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          删除
        </Button>
      </div>
    </div>
  );
}

// 添加支付方式对话框
function AddPaymentMethodDialog({
  onClose,
  onSuccess,
  setToastMessage,
  setShowToast,
}: {
  onClose: () => void;
  onSuccess: () => void;
  setToastMessage: (msg: string) => void;
  setShowToast: (show: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethod['type']>('other');
  const [icon, setIcon] = useState('📱');
  const [color, setColor] = useState(PAYMENT_COLORS[0]);
  const [last4Digits, setLast4Digits] = useState('');
  const [saving, setSaving] = useState(false);

  const isCardType = type === 'credit_card' || type === 'debit_card';

  const handleSubmit = async () => {
    if (!name.trim()) {
      setToastMessage('❌ 请输入支付方式名称');
      setShowToast(true);
      return;
    }

    if (isCardType && last4Digits && !/^\d{4}$/.test(last4Digits)) {
      setToastMessage('❌ 卡号后四位必须是4位数字');
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);
      await addPaymentMethod({
        name: name.trim(),
        type,
        icon,
        color,
        last4Digits: isCardType && last4Digits ? last4Digits : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('添加支付方式失败:', error);
      setToastMessage('❌ 添加支付方式失败，请重试');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-6">
            添加支付方式
          </h3>

          {/* 支付方式类型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHOD_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setType(t.value as PaymentMethod['type']);
                    setIcon(t.icon);
                    setColor(t.color);
                  }}
                  className={`p-3 border-2 rounded-lg text-center transition-all flex flex-col items-center justify-center ${
                    type === t.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center mb-2 h-8 w-8">
                    <TypeIcon type={t.value as PaymentMethod['type']} className="h-8 w-8" />
                  </div>
                  <div className="text-xs font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 支付方式名称 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：招商银行信用卡"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* 卡号后四位（仅卡类型显示） */}
          {isCardType && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                卡号后四位（可选）
              </label>
              <input
                type="text"
                value={last4Digits}
                onChange={(e) =>
                  setLast4Digits(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="例如：1234"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          )}

          {/* 图标选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择图标
            </label>
            <div className="grid grid-cols-10 gap-2">
              {PAYMENT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 text-2xl border-2 rounded-lg hover:scale-110 transition-transform ${
                    icon === ic ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* 颜色选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择颜色
            </label>
            <div className="grid grid-cols-6 gap-3">
              {PAYMENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    color === c
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 dark:border-gray-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 预览 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">预览效果</p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${color}20` }}
              >
                {icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center gap-2">
                  {name || '支付方式名称'}
                  {isCardType && last4Digits && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      **** {last4Digits}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {PAYMENT_METHOD_TYPES.find((t) => t.value === type)?.label}
                </p>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? '添加中...' : '添加支付方式'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 编辑支付方式对话框
function EditPaymentMethodDialog({
  method,
  onClose,
  onSuccess,
  setToastMessage,
  setShowToast,
}: {
  method: PaymentMethod;
  onClose: () => void;
  onSuccess: () => void;
  setToastMessage: (msg: string) => void;
  setShowToast: (show: boolean) => void;
}) {
  const [name, setName] = useState(method.name);
  const [icon, setIcon] = useState(method.icon || '📱');
  const [color, setColor] = useState(method.color || PAYMENT_COLORS[0]);
  const [last4Digits, setLast4Digits] = useState(method.last_4_digits || '');
  const [saving, setSaving] = useState(false);

  const isCardType =
    method.type === 'credit_card' || method.type === 'debit_card';

  const handleSubmit = async () => {
    if (!name.trim()) {
      setToastMessage('❌ 请输入支付方式名称');
      setShowToast(true);
      return;
    }

    if (isCardType && last4Digits && !/^\d{4}$/.test(last4Digits)) {
      setToastMessage('❌ 卡号后四位必须是4位数字');
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);
      await updatePaymentMethod({
        id: method.id,
        name: name.trim(),
        icon,
        color,
        last4Digits: isCardType && last4Digits ? last4Digits : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('更新支付方式失败:', error);
      setToastMessage('❌ 更新支付方式失败，请重试');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-6">
            编辑支付方式
          </h3>

          {/* 支付方式名称 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：招商银行信用卡"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* 卡号后四位（仅卡类型显示） */}
          {isCardType && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                卡号后四位（可选）
              </label>
              <input
                type="text"
                value={last4Digits}
                onChange={(e) =>
                  setLast4Digits(e.target.value.replace(/\D/g, '').slice(0, 4))
                }
                placeholder="例如：1234"
                maxLength={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          )}

          {/* 图标选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择图标
            </label>
            <div className="grid grid-cols-10 gap-2">
              {PAYMENT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 text-2xl border-2 rounded-lg hover:scale-110 transition-transform ${
                    icon === ic ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* 颜色选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择颜色
            </label>
            <div className="grid grid-cols-6 gap-3">
              {PAYMENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    color === c
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-200 dark:border-gray-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* 预览 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-3">预览效果</p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${color}20` }}
              >
                {icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100 flex items-center gap-2">
                  {name || '支付方式名称'}
                  {isCardType && last4Digits && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      **** {last4Digits}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? '保存中...' : '保存更改'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 删除支付方式对话框
function DeletePaymentMethodDialog({
  method,
  allMethods,
  onClose,
  onSuccess,
  setToastMessage,
  setShowToast,
}: {
  method: PaymentMethod;
  allMethods: PaymentMethod[];
  onClose: () => void;
  onSuccess: () => void;
  setToastMessage: (msg: string) => void;
  setShowToast: (show: boolean) => void;
}) {
  const [migrateToId, setMigrateToId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const hasUsage = (method.usage_count || 0) > 0;
  const availableMethods = allMethods.filter((pm) => pm.id !== method.id);

  const handleDelete = async () => {
    if (hasUsage && !migrateToId) {
      setToastMessage('❌ 请选择要迁移到的支付方式');
      setShowToast(true);
      return;
    }

    try {
      setDeleting(true);
      const result = await deletePaymentMethod(
        method.id,
        migrateToId || undefined
      );

      if (result.success) {
        onSuccess();
      } else {
        setToastMessage(`❌ ${result.message}`);
        setShowToast(true);
      }
    } catch (error) {
      console.error('删除支付方式失败:', error);
      setToastMessage('❌ 删除支付方式失败，请重试');
      setShowToast(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 dark:text-gray-100 mb-4">
            删除支付方式
          </h3>

          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              确定要删除支付方式「{method.name}」吗？
            </p>

            {hasUsage && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 dark:bg-yellow-950 border-l-4 border-yellow-500 rounded">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ 该支付方式有 {method.usage_count} 笔交易记录
                </p>
                <p className="text-sm text-yellow-700 mb-4">
                  删除前需要将这些交易记录迁移到其他支付方式，以保证数据完整性
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  迁移到 <span className="text-red-500">*</span>
                </label>
                <select
                  value={migrateToId}
                  onChange={(e) => setMigrateToId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">-- 请选择目标支付方式 --</option>
                  {availableMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.icon} {pm.name}
                      {pm.last_4_digits && ` (${formatLast4Digits(pm.last_4_digits)})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={deleting}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
