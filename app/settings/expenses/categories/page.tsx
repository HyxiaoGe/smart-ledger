'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressToast } from '@/components/shared/ProgressToast';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import {
  getCategoriesWithStats,
  addCustomCategory,
  updateCategory,
  deleteCategory,
  generateCategoryKey,
  EMOJI_ICONS,
  PRESET_COLORS,
  type Category,
} from '@/lib/services/categoryService';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Trash2,
  Tag,
  TrendingUp,
  Lock,
  Check,
  X,
} from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 表单状态
  const [formLabel, setFormLabel] = useState('');
  const [formIcon, setFormIcon] = useState('📁');
  const [formColor, setFormColor] = useState('#6B7280');
  const [migrateToKey, setMigrateToKey] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategoriesWithStats();
      setCategories(data);
    } catch (error) {
      console.error('获取类别失败:', error);
      setToastMessage('❌ 获取类别失败');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!formLabel.trim()) {
      setToastMessage('❌ 请输入类别名称');
      setShowToast(true);
      return;
    }

    try {
      const key = generateCategoryKey(formLabel);
      await addCustomCategory({
        key,
        label: formLabel,
        icon: formIcon,
        color: formColor,
      });

      setToastMessage('✅ 类别添加成功');
      setShowToast(true);
      setShowAddDialog(false);
      resetForm();
      await fetchCategories();
    } catch (error: any) {
      console.error('添加类别失败:', error);
      setToastMessage(`❌ ${error.message || '添加失败'}`);
      setShowToast(true);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !formLabel.trim()) {
      setToastMessage('❌ 请输入类别名称');
      setShowToast(true);
      return;
    }

    try {
      await updateCategory({
        id: selectedCategory.id,
        label: formLabel,
        icon: formIcon,
        color: formColor,
      });

      setToastMessage('✅ 类别更新成功');
      setShowToast(true);
      setShowEditDialog(false);
      resetForm();
      await fetchCategories();
    } catch (error: any) {
      console.error('更新类别失败:', error);
      setToastMessage(`❌ ${error.message || '更新失败'}`);
      setShowToast(true);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;

    try {
      const result = await deleteCategory({
        id: selectedCategory.id,
        migrateToKey: migrateToKey || undefined,
      });

      if (result.success) {
        setToastMessage(`✅ ${result.message}`);
        setShowToast(true);
        setShowDeleteDialog(false);
        resetForm();
        await fetchCategories();
      } else {
        setToastMessage(`❌ ${result.message}`);
        setShowToast(true);
      }
    } catch (error: any) {
      console.error('删除类别失败:', error);
      setToastMessage(`❌ ${error.message || '删除失败'}`);
      setShowToast(true);
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormLabel(category.label);
    setFormIcon(category.icon || '📁');
    setFormColor(category.color || '#6B7280');
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setMigrateToKey('');
    setShowDeleteDialog(true);
  };

  const resetForm = () => {
    setFormLabel('');
    setFormIcon('📁');
    setFormColor('#6B7280');
    setSelectedCategory(null);
    setMigrateToKey('');
  };

  const totalUsage = categories.reduce((sum, cat) => sum + (cat.usage_count || 0), 0);
  const activeCategories = categories.filter(cat => cat.is_active).length;

  if (loading) {
    return <PageSkeleton stats={3} listItems={0} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 返回导航 */}
        <div className="mb-6">
          <Link href="/settings/expenses">
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-4 w-4 mr-2" />
              返回消费配置
            </Button>
          </Link>
        </div>

        {/* 页面标题和操作 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">类别自定义</h2>
            <p className="text-gray-600 dark:text-gray-300">管理消费类别，打造个性化的记账体验</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            添加类别
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
                  <div className="text-sm text-gray-600 mt-1">总类别数</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950 rounded-lg">
                  <Tag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{activeCategories}</div>
                  <div className="text-sm text-gray-600 mt-1">启用中</div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950 dark:bg-green-950 rounded-lg">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{totalUsage}</div>
                  <div className="text-sm text-gray-600 mt-1">总使用次数</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950 dark:bg-purple-950 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 类别列表 */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 dark:bg-blue-900 rounded-lg">
                <Tag className="h-5 w-5 text-blue-600" />
              </div>
              <span>类别列表</span>
              <span className="text-sm text-gray-500 font-normal">
                ({categories.length} 个类别)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="group relative rounded-xl border-2 border-gray-200 p-4 hover:shadow-md hover:border-blue-300 dark:border-blue-700 transition-all"
                  style={{ borderLeftColor: category.color || undefined, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-lg text-2xl"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{category.label}</h3>
                        {category.is_system && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            <Lock className="h-3 w-3" />
                            系统预设
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-600 dark:text-gray-300">使用次数</span>
                    <span className="font-semibold text-gray-900">{category.usage_count || 0}</span>
                  </div>

                  {category.last_used && (
                    <div className="text-xs text-gray-500 mb-3">
                      最后使用：{new Date(category.last_used).toLocaleDateString('zh-CN')}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(category)}
                      className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-950 dark:bg-blue-950 hover:border-blue-300 dark:border-blue-700"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      编辑
                    </Button>
                    {!category.is_system && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteDialog(category)}
                        className="hover:bg-red-50 dark:bg-red-950 hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 添加类别对话框 */}
        {showAddDialog && (
          <CategoryDialog
            title="添加类别"
            label={formLabel}
            icon={formIcon}
            color={formColor}
            onLabelChange={setFormLabel}
            onIconChange={setFormIcon}
            onColorChange={setFormColor}
            onConfirm={handleAddCategory}
            onCancel={() => {
              setShowAddDialog(false);
              resetForm();
            }}
          />
        )}

        {/* 编辑类别对话框 */}
        {showEditDialog && selectedCategory && (
          <CategoryDialog
            title={`编辑类别${selectedCategory.is_system ? '（仅名称）' : ''}`}
            label={formLabel}
            icon={formIcon}
            color={formColor}
            onLabelChange={setFormLabel}
            onIconChange={setFormIcon}
            onColorChange={setFormColor}
            onConfirm={handleEditCategory}
            onCancel={() => {
              setShowEditDialog(false);
              resetForm();
            }}
            isSystemCategory={selectedCategory.is_system}
          />
        )}

        {/* 删除类别对话框 */}
        {showDeleteDialog && selectedCategory && (
          <DeleteDialog
            category={selectedCategory}
            categories={categories.filter(c => c.key !== selectedCategory.key && c.is_active)}
            migrateToKey={migrateToKey}
            onMigrateChange={setMigrateToKey}
            onConfirm={handleDeleteCategory}
            onCancel={() => {
              setShowDeleteDialog(false);
              resetForm();
            }}
          />
        )}

        {/* Toast提示 */}
        {showToast && (
          <ProgressToast
            message={toastMessage}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>
  );
}

// 类别对话框组件
function CategoryDialog({
  title,
  label,
  icon,
  color,
  onLabelChange,
  onIconChange,
  onColorChange,
  onConfirm,
  onCancel,
  isSystemCategory = false,
}: {
  title: string;
  label: string;
  icon: string;
  color: string;
  onLabelChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSystemCategory?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-xl">{title}</h3>
        </div>
        <div className="p-6 space-y-6">
          {/* 类别名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              类别名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="例如：早餐、健身、理发..."
              maxLength={20}
            />
          </div>

          {!isSystemCategory && (
            <>
              {/* 选择图标 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择图标
                </label>
                <div className="grid grid-cols-10 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {EMOJI_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onIconChange(emoji)}
                      className={`p-2 text-2xl hover:bg-gray-100 rounded-lg transition-colors ${
                        icon === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* 选择颜色 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择颜色
                </label>
                <div className="grid grid-cols-8 gap-3">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      onClick={() => onColorChange(presetColor)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        color === presetColor ? 'ring-4 ring-blue-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                </div>
              </div>

              {/* 预览 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预览
                </label>
                <div
                  className="inline-flex items-center gap-3 px-4 py-3 rounded-lg border-2"
                  style={{ borderColor: color }}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-2xl"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {icon}
                  </div>
                  <span className="font-semibold text-gray-900">
                    {label || '类别名称'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={!label.trim()}>
            确认
          </Button>
        </div>
      </div>
    </div>
  );
}

// 删除对话框组件
function DeleteDialog({
  category,
  categories,
  migrateToKey,
  onMigrateChange,
  onConfirm,
  onCancel,
}: {
  category: Category;
  categories: Category[];
  migrateToKey: string;
  onMigrateChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const hasUsage = (category.usage_count || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-xl text-red-600">删除类别</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            确定要删除类别 <span className="font-semibold">"{category.label}"</span> 吗？
          </p>

          {hasUsage && (
            <>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ 该类别有 <span className="font-semibold">{category.usage_count}</span> 笔交易记录
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  将现有交易迁移到 <span className="text-red-500">*</span>
                </label>
                <select
                  value={migrateToKey}
                  onChange={(e) => onMigrateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- 请选择目标类别 --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.key}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            此操作不可撤销，请谨慎操作。
          </p>
        </div>
        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={hasUsage && !migrateToKey}
          >
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}
