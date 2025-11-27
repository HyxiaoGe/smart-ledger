'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ThumbsUp, ThumbsDown, Star, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiFeedbackService } from '@/lib/services/ai';
import type { FeedbackTemplate, FeedbackQuestion } from '@/types/ai-feedback';

interface AIFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: FeedbackTemplate;
  context?: any;
  onSuccess?: () => void;
}

export function AIFeedbackModal({
  isOpen,
  onClose,
  template,
  context,
  onSuccess
}: AIFeedbackModalProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setAnswers({});
      setIsSubmitted(false);
    }
  }, [isOpen]);

  // 处理答案变化
  const handleAnswerChange = useCallback((questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  }, []);

  // 验证必填项
  const validateForm = useCallback((): boolean => {
    const requiredQuestions = template.config.questions.filter(q => q.required);
    return requiredQuestions.every(q => {
      const answer = answers[q.id];
      if (answer === undefined || answer === null) return false;
      if (typeof answer === 'string' && answer.trim() === '') return false;
      if (Array.isArray(answer) && answer.length === 0) return false;
      return true;
    });
  }, [answers, template.config.questions]);

  // 提交反馈
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      alert('请完成所有必填项');
      return;
    }

    setIsSubmitting(true);

    try {
      // 准备反馈数据
      const feedbackData: any = {
        feedbackType: template.feedbackType,
        context: {
          ...context,
          templateId: template.id,
          userAgent: navigator.userAgent
        }
      };

      // 根据反馈类型设置数据
      switch (template.feedbackType) {
        case 'rating':
          feedbackData.rating = answers.accuracy || answers.helpfulness;
          if (answers.comment) {
            feedbackData.comment = answers.comment;
          }
          break;

        case 'thumbs_up_down':
          feedbackData.isPositive = answers.helpful;
          if (answers.comment) {
            feedbackData.comment = answers.comment;
          }
          break;

        case 'text_comment':
          feedbackData.comment = answers.comment;
          break;

        case 'multiple_choice':
          feedbackData.choices = answers.choices;
          break;

        case 'binary_choice':
          feedbackData.isPositive = answers.correct;
          break;
      }

      // 提交反馈
      await aiFeedbackService.collectFeedback(template.featureType, feedbackData);

      setIsSubmitted(true);
      onSuccess?.();

      // 延迟关闭
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('提交AI反馈失败:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, template, context, validateForm, onSuccess, onClose]);

  // 渲染问题
  const renderQuestion = (question: FeedbackQuestion) => {
    const answer = answers[question.id];

    switch (question.type) {
      case 'rating':
        return (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleAnswerChange(question.id, rating)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  answer === rating
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-white border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-blue-300'
                }`}
              >
                <Star className="w-4 h-4" fill={answer === rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        );

      case 'thumbs':
        return (
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleAnswerChange(question.id, true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                answer === true
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-white border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-green-300'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>有用</span>
            </button>
            <button
              onClick={() => handleAnswerChange(question.id, false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                answer === false
                  ? 'bg-red-50 border-red-500 text-red-700'
                  : 'bg-white border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-red-300'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>无用</span>
            </button>
          </div>
        );

      case 'text':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
          />
        );

      case 'choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={answer?.includes(option) || false}
                  onChange={(e) => {
                    const currentAnswers = answer || [];
                    if (e.target.checked) {
                      handleAnswerChange(question.id, [...currentAnswers, option]);
                    } else {
                      handleAnswerChange(question.id, currentAnswers.filter((a: string) => a !== option));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* 模态框 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white rounded-xl shadow-2xl"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {template.config.title || 'AI反馈'}
              </h3>
              {template.config.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {template.config.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          {/* 内容 */}
          <div className="p-6">
            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  感谢您的反馈！
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
                  您的意见将帮助我们改进AI功能
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {template.config.questions.map((question) => (
                  <div key={question.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        {question.label}
                      </label>
                      {question.required && (
                        <span className="text-xs text-red-500">*</span>
                      )}
                    </div>
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          {!isSubmitted && (
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-gray-600 hover:text-gray-900"
              >
                稍后说
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !validateForm()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    提交反馈
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// 反馈触发器组件 - 用于自动显示反馈
interface AIFeedbackTriggerProps {
  featureType: any;
  templateId?: string;
  context?: any;
  triggerDelay?: number;
  showTrigger?: boolean;
}

export function AIFeedbackTrigger({
  featureType,
  templateId,
  context,
  triggerDelay = 5000,
  showTrigger = true
}: AIFeedbackTriggerProps) {
  const [showModal, setShowModal] = useState(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!showTrigger || triggered) return;

    const timer = setTimeout(() => {
      // 检查是否可以收集反馈
      const feedbacks = aiFeedbackService.getAllFeedbacks();
      const recentFeedbacks = feedbacks.filter(f => {
        const feedbackTime = new Date(f.timestamp);
        const now = new Date();
        return now.getTime() - feedbackTime.getTime() < 30 * 60 * 1000; // 30分钟内
      });

      if (recentFeedbacks.length < 3) { // 限制频率
        setShowModal(true);
        setTriggered(true);
      }
    }, triggerDelay);

    return () => clearTimeout(timer);
  }, [triggerDelay, showTrigger, triggered]);

  return (
    <>
      {showTrigger && !triggered && (
        <button
          onClick={() => {
            setShowModal(true);
            setTriggered(true);
          }}
          className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
          title="提供AI反馈"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      <AIFeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        template={aiFeedbackService.getTemplate(templateId || `${featureType}_rating`)!}
        context={context}
      />
    </>
  );
}

// 快速反馈组件 - 内联显示
interface QuickFeedbackProps {
  featureType: any;
  context?: any;
  onFeedback?: (positive: boolean) => void;
  className?: string;
}

export function QuickFeedback({
  featureType,
  context,
  onFeedback,
  className = ''
}: QuickFeedbackProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const handleFeedback = async (positive: boolean) => {
    setFeedback(positive);

    try {
      await aiFeedbackService.collectFeedback(featureType, {
        feedbackType: 'thumbs_up_down',
        isPositive: positive,
        context
      });

      onFeedback?.(positive);
    } catch (error) {
      console.error('提交快速反馈失败:', error);
      setFeedback(null);
    }
  };

  if (feedback !== null) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className="text-green-600">
          ✓ 感谢您的反馈
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">这个AI功能有帮助吗？</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback(true)}
          className="p-1 rounded hover:bg-green-50 transition-colors"
          title="有用"
        >
          <ThumbsUp className="w-4 h-4 text-green-600" />
        </button>
        <button
          onClick={() => handleFeedback(false)}
          className="p-1 rounded hover:bg-red-50 transition-colors"
          title="无用"
        >
          <ThumbsDown className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
}