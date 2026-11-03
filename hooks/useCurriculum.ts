"use client"

import { useState, useEffect, useCallback } from "react"
import {
  hydrateCollection,
  readCollection,
  subscribeCollection,
  writeCollection,
} from "@/lib/client/collection-store"
import {
  type Course,
  type CourseSchedule,
  type Semester,
  getDefaultSemester,
  getSubjectColor,
} from "@/types/curriculum"

const STORAGE_KEY = "yyc3_curriculum"
const SEMESTER_KEY = "yyc3_semester"
// 服务端集合类型：课程表整组持久化（登录后跨设备可见）
const COLLECTION_KIND = "curriculum" as const

function generateId(): string {
  return `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 默认课程数据
function getDefaultCourses(childId: string): Course[] {
  return [
    {
      id: generateId(),
      childId,
      name: "语文",
      subject: "语文",
      teacher: "李老师",
      location: "教室101",
      type: "school",
      color: getSubjectColor("语文"),
      schedules: [
        { id: "1", dayOfWeek: 1, startTime: "08:00", endTime: "08:45", room: "101" },
        { id: "2", dayOfWeek: 3, startTime: "08:00", endTime: "08:45", room: "101" },
        { id: "3", dayOfWeek: 5, startTime: "09:00", endTime: "09:45", room: "101" },
      ],
      notes: "",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: generateId(),
      childId,
      name: "数学",
      subject: "数学",
      teacher: "王老师",
      location: "教室102",
      type: "school",
      color: getSubjectColor("数学"),
      schedules: [
        { id: "4", dayOfWeek: 1, startTime: "09:00", endTime: "09:45", room: "102" },
        { id: "5", dayOfWeek: 2, startTime: "08:00", endTime: "08:45", room: "102" },
        { id: "6", dayOfWeek: 4, startTime: "08:00", endTime: "08:45", room: "102" },
      ],
      notes: "",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: generateId(),
      childId,
      name: "英语",
      subject: "英语",
      teacher: "张老师",
      location: "教室103",
      type: "school",
      color: getSubjectColor("英语"),
      schedules: [
        { id: "7", dayOfWeek: 2, startTime: "09:00", endTime: "09:45", room: "103" },
        { id: "8", dayOfWeek: 4, startTime: "09:00", endTime: "09:45", room: "103" },
        { id: "9", dayOfWeek: 5, startTime: "08:00", endTime: "08:45", room: "103" },
      ],
      notes: "",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: generateId(),
      childId,
      name: "钢琴课",
      subject: "钢琴",
      teacher: "陈老师",
      location: "琴行201",
      type: "extracurricular",
      color: getSubjectColor("钢琴"),
      schedules: [{ id: "10", dayOfWeek: 6, startTime: "10:00", endTime: "11:00", room: "201" }],
      notes: "每周六上午",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: generateId(),
      childId,
      name: "编程思维",
      subject: "编程",
      teacher: "在线老师",
      location: "线上",
      type: "online",
      color: getSubjectColor("编程"),
      schedules: [{ id: "11", dayOfWeek: 7, startTime: "14:00", endTime: "15:00", room: "线上" }],
      notes: "腾讯会议",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]
}

export function useCurriculum() {
  const [courses, setCourses] = useState<Course[]>([])
  const [semester, setSemester] = useState<Semester>(getDefaultSemester())
  const [isLoading, setIsLoading] = useState(true)

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      try {
        const cached = readCollection<
          Omit<Course, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }
        >(COLLECTION_KIND, STORAGE_KEY)

        if (cached && cached.length > 0) {
          setCourses(
            cached.map((c) => ({
              ...c,
              createdAt: new Date(c.createdAt),
              updatedAt: new Date(c.updatedAt),
            })),
          )
        } else if (cached && cached.length === 0) {
          // 用户已清空课程表：尊重空集合
          setCourses([])
        } else {
          // 默认课表仅作首屏占位，不写入持久层（避免把示例数据当作用户数据）
          setCourses(getDefaultCourses("default"))
        }

        // 学期属于单对象配置，暂留 localStorage（见 docs/developer/03-data-model.md 的已知限制）
        const storedSemester = localStorage.getItem(SEMESTER_KEY)
        if (storedSemester) {
          const parsed = JSON.parse(storedSemester) as Omit<Semester, 'startDate' | 'endDate'> & { startDate: string; endDate: string }
          setSemester({
            ...parsed,
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate),
          })
        }
      } catch (error) {
        console.error("加载课程表失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    const unsubscribe = subscribeCollection(COLLECTION_KIND, loadData)
    void hydrateCollection(COLLECTION_KIND, STORAGE_KEY)
    return unsubscribe
  }, [])

  // 保存数据
  const saveData = useCallback((data: Course[]) => {
    writeCollection(COLLECTION_KIND, STORAGE_KEY, data)
  }, [])

  // 添加课程
  const addCourse = useCallback(
    (courseData: Omit<Course, "id" | "createdAt" | "updatedAt">) => {
      const newCourse: Course = {
        ...courseData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setCourses((prev) => {
        const updated = [...prev, newCourse]
        saveData(updated)
        return updated
      })

      return newCourse
    },
    [saveData],
  )

  // 更新课程
  const updateCourse = useCallback(
    (id: string, data: Partial<Course>) => {
      setCourses((prev) => {
        const updated = prev.map((c) => (c.id === id ? { ...c, ...data, updatedAt: new Date() } : c))
        saveData(updated)
        return updated
      })
    },
    [saveData],
  )

  // 删除课程
  const deleteCourse = useCallback(
    (id: string) => {
      setCourses((prev) => {
        const updated = prev.filter((c) => c.id !== id)
        saveData(updated)
        return updated
      })
    },
    [saveData],
  )

  // 获取某天的课程
  const getCoursesByDay = useCallback(
    (dayOfWeek: number) => {
      return courses
        .filter((c) => c.isActive && c.schedules.some((s) => s.dayOfWeek === dayOfWeek))
        .map((c) => ({
          ...c,
          schedules: c.schedules.filter((s) => s.dayOfWeek === dayOfWeek),
        }))
        .sort((a, b) => {
          const aTime = a.schedules[0]?.startTime || "00:00"
          const bTime = b.schedules[0]?.startTime || "00:00"
          return aTime.localeCompare(bTime)
        })
    },
    [courses],
  )

  // 获取按类型分组的课程
  const getCoursesByType = useCallback(
    (type: Course["type"]) => {
      return courses.filter((c) => c.type === type && c.isActive)
    },
    [courses],
  )

  // 检测课程冲突
  const checkConflicts = useCallback(
    (newSchedule: CourseSchedule, excludeCourseId?: string): Course[] => {
      const conflicts: Course[] = []

      courses.forEach((course) => {
        if (course.id === excludeCourseId || !course.isActive) return

        course.schedules.forEach((schedule) => {
          if (schedule.dayOfWeek !== newSchedule.dayOfWeek) return

          const newStart = newSchedule.startTime
          const newEnd = newSchedule.endTime
          const existStart = schedule.startTime
          const existEnd = schedule.endTime

          // 检查时间重叠
          if (
            (newStart >= existStart && newStart < existEnd) ||
            (newEnd > existStart && newEnd <= existEnd) ||
            (newStart <= existStart && newEnd >= existEnd)
          ) {
            if (!conflicts.includes(course)) {
              conflicts.push(course)
            }
          }
        })
      })

      return conflicts
    },
    [courses],
  )

  // 统计信息
  const stats = {
    totalCourses: courses.filter((c) => c.isActive).length,
    schoolCourses: courses.filter((c) => c.type === "school" && c.isActive).length,
    extraCourses: courses.filter((c) => c.type === "extracurricular" && c.isActive).length,
    onlineCourses: courses.filter((c) => c.type === "online" && c.isActive).length,
    weeklyClasses: courses.reduce((sum, c) => sum + (c.isActive ? c.schedules.length : 0), 0),
  }

  return {
    courses,
    semester,
    isLoading,
    stats,
    addCourse,
    updateCourse,
    deleteCourse,
    getCoursesByDay,
    getCoursesByType,
    checkConflicts,
    setSemester,
  }
}
