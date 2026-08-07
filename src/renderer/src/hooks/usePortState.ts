import { useCallback, useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PortScanErrorCode, ProcessActionResult } from '../../../shared/port'

export const DEFAULT_PORTS = [
  3000, 3001, 3002, 4000, 4200, 5173, 4173, 1234, 9229, 80, 443, 3030, 5000, 5005, 8000, 8080, 8081,
  8888, 9000, 3306, 5432, 6379, 9200, 27017
]
export const STORAGE_KEY = 'portkill_custom_ports'
export const LEGACY_SKIP_CONFIRM_KEY = 'portkill_skip_confirm'
export const SKIP_KILL_CONFIRM_KEY = 'portkill_skip_kill_confirm'
export const SKIP_UNWATCH_CONFIRM_KEY = 'portkill_skip_unwatch_confirm'
export const THEME_KEY = 'portkill_theme'
export const LANG_KEY = 'portkill_language'
export const PAGE_SIZE_KEY = 'portkill_page_size'

export type DisplayPortStatus = {
  port: number
  pid?: number
  name?: string
  active: boolean
}

export type ConfirmAction = 'kill' | 'unwatch' | 'batchKill' | 'batchUnwatch'

function normalizePorts(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null

  const ports = value.filter(
    (port): port is number =>
      typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535
  )
  if (ports.length !== value.length) return null
  return [...new Set(ports)]
}

export function usePortState(): {
  allPorts: DisplayPortStatus[]
  loading: boolean
  scanErrorCode: PortScanErrorCode | null
  selectedRowKeys: number[]
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<number[]>>
  fetchStatus: () => Promise<void>
  handleRestoreDefaults: () => void
  handleAddWatch: (value: string) => void
  executeKill: (pid: number, force: boolean) => Promise<void>
  executeUnwatch: (port: number) => void
  executeBatchKill: (force: boolean) => Promise<void>
  executeBatchUnwatch: () => void
} {
  const { t } = useTranslation()
  const [allPorts, setAllPorts] = useState<DisplayPortStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [scanErrorCode, setScanErrorCode] = useState<PortScanErrorCode | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const latestRequestRef = useRef(0)

  const getPortsToWatch = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = normalizePorts(JSON.parse(stored))
        if (parsed) return parsed
      } catch {
        // Replace malformed persisted state with safe defaults.
      }
    }

    const defaults = [...DEFAULT_PORTS]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  }, [])

  const fetchStatus = useCallback(async () => {
    const requestId = ++latestRequestRef.current
    setLoading(true)
    try {
      const watched = getPortsToWatch()
      const result = await window.api.getPortStatus(watched)
      if (requestId !== latestRequestRef.current) return

      const combined: DisplayPortStatus[] = watched.map((port) => {
        const found = result.statuses.find((status) => status.port === port)
        if (found) {
          return { ...found, active: true }
        }
        return { port, active: false }
      })
      combined.sort((a, b) => a.port - b.port)
      setAllPorts(combined)
      setScanErrorCode(result.errorCode ?? null)
    } catch (error) {
      console.error(error)
      if (requestId === latestRequestRef.current) setScanErrorCode('SCAN_FAILED')
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false)
    }
  }, [getPortsToWatch])

  useEffect(() => {
    let disposed = false
    let timer: number

    const refreshAndSchedule = async (): Promise<void> => {
      await fetchStatus()
      if (!disposed) timer = window.setTimeout(refreshAndSchedule, 5000)
    }

    timer = window.setTimeout(refreshAndSchedule, 0)
    return () => {
      disposed = true
      window.clearTimeout(timer)
    }
  }, [fetchStatus])

  const handleRestoreDefaults = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PORTS))
    message.success(t('restoreSuccess'))
    setSelectedRowKeys([])
    void fetchStatus()
  }, [fetchStatus, t])

  const handleAddWatch = useCallback(
    (value: string) => {
      if (!value) return
      if (!/^\d+$/.test(value)) {
        message.error(t('invalidPort'))
        return
      }

      const port = Number(value)
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        message.error(t('invalidPort'))
        return
      }

      const currentList = getPortsToWatch()
      if (!currentList.includes(port)) {
        currentList.push(port)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList))
        message.success(t('portAdded', { port }))
        void fetchStatus()
      }
    },
    [fetchStatus, getPortsToWatch, t]
  )

  const getProcessErrorMessage = useCallback(
    (result: ProcessActionResult): string => {
      switch (result.errorCode) {
        case 'PERMISSION_DENIED':
          return t('permissionDenied')
        case 'PROCESS_NOT_FOUND':
          return t('processNotFound')
        case 'FORCE_REQUIRED':
          return t('forceRequiredWindows')
        case 'INVALID_REQUEST':
          return t('invalidProcessRequest')
        default:
          return t('failedToKill', { error: result.error || t('unknownError') })
      }
    },
    [t]
  )

  const executeKill = useCallback(
    async (pid: number, force: boolean) => {
      const hide = message.loading(t('killingProcess', { pid }), 0)
      try {
        const result = await window.api.killProcess(pid, force)
        if (result.success) {
          message.success(t('killedSuccess', { pid }))
          void fetchStatus()
        } else {
          message.error(getProcessErrorMessage(result))
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        message.error(t('error', { message: detail }))
      } finally {
        hide()
      }
    },
    [fetchStatus, getProcessErrorMessage, t]
  )

  const executeUnwatch = useCallback(
    (port: number) => {
      const currentList = getPortsToWatch()
      const newList = currentList.filter((watchedPort) => watchedPort !== port)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
      message.success(t('portRemoved', { port }))
      setSelectedRowKeys((previous) => previous.filter((key) => key !== port))
      void fetchStatus()
    },
    [fetchStatus, getPortsToWatch, t]
  )

  const executeBatchKill = useCallback(
    async (force: boolean) => {
      const uniquePids = [
        ...new Set(
          allPorts
            .filter((port) => selectedRowKeys.includes(port.port) && port.active && port.pid)
            .map((port) => port.pid as number)
        )
      ]

      if (uniquePids.length === 0) {
        message.info(t('noActiveProcessesSelected'))
        setSelectedRowKeys([])
        return
      }

      const hide = message.loading(t('batchKillingProcess', { count: uniquePids.length }), 0)
      let successCount = 0
      const failures: ProcessActionResult[] = []

      for (const pid of uniquePids) {
        try {
          const result = await window.api.killProcess(pid, force)
          if (result.success) successCount += 1
          else failures.push(result)
        } catch (error) {
          failures.push({
            success: false,
            errorCode: 'KILL_FAILED',
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }

      hide()
      if (failures.length === 0) {
        message.success(t('batchKillSuccess', { count: successCount }))
      } else if (successCount === 0) {
        message.error(
          t('batchKillFailed', {
            count: failures.length,
            reason: getProcessErrorMessage(failures[0])
          })
        )
      } else {
        message.warning(t('batchKillPartial', { successCount, failedCount: failures.length }))
      }

      setSelectedRowKeys([])
      void fetchStatus()
    },
    [allPorts, fetchStatus, getProcessErrorMessage, selectedRowKeys, t]
  )

  const executeBatchUnwatch = useCallback(() => {
    const currentList = getPortsToWatch()
    const newList = currentList.filter((port) => !selectedRowKeys.includes(port))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
    message.success(t('batchPortRemoved', { count: selectedRowKeys.length }))
    setSelectedRowKeys([])
    void fetchStatus()
  }, [fetchStatus, getPortsToWatch, selectedRowKeys, t])

  return {
    allPorts,
    loading,
    scanErrorCode,
    selectedRowKeys,
    setSelectedRowKeys,
    fetchStatus,
    handleRestoreDefaults,
    handleAddWatch,
    executeKill,
    executeUnwatch,
    executeBatchKill,
    executeBatchUnwatch
  }
}
