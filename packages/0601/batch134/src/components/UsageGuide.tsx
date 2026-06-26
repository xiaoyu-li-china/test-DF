import { useState } from 'react'
import { ChevronDown, ChevronUp, Heart, Check, X, HelpCircle, Download } from 'lucide-react'
import { clsx } from 'clsx'

export default function UsageGuide() {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="max-w-2xl mx-auto px-4 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-warm-100/60 rounded-xl border border-warm-200/60 hover:bg-warm-100 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-gold/10 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-rose-gold" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-base font-semibold text-warm-300/90">
              使用说明
            </h3>
            <p className="text-xs font-body text-warm-300/50">
              3 分钟选片指南
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-warm-300/40" />
        ) : (
          <ChevronDown className="w-5 h-5 text-warm-300/40" />
        )}
      </button>

      <div
        className={clsx(
          'overflow-hidden transition-all duration-300',
          isExpanded ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        )}
      >
        <div className="bg-white/50 rounded-xl border border-warm-200/60 p-5 space-y-5">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-sage-light/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-sage-light" />
              </div>
              <div>
                <h4 className="font-body text-sm font-medium text-warm-300/80 mb-1">
                  标记「要」的照片
                </h4>
                <p className="text-xs font-body text-warm-300/50 leading-relaxed">
                  点击每张照片下方的 <span className="text-sage-light font-medium">「要」</span> 按钮，
                  表示您希望精修并保留这张照片。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-mist-light/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-3.5 h-3.5 text-warm-300/60" />
              </div>
              <div>
                <h4 className="font-body text-sm font-medium text-warm-300/80 mb-1">
                  标记「不要」的照片
                </h4>
                <p className="text-xs font-body text-warm-300/50 leading-relaxed">
                  点击 <span className="text-warm-300/60 font-medium">「不要」</span> 按钮，
                  这张照片将不会被精修。已标记「不要」的照片会略微淡出显示。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blush-light/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HelpCircle className="w-3.5 h-3.5 text-blush-light" />
              </div>
              <div>
                <h4 className="font-body text-sm font-medium text-warm-300/80 mb-1">
                  标记「待定」的照片
                </h4>
                <p className="text-xs font-body text-warm-300/50 leading-relaxed">
                  暂时拿不定主意？点击 <span className="text-blush-light font-medium">「待定」</span> 按钮，
                  可以稍后与家人商量后再决定。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-rose-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Download className="w-3.5 h-3.5 text-rose-gold" />
              </div>
              <div>
                <h4 className="font-body text-sm font-medium text-warm-300/80 mb-1">
                  导出选片清单
                </h4>
                <p className="text-xs font-body text-warm-300/50 leading-relaxed">
                  选片完成后，点击底部的 <span className="text-rose-gold font-medium">「导出CSV」</span> 按钮，
                  即可下载您的选片清单发送给摄影师。
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-warm-200/60 pt-4">
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-rose-gold/60 fill-rose-gold/20 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-body text-warm-300/50 leading-relaxed italic">
                <span className="text-rose-gold/70 font-medium">温馨提示：</span>
                所有标记的照片会自动保存，您可以随时回来继续选片。
                带有 <span className="text-rose-gold font-medium">「锁定」</span> 标记的照片是摄影师为您精选保留的，不可取消哦～
              </p>
            </div>
          </div>

          <div className="bg-rose-gold/5 rounded-lg p-3 border border-rose-gold/10">
            <p className="text-xs font-body text-rose-gold/70 text-center leading-relaxed">
              ✨ 选片过程中有任何问题，随时联系您的摄影师 ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
