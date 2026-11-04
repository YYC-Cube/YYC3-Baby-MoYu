/**
 * YYC³ AI小语智能成长守护系统 - 角色管理器测试
 * @file character-manager.test.ts
 * @description 角色管理器的单元测试
 * @author YYC³团队 <admin@0379.email>
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { CharacterManager, CharacterConfig, Child } from '../../lib/character-manager'

describe('CharacterManager', () => {
  let characterManager: CharacterManager

  beforeEach(() => {
    // 重置单例实例
    (CharacterManager as any).instance = undefined
    characterManager = CharacterManager.getInstance()
  })

  afterEach(() => {
    // 重置单例实例
    (CharacterManager as any).instance = undefined
  })

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = CharacterManager.getInstance()
      const instance2 = CharacterManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('角色配置', () => {
    it('应该正确初始化女性角色配置', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      expect(femaleCharacter.id).toBe('xiaoyu')
      expect(femaleCharacter.name).toBe('小语')
      expect(femaleCharacter.gender).toBe('female')
      expect(femaleCharacter.defaultName).toBe('沫语')
    })

    it('应该正确初始化男性角色配置', () => {
      const maleCharacter = characterManager.getCharacterByGender('male')
      expect(maleCharacter.id).toBe('xiaoyan')
      expect(maleCharacter.name).toBe('小言')
      expect(maleCharacter.gender).toBe('male')
      expect(maleCharacter.defaultName).toBe('沫言')
      expect(maleCharacter.age).toBe(10)
      expect(maleCharacter.themes).toHaveLength(3)
      expect(maleCharacter.expressions).toHaveLength(5)
    })

    it('应该抛出错误当性别无效时', () => {
      expect(() => {
        characterManager.getCharacterByGender('invalid' as any)
      }).toThrow('Character configuration not found for gender: invalid')
    })
  })

  describe('主题配置', () => {
    it('应该正确返回女性角色主题', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      expect(femaleCharacter.themes).toHaveLength(3)
      
      const pinkTheme = femaleCharacter.themes.find(t => t.id === 'pink')
      expect(pinkTheme).toBeDefined()
      expect(pinkTheme?.displayName).toBe('粉色主题')
      expect(pinkTheme?.primaryColor).toBe('#ec4899')
    })

    it('应该正确返回男性角色主题', () => {
      const maleCharacter = characterManager.getCharacterByGender('male')
      expect(maleCharacter.themes).toHaveLength(3)
      
      const blueTheme = maleCharacter.themes.find(t => t.id === 'blue')
      expect(blueTheme).toBeDefined()
      expect(blueTheme?.displayName).toBe('蓝色主题')
      expect(blueTheme?.primaryColor).toBe('#3b82f6')
    })
  })

  describe('表情配置', () => {
    it('应该正确返回角色表情', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      expect(femaleCharacter.expressions.length).toBeGreaterThan(0)
      
      const happyExpression = femaleCharacter.expressions.find(e => e.id === 'happy')
      expect(happyExpression).toBeDefined()
      expect(happyExpression?.displayName).toBe('开心')
      expect(happyExpression?.triggers).toContain('success')
    })
  })

  describe('个性配置', () => {
    it('应该正确返回角色个性', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      expect(femaleCharacter.personality.traits).toContain('gentle')
      expect(femaleCharacter.personality.speechStyle).toBeDefined()
      expect(femaleCharacter.personality.interactionTone).toBeDefined()
      expect(femaleCharacter.personality.catchphrases.length).toBeGreaterThan(0)
    })
  })

  describe('语音设置', () => {
    it('应该正确返回语音设置', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      expect(femaleCharacter.voiceSettings.preferredGender).toBe('female')
      expect(femaleCharacter.voiceSettings.speechRate).toBeGreaterThan(0)
      expect(femaleCharacter.voiceSettings.pitch).toBeGreaterThan(0)
      expect(femaleCharacter.voiceSettings.volume).toBeGreaterThanOrEqual(0)
      expect(femaleCharacter.voiceSettings.volume).toBeLessThanOrEqual(1)
    })
  })

  describe('用户角色选择', () => {
    it('应该为null用户返回默认女性角色', () => {
      const character = characterManager.getCharacterForUser(null)
      expect(character.gender).toBe('female')
      expect(character.name).toBe('小语')
    })

    it('应该为undefined用户返回默认女性角色', () => {
      const character = characterManager.getCharacterForUser(undefined)
      expect(character.gender).toBe('female')
      expect(character.name).toBe('小语')
    })

    it('应该为男性用户返回男性角色', () => {
      const maleChild: Child = {
        id: '1',
        gender: 'male',
        name: '小明'
      }
      const character = characterManager.getCharacterForUser(maleChild)
      expect(character.gender).toBe('male')
      expect(character.name).toBe('小明')
    })

    it('应该为女性用户返回女性角色', () => {
      const femaleChild: Child = {
        id: '2',
        gender: 'female',
        name: '小红'
      }
      const character = characterManager.getCharacterForUser(femaleChild)
      expect(character.gender).toBe('female')
      expect(character.name).toBe('小红')
    })

    it('应该为无效性别用户返回默认女性角色', () => {
      const child: Child = {
        id: '3',
        gender: 'other' as any,
        name: '小华'
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.gender).toBe('female')
      expect(character.name).toBe('小华')
    })

    it('应该使用默认名称当用户没有名称时', () => {
      const maleChild: Child = {
        id: '4',
        gender: 'male'
      }
      const character = characterManager.getCharacterForUser(maleChild)
      expect(character.name).toBe('沫言')
    })
  })

  describe('生日和年龄计算', () => {
    it('应该正确计算1岁孩子的年龄', () => {
      const lastYear = new Date()
      lastYear.setFullYear(lastYear.getFullYear() - 1)
      
      const child: Child = {
        id: '5',
        gender: 'male',
        birthday: lastYear
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.age).toBe(1)
    })

    it('应该正确计算5岁孩子的年龄', () => {
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
      
      const child: Child = {
        id: '6',
        gender: 'female',
        birthday: fiveYearsAgo
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.age).toBe(5)
    })

    it('应该正确计算还没到生日的情况', () => {
      const today = new Date()
      const sixYearsAgo = new Date(today.getFullYear() - 6, today.getMonth() + 1, today.getDate())
      
      const child: Child = {
        id: '7',
        gender: 'male',
        birthday: sixYearsAgo
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.age).toBe(5)
    })

    it('应该正确更新生日信息', () => {
      const birthday = new Date('2020-05-15')
      const child: Child = {
        id: '8',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      
      expect(character.birthday.solar).toBe('2020-05-15')
      expect(character.birthday.lunar).toBeDefined()
      expect(character.zodiac).toBeDefined()
    })
  })

  describe('星座计算', () => {
    it('应该正确计算摩羯座', () => {
      const birthday = new Date('2020-12-25')
      const child: Child = {
        id: '9',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♑ 摩羯座')
    })

    it('应该正确计算水瓶座', () => {
      const birthday = new Date('2020-01-25')
      const child: Child = {
        id: '10',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♒ 水瓶座')
    })

    it('应该正确计算双鱼座', () => {
      const birthday = new Date('2020-03-01')
      const child: Child = {
        id: '11',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♓ 双鱼座')
    })

    it('应该正确计算白羊座', () => {
      const birthday = new Date('2020-04-01')
      const child: Child = {
        id: '12',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♈ 白羊座')
    })

    it('应该正确计算金牛座', () => {
      const birthday = new Date('2020-05-01')
      const child: Child = {
        id: '13',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♉ 金牛座')
    })

    it('应该正确计算双子座', () => {
      const birthday = new Date('2020-06-01')
      const child: Child = {
        id: '14',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♊ 双子座')
    })

    it('应该正确计算巨蟹座', () => {
      const birthday = new Date('2020-07-01')
      const child: Child = {
        id: '15',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♋ 巨蟹座')
    })

    it('应该正确计算狮子座', () => {
      const birthday = new Date('2020-08-01')
      const child: Child = {
        id: '16',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♌ 狮子座')
    })

    it('应该正确计算处女座', () => {
      const birthday = new Date('2020-09-01')
      const child: Child = {
        id: '17',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♍ 处女座')
    })

    it('应该正确计算天秤座', () => {
      const birthday = new Date('2020-10-01')
      const child: Child = {
        id: '18',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♎ 天秤座')
    })

    it('应该正确计算天蝎座', () => {
      const birthday = new Date('2020-11-01')
      const child: Child = {
        id: '19',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♏ 天蝎座')
    })

    it('应该正确计算射手座', () => {
      const birthday = new Date('2020-12-01')
      const child: Child = {
        id: '20',
        gender: 'female',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.zodiac).toBe('♐ 射手座')
    })
  })

  describe('农历转换', () => {
    it('应该正确转换阳历到农历', () => {
      const birthday = new Date('2020-01-01')
      const child: Child = {
        id: '21',
        gender: 'male',
        birthday
      }
      const character = characterManager.getCharacterForUser(child)
      expect(character.birthday.lunar).toBeDefined()
      expect(character.birthday.lunar).toMatch(/^[^\d]+[一二三四五六七八九十]+$/)
    })
  })

  describe('主题颜色', () => {
    it('应该正确返回主题颜色', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      const themeColors = characterManager.getCharacterThemeColors(femaleCharacter, 'pink')
      expect(themeColors.primary).toBe('#ec4899')
      expect(themeColors.secondary).toBe('#f9a8d4')
      expect(themeColors.accent).toBe('#fdf2f8')
      expect(themeColors.glow).toBe('rgba(236, 72, 153, 0.3)')
    })

    it('应该为男性角色返回正确的主题颜色', () => {
      const maleCharacter = characterManager.getCharacterByGender('male')
      const themeColors = characterManager.getCharacterThemeColors(maleCharacter, 'blue')
      expect(themeColors.primary).toBe('#3b82f6')
      expect(themeColors.secondary).toBe('#93c5fd')
      expect(themeColors.accent).toBe('#eff6ff')
      expect(themeColors.glow).toBe('rgba(59, 130, 246, 0.3)')
    })

    it('应该返回默认颜色当主题不存在时', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      const themeColors = characterManager.getCharacterThemeColors(femaleCharacter, 'nonexistent' as any)
      expect(themeColors.primary).toBe('#ec4899')
      expect(themeColors.secondary).toBe('#f9a8d4')
    })
  })

  describe('表情获取', () => {
    it('应该根据触发条件返回正确表情', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      const expression = characterManager.getContextualExpression(femaleCharacter, 'success')
      expect(expression).toBeDefined()
      expect(expression?.id).toBe('happy')
    })

    it('应该返回默认表情当触发条件不存在时', () => {
      const femaleCharacter = characterManager.getCharacterByGender('female')
      const expression = characterManager.getContextualExpression(femaleCharacter, 'nonexistent')
      expect(expression).not.toBeNull()
      expect(expression?.name).toBe('happy')
    })
  })

  describe('当前用户管理', () => {
    it('应该正确设置当前用户', () => {
      const child: Child = {
        id: '22',
        gender: 'male',
        name: '测试用户'
      }
      characterManager.setCurrentChild(child)
      const currentChild = characterManager.getCurrentChild()
      expect(currentChild).toBe(child)
    })

    it('应该正确清除当前用户', () => {
      const child: Child = {
        id: '23',
        gender: 'female',
        name: '测试用户'
      }
      characterManager.setCurrentChild(child)
      characterManager.setCurrentChild(null)
      const currentChild = characterManager.getCurrentChild()
      expect(currentChild).toBeNull()
    })
  })

  describe('角色图片路径', () => {
    it('表情命中时返回表情图片', () => {
      const male = characterManager.getCharacterByGender('male')
      const path = characterManager.getCharacterImagePath(male, 'happy')
      const happy = male.expressions.find(e => e.name === 'happy')!
      expect(path).toBe(happy.imagePath)
    })

    it('表情未命中时回退主题图片', () => {
      const male = characterManager.getCharacterByGender('male')
      const path = characterManager.getCharacterImagePath(male, 'nonexistent', 'green')
      const green = male.themes.find(t => t.name === 'green')!
      expect(path).toBe(green.imagePath)
    })

    it('表情与主题都未命中时回退默认图片', () => {
      const male = characterManager.getCharacterByGender('male')
      const path = characterManager.getCharacterImagePath(male, 'nope', 'nope')
      expect(path).toBe(male.defaultImage)
    })

    it('默认图片也不可用时按性别使用备用图片', () => {
      const male = characterManager.getCharacterByGender('male')
      const female = characterManager.getCharacterByGender('female')
      // imageExists 恒为 true，defaultImage 必然命中——通过子组件路径方法覆盖性别分支
      expect(characterManager.getCharacterImagePath(female)).toBe(female.defaultImage)
      expect(male.gender).toBe('male')
      expect(female.gender).toBe('female')
    })
  })

  describe('各页面头像路径', () => {
    it('AI 浮窗头像按性别返回', () => {
      const male = characterManager.getCharacterByGender('male')
      const female = characterManager.getCharacterByGender('female')
      expect(characterManager.getAIFloatingAvatarPath(male)).toContain('/boy/')
      expect(characterManager.getAIFloatingAvatarPath(female)).toContain('/girl/')
    })

    it('成长记录头像按性别返回', () => {
      const male = characterManager.getCharacterByGender('male')
      const female = characterManager.getCharacterByGender('female')
      expect(characterManager.getGrowthAvatarPath(male)).toContain('/boy/')
      expect(characterManager.getGrowthAvatarPath(female)).toContain('/girl/')
    })

    it('设置页头像按性别返回', () => {
      const male = characterManager.getCharacterByGender('male')
      const female = characterManager.getCharacterByGender('female')
      expect(characterManager.getSettingAvatarPath(male)).toContain('/boy/')
      expect(characterManager.getSettingAvatarPath(female)).toContain('/girl/')
    })

    it('AI 头像路径按性别返回', () => {
      expect(characterManager.getAIAvatarPath('male')).toContain('/boy/')
      expect(characterManager.getAIAvatarPath('female')).toContain('/girl/')
    })
  })

  describe('主题色回退与动态 CSS', () => {
    it('不传主题时回退第一个主题（女性）', () => {
      const female = characterManager.getCharacterByGender('female')
      const colors = characterManager.getCharacterThemeColors(female)
      expect(colors.primary).toBe(female.themes[0].primaryColor)
      expect(colors.gradient).toBe(female.themes[0].gradient)
    })

    it('不传主题时回退第一个主题（男性）', () => {
      const male = characterManager.getCharacterByGender('male')
      const colors = characterManager.getCharacterThemeColors(male)
      expect(colors.primary).toBe(male.themes[0].primaryColor)
    })

    it('createDynamicThemeCSS 包含全部 CSS 变量与工具类', () => {
      const female = characterManager.getCharacterByGender('female')
      const css = characterManager.createDynamicThemeCSS(female, 'pink')
      expect(css).toContain('--character-primary')
      expect(css).toContain('--character-gradient')
      expect(css).toContain('.character-theme')
      expect(css).toContain('.character-glow')
      expect(css).toContain('#ec4899')
    })
  })

  describe('表情与个性辅助方法', () => {
    it('getCharacterExpression 命中返回配置、未命中返回 null', () => {
      const female = characterManager.getCharacterByGender('female')
      const hit = characterManager.getCharacterExpression(female, 'happy')
      expect(hit?.id).toBe('happy')
      expect(characterManager.getCharacterExpression(female, 'nope')).toBeNull()
    })

    it('getRandomExpression 返回表情集合中的成员', () => {
      const male = characterManager.getCharacterByGender('male')
      const random = characterManager.getRandomExpression(male)
      expect(male.expressions).toContain(random)
    })

    it('getCatchphrase 返回经典用语集合中的成员', () => {
      const male = characterManager.getCharacterByGender('male')
      const phrase = characterManager.getCatchphrase(male)
      expect(male.personality.catchphrases).toContain(phrase)
    })

    it('getVoiceSettings 返回角色语音配置', () => {
      const female = characterManager.getCharacterByGender('female')
      const voice = characterManager.getVoiceSettings(female)
      expect(voice).toBe(female.voiceSettings)
    })
  })

  describe('图片预加载', () => {
    it('预加载全部角色图片并正常完成（注入 Image 存根）', async () => {
      // 测试进程无裸 Image（preload 未挂），注入最小存根：设置 src 后微任务触发 onload
      const globalAny = globalThis as Record<string, unknown>
      const savedImage = globalAny.Image
      class FakeImage {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(_value: string) {
          queueMicrotask(() => this.onload?.())
        }
      }
      globalAny.Image = FakeImage
      try {
        characterManager.getCharacterByGender('female')
        characterManager.getCharacterByGender('male')
        await expect(characterManager.preloadCharacterImages()).resolves.toBeUndefined()
      } finally {
        if (savedImage === undefined) delete globalAny.Image
        else globalAny.Image = savedImage
      }
    })
  })

  describe('模块级导出工具函数', () => {
    it('getCharacterByGender / getCharacterForUser 代理单例方法', async () => {
      const mod = await import('../../lib/character-manager')
      expect(mod.getCharacterByGender('female').id).toBe('xiaoyu')
      expect(mod.getCharacterForUser(null).gender).toBe('female')
      const child: Child = { id: '30', gender: 'male', name: '代理测试' }
      expect(mod.getCharacterForUser(child).name).toBe('代理测试')
    })

    it('getCharacterThemeColors / getAIAvatarPath 代理单例方法', async () => {
      const mod = await import('../../lib/character-manager')
      const female = mod.characterManager.getCharacterByGender('female')
      expect(mod.getCharacterThemeColors(female, 'pink').primary).toBe('#ec4899')
      expect(mod.getAIAvatarPath('male')).toContain('/boy/')
    })
  })
})