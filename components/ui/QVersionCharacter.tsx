'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChildren } from '@/hooks/useChildren'
import type { Child } from '@/lib/db/types'
import { characterManager } from '@/lib/character-manager'

interface QVersionCharacterProps {
  childId?: string
  className?: string
  showName?: boolean
  interactive?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onGenderChange?: (gender: 'male' | 'female') => void
  mood?: string
}

export default function QVersionCharacter({
  childId,
  className = '',
  showName = true,
  interactive = false,
  size = 'md',
  onGenderChange,
  mood = 'happy'
}: QVersionCharacterProps) {
  // 数据来源：/api/children（真实档案 + 租户隔离）；不再使用内置假数据
  const { currentChild, children } = useChildren()
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayGender, setDisplayGender] = useState<'male' | 'female'>('female')

  // 获取目标儿童信息
  const targetChild = childId
    ? children.find(child => child.id === childId)
    : currentChild

  // 当前展示性别：优先真实档案，回退交互切换值（渲染期派生，无需 effect 同步 prop → state）
  const currentGender = targetChild?.gender === 'male' || targetChild?.gender === 'female'
    ? targetChild.gender
    : displayGender

  // 根据性别确定角色名称
  const getCharacterName = (gender: 'male' | 'female', child?: Child | null): string => {
    // 有真实档案则用档案姓名；无档案时用产品统称，绝不编造具体孩子姓名
    if (child?.name) {
      return child.name
    }
    return '小语'
  }

  // 根据用户信息和心情获取角色信息
  const getCharacterImage = (child: Child | null, currentMood: string): string => {
    const character = characterManager.getCharacterForUser(child)
    return characterManager.getCharacterImagePath(character, currentMood)
  }

  // 根据性别确定主题色
  const getThemeColors = (gender: 'male' | 'female') => {
    return gender === 'male'
      ? {
          primary: 'from-blue-400 to-blue-600',
          secondary: 'from-sky-300 to-blue-400',
          accent: 'bg-blue-100 text-blue-600 border-blue-200',
          glow: 'shadow-blue-200'
        }
      : {
          primary: 'from-pink-400 to-pink-600',
          secondary: 'from-rose-300 to-pink-400',
          accent: 'bg-pink-100 text-pink-600 border-pink-200',
          glow: 'shadow-pink-200'
        }
  }

  // 尺寸配置
  const sizeConfig = {
    sm: { width: 60, height: 60, nameSize: 'text-xs' },
    md: { width: 80, height: 80, nameSize: 'text-sm' },
    lg: { width: 120, height: 120, nameSize: 'text-base' },
    xl: { width: 160, height: 160, nameSize: 'text-lg' }
  }

  const currentSize = sizeConfig[size]

  // 性别变换动画
  const handleGenderToggle = () => {
    if (!interactive || !targetChild) return

    setIsAnimating(true)

    // 延迟切换性别，让动画先播放
    setTimeout(() => {
      const newGender = currentGender === 'male' ? 'female' : 'male'
      setDisplayGender(newGender)
      onGenderChange?.(newGender)
    }, 300)

    // 动画结束后重置状态
    setTimeout(() => {
      setIsAnimating(false)
    }, 600)
  }

  const themeColors = getThemeColors(currentGender)
  const characterName = getCharacterName(currentGender, targetChild)

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Q版角色头像 */}
      <motion.div
        className={`relative cursor-${interactive ? 'pointer' : 'default'} group`}
        whileHover={interactive ? { scale: 1.05 } : {}}
        whileTap={interactive ? { scale: 0.95 } : {}}
        onClick={handleGenderToggle}
        style={{
          width: currentSize.width,
          height: currentSize.height
        }}
      >
        {/* 角色图片 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentGender}
            initial={{
              opacity: 0,
              rotate: isAnimating ? (currentGender === 'male' ? -15 : 15) : 0,
              scale: 0.8
            }}
            animate={{
              opacity: 1,
              rotate: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              rotate: currentGender === 'male' ? 15 : -15,
              scale: 0.8
            }}
            transition={{
              duration: 0.4,
              ease: "easeInOut"
            }}
            className="w-full h-full rounded-full overflow-hidden"
          >
            <img
              src={getCharacterImage(targetChild ?? null, mood)}
              alt={characterName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 如果图片加载失败，显示默认样式
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.parentElement!.innerHTML = `
                  <div class="w-full h-full bg-linear-to-br ${currentGender === 'male' ? 'from-blue-400 to-blue-600' : 'from-pink-400 to-pink-600'} flex items-center justify-center">
                    <span class="text-white font-bold text-2xl">${currentGender === 'male' ? '男' : '女'}</span>
                  </div>
                `
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* 光环效果 */}
        {interactive && (
          <motion.div
            className={`absolute inset-0 rounded-full ${themeColors.glow} opacity-0 group-hover:opacity-50 transition-opacity duration-300`}
            animate={{
              boxShadow: isAnimating
                ? `0 0 ${size === 'xl' ? 40 : size === 'lg' ? 30 : 20}px ${currentGender === 'male' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(236, 72, 153, 0.5)'}`
                : '0 0 0px transparent'
            }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* 交互提示 */}
        {interactive && (
          <motion.div
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap"
            initial={{ y: 5 }}
            animate={{ y: 0 }}
          >
            点击切换性别
          </motion.div>
        )}
      </motion.div>

      {/* 角色名称 */}
      {showName && (
        <motion.div
          key={`name-${currentGender}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={`mt-2 text-center ${currentSize.nameSize} font-medium text-slate-700`}
        >
          <span className={`bg-linear-to-r ${themeColors.primary} bg-clip-text text-transparent font-bold`}>
            {characterName}
          </span>
          {targetChild?.nickname && (
            <span className="text-slate-500 ml-1">({targetChild.nickname})</span>
          )}
        </motion.div>
      )}

      {/* 性别标签 */}
      {showName && (
        <motion.div
          key={`tag-${currentGender}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${themeColors.accent} border`}
        >
          {currentGender === 'male' ? '男宝宝' : '女宝宝'}
        </motion.div>
      )}
    </div>
  )
}

// 角色展示组件（用于展示当前儿童的Q版形象）
export function ChildQVersionAvatar({
  child,
  size = 'md'
}: {
  child: Child | null | undefined
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!child) return null

  return (
    <QVersionCharacter
      childId={child.id}
      size={size}
      interactive={false}
      showName={true}
    />
  )
}

// 性别选择器组件（用于儿童档案编辑）
export function GenderSelector({
  value,
  onChange,
  size = 'lg'
}: {
  value: 'male' | 'female' | 'other' | undefined
  onChange: (gender: 'male' | 'female' | 'other') => void
  size?: 'md' | 'lg' | 'xl'
}) {
  const handleCharacterClick = (gender: 'male' | 'female') => {
    onChange(gender)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <QVersionCharacter
            interactive={true}
            size={size}
            onGenderChange={handleCharacterClick}
          />
          {value === 'male' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 text-sm font-medium text-blue-600"
            >
              已选择：沫言
            </motion.div>
          )}
          {value === 'female' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-2 text-sm font-medium text-pink-600"
            >
              已选择：沫语
            </motion.div>
          )}
        </div>
      </div>

      {/* 其他性别选项 */}
      <div className="flex justify-center">
        <button
          onClick={() => { onChange('other'); }}
          className={`px-4 py-2 rounded-lg border-2 transition-all ${
            value === 'other'
              ? 'border-slate-400 bg-slate-50 text-slate-700'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          其他
        </button>
      </div>
    </div>
  )
}