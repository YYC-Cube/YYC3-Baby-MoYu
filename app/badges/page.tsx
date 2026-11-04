"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { formatDateByLocale } from "@/lib/i18n/format"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import PageHeader from "@/components/headers/PageHeader"
import Navigation from "@/components/Navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useChildren } from "@/hooks/useChildren"
import { useBadges } from "@/hooks/useBadges"
import { BADGE_LEVELS } from "@/lib/badges/definitions"
import type { BadgeLevel, BadgeProgress } from "@/types/badges"

const LEVEL_ORDER: BadgeLevel[] = ["bronze", "silver", "gold", "platinum"]

export default function BadgesPage() {
  const t = useTranslations("badges")
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null)
  const { currentChild } = useChildren()
  const { badges, stats, totalPoints, unlockedCount, newUnlocks, loading, error, clearNewUnlocks, refresh } = useBadges(currentChild?.id)

  // P3 数据层词条：30 枚勋章文案/等级/分类/条件全部走 badges 命名空间（zh 与 lib/badges/definitions.ts 逐字一致）
  const badgeTitle = (d: { id: string }) => t(`badgeDefs.${d.id}.title`)
  const badgeDesc = (d: { id: string }) => t(`badgeDefs.${d.id}.description`)
  const badgeLevelLabel = (lv: BadgeLevel) => t(`badgeLevels.${lv}`)

  const categories = ["all", ...Array.from(new Set(badges.map((b) => b.definition.category)))]

  const filteredBadges = badges.filter((b) => {
    const filterMatch = filter === "all" || (filter === "unlocked" ? b.unlocked : !b.unlocked)
    const categoryMatch = selectedCategory === "all" || b.definition.category === selectedCategory
    return filterMatch && categoryMatch
  })

  const completionRate = badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0
  const unlockedByLevel = LEVEL_ORDER.map((lv) => ({
    level: lv,
    count: badges.filter((b) => b.unlocked && b.definition.level === lv).length,
    total: badges.filter((b) => b.definition.level === lv).length,
  }))

  const handleShare = async (badge: BadgeProgress) => {
    if ("share" in navigator) {
      try {
        await navigator.share({
          title: t("shareTitle", { title: badgeTitle(badge.definition) }),
          text: t("shareText", { title: badgeTitle(badge.definition), description: badgeDesc(badge.definition) }),
          url: window.location.href,
        })
      } catch (err) {
        console.log("分享取消:", err)
      }
    } else {
      alert(t("shareUnsupported"))
    }
  }

  const locale = useLocale()
  const formatDate = (iso?: string) => (iso ? formatDateByLocale(iso, locale) : "")

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 via-orange-50 to-yellow-50 pb-24">
      <PageHeader title={t("pageTitle")} showBack />

      <main className="px-4 py-4 space-y-6">
        {/* 成就总览（真实数据） */}
        {currentChild && (
          <Card className="bg-linear-to-r from-amber-500 to-orange-500 border-amber-600">
            <CardContent className="p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{t("achievementsOf", { name: currentChild.name })}</h3>
                  <p className="text-white/80 text-sm">
                    {t("unlockedSummary", { count: unlockedCount, total: badges.length, points: totalPoints })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{completionRate}%</div>
                  <div className="text-xs text-white/70">{t("completionRate")}</div>
                </div>
              </div>
              <Progress value={completionRate} className="mt-4 bg-white/20" />
              {stats && (
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  {[
                    { label: t("statRecords"), value: stats.totalRecords },
                    { label: t("statHomework"), value: stats.completedHomework },
                    { label: t("statStreak"), value: stats.streakDays },
                    { label: t("statTags"), value: stats.distinctTags },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/10 rounded-lg py-2">
                      <div className="text-lg font-bold">{item.value}</div>
                      <div className="text-xs text-white/70">{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!currentChild && !loading && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6 text-center">
              <p className="text-amber-700">{t("noChild")}</p>
              <Link href="/children" className="text-blue-600 underline text-sm mt-2 inline-block">{t("goAdd")}</Link>
            </CardContent>
          </Card>
        )}

        {/* 新解锁庆祝条 */}
        <AnimatePresence>
          {newUnlocks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-linear-to-r from-yellow-400 to-amber-500 rounded-2xl p-4 text-white flex items-center gap-3 shadow-lg"
            >
              <span className="text-3xl">{newUnlocks[0].definition.icon}</span>
              <div className="flex-1">
                <p className="font-bold">
                  {newUnlocks.length > 1
                    ? t("unlockedMulti", { count: newUnlocks.length })
                    : t("unlockedSingle", { title: badgeTitle(newUnlocks[0].definition) })}
                </p>
                <p className="text-sm text-white/85">{newUnlocks.map((b) => badgeTitle(b.definition)).join(" · ")}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={clearNewUnlocks}>{t("dismiss")}</Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 等级统计 */}
        <Card>
          <CardContent className="p-4 grid grid-cols-4 gap-2">
            {unlockedByLevel.map(({ level, count, total }) => {
              const meta = BADGE_LEVELS[level]
              return (
                <div key={level} className={`rounded-xl p-3 text-center bg-linear-to-br ${meta.bg} border ${meta.border}`}>
                  <div className="text-2xl">{meta.icon}</div>
                  <div className={`text-sm font-bold ${meta.text}`}>{badgeLevelLabel(level)}</div>
                  <div className="text-xs text-slate-500">{count}/{total} · {t("pointsPer", { points: meta.points })}</div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* 筛选 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("filterTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {([
                { id: "all", labelKey: "filterAll", icon: "ri-apps-line" },
                { id: "unlocked", labelKey: "filterUnlocked", icon: "ri-check-line" },
                { id: "locked", labelKey: "filterLocked", icon: "ri-lock-line" },
              ] as const).map((item) => (
                <motion.button
                  key={item.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${
                    filter === item.id ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                  onClick={() => { setFilter(item.id); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <i className={item.icon} />
                  <span>{t(item.labelKey)}</span>
                </motion.button>
              ))}
              <motion.button
                className="flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                onClick={refresh}
                whileTap={{ scale: 0.95 }}
              >
                <i className="ri-refresh-line" />
                <span>{t("refresh")}</span>
              </motion.button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <motion.button
                  key={category}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                    selectedCategory === category ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                  onClick={() => { setSelectedCategory(category); }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {category === "all" ? t("categoryAll") : t(`badgeCats.${category}`)}
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 加载/错误态 */}
        {loading && (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              <i className="ri-loader-4-line animate-spin text-3xl mb-2 block" />
              {t("evaluating")}
            </CardContent>
          </Card>
        )}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center text-red-600">
              <p>{error}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={refresh}>{t("retry")}</Button>
            </CardContent>
          </Card>
        )}

        {/* 徽章网格 */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredBadges.map((badge, index) => {
                const def = badge.definition
                const levelColor = BADGE_LEVELS[def.level]
                return (
                  <motion.div
                    key={def.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: Math.min(index * 0.03, 0.6) }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    onClick={() => { setSelectedBadge(badge); }}
                    className="cursor-pointer"
                  >
                    <Card className={`h-full ${levelColor.bg} ${levelColor.border} ${levelColor.shadow} shadow-lg ${badge.isNew ? "ring-4 ring-yellow-300 ring-offset-1" : ""}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="relative">
                            <div className={`w-20 h-20 rounded-full bg-linear-to-br ${levelColor.bg} flex items-center justify-center text-4xl shadow-inner ${badge.unlocked ? "" : "opacity-50 grayscale"}`}>
                              {def.icon}
                            </div>
                            {!badge.unlocked && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <i className="ri-lock-line text-2xl text-slate-400" />
                              </div>
                            )}
                            {badge.unlocked && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs shadow-md">
                                {levelColor.icon}
                              </div>
                            )}
                            {badge.isNew && (
                              <div className="absolute -bottom-1 -left-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                NEW
                              </div>
                            )}
                          </div>

                          <div className="flex-1 w-full">
                            <h4 className={`font-bold ${levelColor.text} text-sm mb-1`}>{badgeTitle(def)}</h4>
                            <p className="text-xs text-slate-600 line-clamp-2">{badgeDesc(def)}</p>
                            <Badge variant="secondary" className="mt-2 text-xs">{t(`badgeCats.${def.category}`)}</Badge>
                          </div>

                          {!badge.unlocked && badge.progress > 0 && (
                            <div className="w-full">
                              <Progress value={badge.progress} className="h-2" />
                              <p className="text-xs text-slate-500 mt-1">{badge.progress}%</p>
                            </div>
                          )}

                          {badge.unlocked && badge.unlockedAt && (
                            <p className="text-xs text-slate-500">{t("earnedAt", { date: formatDate(badge.unlockedAt) })}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && !error && filteredBadges.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="ri-trophy-line text-6xl text-slate-300 mb-4" />
              <p className="text-slate-500">{t("empty")}</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Navigation />

      <Dialog open={!!selectedBadge} onOpenChange={() => { setSelectedBadge(null); }}>
        <DialogContent className="max-w-md">
          {selectedBadge && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-4xl">{selectedBadge.definition.icon}</span>
                  <div>
                    <div className="text-lg">{badgeTitle(selectedBadge.definition)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{BADGE_LEVELS[selectedBadge.definition.level].icon} {badgeLevelLabel(selectedBadge.definition.level)}</Badge>
                      <Badge variant="outline">{t(`badgeCats.${selectedBadge.definition.category}`)}</Badge>
                      <Badge variant="outline">{t("pointsPer", { points: BADGE_LEVELS[selectedBadge.definition.level].points })}</Badge>
                    </div>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-base">{badgeDesc(selectedBadge.definition)}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {selectedBadge.unlocked && selectedBadge.unlockedAt && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-green-700 font-medium flex items-center gap-2">
                      <i className="ri-check-circle-line" />
                      {t("earnedAtLong", { date: formatDate(selectedBadge.unlockedAt) })}
                    </p>
                  </div>
                )}

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-amber-700 font-medium mb-2">{t("conditionsTitle")}</p>
                  <ul className="space-y-1 text-sm text-amber-600">
                    {(() => {
                      const def = selectedBadge.definition
                      // P3 i18n：复合型走 condKeys 词条；计数型用 progress 反推当前值渲染动态进度模板
                      if (def.condKeys) return def.condKeys.map((k) => t(k))
                      if (def.progressGoal !== undefined && stats) {
                        const cur = Math.min(
                          Math.round((selectedBadge.progress * def.progressGoal) / 100),
                          def.progressGoal
                        )
                        return [
                          t("condProgress", { desc: badgeDesc(def), cur, goal: def.progressGoal }),
                        ]
                      }
                      return [badgeDesc(def)]
                    })().map((condition, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <i className="ri-arrow-right-line mt-0.5" />
                        {condition}
                      </li>
                    ))}
                  </ul>
                </div>

                {!selectedBadge.unlocked && selectedBadge.progress > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">{t("progressLabel")}</span>
                      <span className="font-medium">{selectedBadge.progress}%</span>
                    </div>
                    <Progress value={selectedBadge.progress} />
                  </div>
                )}

                {selectedBadge.unlocked && (
                  <Button
                    onClick={() => handleShare(selectedBadge).catch((err: unknown) => { console.log("分享失败:", err); })}
                    className="w-full bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    <i className="ri-share-line mr-2" />
                    {t("share")}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
