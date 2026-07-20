import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { useTranslation } from 'react-i18next'

export const DEFAULT_PORTS = [
  3000, 3001, 3002, 4000, 4200, 5173, 4173, 1234, 9229,
  80, 443, 3030, 5000, 5005, 8000, 8080, 8081, 8888, 9000,
  3306, 5432, 6379, 9200, 27017
]
export const STORAGE_KEY = 'portkill_custom_ports'
export const SKIP_CONFIRM_KEY = 'portkill_skip_confirm'
export const THEME_KEY = 'portkill_theme'
export const LANG_KEY = 'portkill_language'

export type DisplayPortStatus = {
  port: number
  pid?: number
  name?: string
  active: boolean
}

export type ConfirmAction = 'kill' | 'unwatch' | 'batchKill' | 'batchUnwatch'

export function usePortState() {
  const { t } = useTranslation()
  const [allPorts, setAllPorts] = useState<DisplayPortStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])

  const getPortsToWatch = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PORTS))
      return DEFAULT_PORTS
    }
    return JSON.parse(stored) as number[]
  }, [])

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const watched = getPortsToWatch()
      const active = await window.api.getPortStatus(watched)
      const combined: DisplayPortStatus[] = watched.map(port => {
        const found = active.find(a => a.port === port)
        if (found) {
          return { ...found, active: true }
        }
        return { port, active: false }
      })
      combined.sort((a, b) => a.port - b.port)
      setAllPorts(combined)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [getPortsToWatch])

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(() => {
      fetchStatus()
    }, 5000)
    return () => clearInterval(timer)
  }, [fetchStatus])

  const handleRestoreDefaults = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PORTS))
    message.success(t('restoreSuccess'))
    setSelectedRowKeys([])
    fetchStatus()
  }, [fetchStatus, t])

  const handleAddWatch = useCallback((val: string) => {
    if (!val) return
    const port = parseInt(val, 10)
    if (isNaN(port) || port <= 0 || port > 65535) {
      message.error(t('invalidPort'))
      return
    }
    const currentList = getPortsToWatch()
    if (!currentList.includes(port)) {
      currentList.push(port)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentList))
      message.success(t('portAdded', { port }))
      fetchStatus()
    }
  }, [fetchStatus, getPortsToWatch, t])

  const executeKill = useCallback(async (pid: number, force: boolean) => {
    const hide = message.loading(t('killingProcess', { pid }), 0)
    try {
      const res = await window.api.killProcess(pid, force)
      if (res.success) {
        message.success(t('killedSuccess', { pid }))
        fetchStatus()
      } else {
        message.error(t('failedToKill', { error: res.error || 'Permission denied' }))
      }
    } catch (e: any) {
      message.error(t('error', { message: e.message }))
    } finally {
      hide()
    }
  }, [fetchStatus, t])

  const executeUnwatch = useCallback((port: number) => {
    const currentList = getPortsToWatch()
    const newList = currentList.filter((p: number) => p !== port)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
    message.success(t('portRemoved', { port }))
    setSelectedRowKeys(prev => prev.filter(k => k !== port))
    fetchStatus()
  }, [fetchStatus, getPortsToWatch, t])

  const executeBatchKill = useCallback(async (force: boolean) => {
    const portsToKill = allPorts.filter(p => selectedRowKeys.includes(p.port) && p.active && p.pid)
    if (portsToKill.length === 0) {
      setSelectedRowKeys([])
      return
    }
    let successCount = 0
    const hide = message.loading(t('killingProcess', { pid: 'Batch' }), 0)
    for (const p of portsToKill) {
      try {
        const res = await window.api.killProcess(p.pid!, force)
        if (res.success) successCount++
      } catch (e) {
        // ignore individual fail in batch
      }
    }
    hide()
    message.success(t('killedSuccess', { pid: `${successCount} items` }))
    setSelectedRowKeys([])
    fetchStatus()
  }, [allPorts, fetchStatus, selectedRowKeys, t])

  const executeBatchUnwatch = useCallback(() => {
    const currentList = getPortsToWatch()
    const newList = currentList.filter(p => !selectedRowKeys.includes(p))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
    message.success(t('portRemoved', { port: selectedRowKeys.length + ' items' }))
    setSelectedRowKeys([])
    fetchStatus()
  }, [fetchStatus, getPortsToWatch, selectedRowKeys, t])

  return {
    allPorts,
    loading,
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
