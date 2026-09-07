import { useCallback, useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'
import type { PortScanErrorCode, ProcessActionResult } from '../../../shared/port'
import { combinePortStatuses, type DisplayPortStatus } from './port-display'
export type { DisplayPortStatus } from './port-display'

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
  executeKill: (record: DisplayPortStatus, force: boolean) => Promise<void>
  executeUnwatch: (port: number) => void
  executeBatchKill: (force: boolean, records?: DisplayPortStatus[]) => Promise<void>
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
    let watched: number[] = []
    try {
      watched = getPortsToWatch()
      const result = await window.api.getPortStatus(watched)
      if (requestId !== latestRequestRef.current) return

      setAllPorts(combinePortStatuses(watched, result))
      setScanErrorCode(result.errorCode ?? null)
    } catch (error) {
      console.error(error)
      if (requestId === latestRequestRef.current) {
        setScanErrorCode('SCAN_FAILED')
        setAllPorts(combinePortStatuses(watched, { statuses: [], errorCode: 'SCAN_FAILED' }))
      }
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
        case 'TARGET_CHANGED':
          return t('targetChanged')
        case 'SCAN_FAILED':
          return t('scanFailedDescription')
        case 'COMMAND_TIMEOUT':
          return t('commandTimeout')
        case 'EXIT_TIMEOUT':
          return t('exitTimeout')
        case 'PORT_STILL_OCCUPIED':
          return t('portStillOccupied')
        case 'INVALID_REQUEST':
          return t('invalidProcessRequest')
        default:
          return t('failedToKill', { error: result.error || t('unknownError') })
      }
    },
    [t]
  )

  const executeTargets = useCallback(
    async (records: DisplayPortStatus[], force: boolean) => {
      const targets = records
        .filter((record) => record.canKill)
        .flatMap((record) => record.processes)
      if (!targets.length || records.some((record) => record.active !== false && !record.canKill)) {
        message.info(t('noSafeProcessesSelected'))
        return
      }
      const count = new Set(targets.map(({ pid }) => pid)).size
      const hide = message.loading(t('batchKillingProcess', { count }), 0)
      try {
        const result = await window.api.killProcess(targets, force)
        if (result.success) {
          message.success(t('batchKillSuccess', { count: result.endedPids?.length ?? count }))
        } else {
          const reason = getProcessErrorMessage(result)
          message.error(
            result.endedPids?.length
              ? t('killPartialFailure', { count: result.endedPids.length, reason })
              : reason
          )
        }
      } catch (error) {
        message.error(
          t('error', { message: error instanceof Error ? error.message : String(error) })
        )
      } finally {
        hide()
        void fetchStatus()
      }
    },
    [fetchStatus, getProcessErrorMessage, t]
  )

  const executeKill = useCallback(
    (record: DisplayPortStatus, force: boolean) => executeTargets([record], force),
    [executeTargets]
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
    async (force: boolean, records?: DisplayPortStatus[]) => {
      const snapshot = records ?? allPorts.filter((port) => selectedRowKeys.includes(port.port))
      await executeTargets(snapshot, force)
      setSelectedRowKeys([])
    },
    [allPorts, executeTargets, selectedRowKeys]
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
