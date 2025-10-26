import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3
} from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">个人信息设置</h2>
          <p className="text-gray-600">管理您的个人资料和账户信息</p>
        </div>

        <div className="space-y-8">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    placeholder="请输入用户名"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="请输入邮箱地址"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Button variant="outline" size="sm">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手机号码
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="请输入手机号码"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Button variant="outline" size="sm">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  个人简介
                </label>
                <textarea
                  rows={3}
                  placeholder="请输入个人简介"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 地理位置信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                地理位置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    国家/地区
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">请选择国家/地区</option>
                    <option value="CN">中国</option>
                    <option value="US">美国</option>
                    <option value="UK">英国</option>
                    <option value="JP">日本</option>
                    <option value="KR">韩国</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    城市
                  </label>
                  <input
                    type="text"
                    placeholder="请输入城市名称"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  详细地址
                </label>
                <input
                  type="text"
                  placeholder="请输入详细地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 时间设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                时间设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    时区
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="UTC+8">UTC+8 (北京时间)</option>
                    <option value="UTC+0">UTC+0 (伦敦时间)</option>
                    <option value="UTC-5">UTC-5 (纽约时间)</option>
                    <option value="UTC-8">UTC-8 (洛杉矶时间)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    日期格式
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  货币单位
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                  <option value="GBP">英镑 (GBP)</option>
                  <option value="JPY">日元 (JPY)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 隐私设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                隐私设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">公开个人资料</div>
                    <div className="text-sm text-gray-500">允许其他用户查看您的基本信息</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">接收邮件通知</div>
                    <div className="text-sm text-gray-500">接收系统重要通知和更新</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" defaultChecked />
                </label>

                <label className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">数据统计</div>
                    <div className="text-sm text-gray-500">允许系统收集使用数据以改善服务</div>
                  </div>
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" defaultChecked />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
              保存更改
            </Button>
            <Button variant="outline" className="flex-1">
              重置
            </Button>
          </div>

          {/* 账户安全 */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <User className="h-5 w-5" />
                账户安全
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start">
                  <span>🔑</span>
                  <span className="ml-2">修改密码</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <span>📱</span>
                  <span className="ml-2">双重认证</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <span>📧</span>
                  <span className="ml-2">邮箱验证</span>
                </Button>
                <Button variant="outline" className="justify-start">
                  <span>📱</span>
                  <span className="ml-2">设备管理</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 使用提示 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">💡 安全提示</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 定期更新您的密码，使用强密码</li>
              <li>• 启用双重认证以提高账户安全性</li>
              <li>• 不要在公共设备上保存登录信息</li>
              <li>• 及时更新个人联系方式以确保重要通知不会遗漏</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}