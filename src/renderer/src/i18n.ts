import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      appName: 'PortKill',
      searchPlaceholder: 'Search & Add Port...',
      refresh: 'Refresh',
      port: 'Port',
      processName: 'Process Name',
      pid: 'PID',
      action: 'Action',
      endProcess: 'End',
      forceKill: 'Force Kill',
      emptyText: 'No watched ports are currently active.',
      invalidPort: 'Invalid port number',
      portAdded: 'Port {{port}} added to watch list',
      killingProcess: 'Killing process {{pid}}...',
      killedSuccess: 'Process {{pid}} killed successfully',
      failedToKill: 'Failed to kill: {{error}}',
      permissionDenied: 'Permission denied. Try running PortKill with administrator privileges.',
      processNotFound: 'The process no longer exists. Refreshing its status.',
      forceRequiredWindows:
        'Windows could not close this process gracefully. Use Force Kill if it is safe to do so.',
      invalidProcessRequest: 'The process request was rejected as invalid.',
      unknownError: 'Unknown error',
      error: 'Error: {{message}}',
      settings: 'Settings',
      theme: 'Theme',
      language: 'Language',
      systemDefault: 'System Default',
      light: 'Light',
      dark: 'Dark',
      confirmKillTitle: 'Confirm Kill Process',
      confirmKillContent: 'Are you sure you want to end process {{pid}} on port {{port}}?',
      dontShowAgain: "Don't show this again",
      confirm: 'Confirm',
      cancel: 'Cancel',
      removeWatch: 'Remove Watch',
      confirmUnwatchTitle: 'Confirm Remove Watch',
      confirmUnwatchContent: 'Are you sure you want to stop watching port {{port}}?',
      portRemoved: 'Port {{port}} removed from watch list',
      restoreDefault: 'Restore Defaults',
      confirmRestoreTitle: 'Confirm Restore',
      confirmRestoreContent:
        'Are you sure you want to restore default ports? Custom watched ports will be lost.',
      restoreSuccess: 'Restored default watch list successfully',
      batchEnd: 'Batch End',
      batchForceKill: 'Batch Force Kill',
      batchRemove: 'Batch Remove',
      batchConfirmTitle: 'Confirm Batch Action',
      batchConfirmContent:
        'Are you sure you want to apply this action to {{count}} selected ports?',
      batchKillingProcess: 'Ending {{count}} processes...',
      batchKillSuccess: 'Successfully ended {{count}} processes',
      batchKillFailed: 'Failed to end {{count}} processes: {{reason}}',
      batchKillPartial:
        'Ended {{successCount}} processes; {{failedCount}} processes could not be ended',
      noActiveProcessesSelected: 'None of the selected ports have an active process.',
      batchPortRemoved: 'Removed {{count}} ports from the watch list',
      filterAll: 'All Ports',
      filterActive: 'Active Only',
      filterInactive: 'Inactive Only',
      totalItems: 'Total {{total}} items',
      lsofMissingTitle: 'Port scanning is unavailable',
      lsofMissingDescription:
        'PortKill requires lsof on Linux. Install it with your system package manager and refresh.',
      scanFailedTitle: 'Port scan failed',
      scanFailedDescription:
        'Port status could not be read. Check system permissions and try refreshing.'
    }
  },
  zh: {
    translation: {
      appName: 'PortKill',
      searchPlaceholder: '搜索并添加端口...',
      refresh: '刷新',
      port: '端口号',
      processName: '进程名',
      pid: '进程 ID',
      action: '操作',
      endProcess: '结束',
      forceKill: '强制结束',
      emptyText: '当前没有监听的端口被占用。',
      invalidPort: '无效的端口号',
      portAdded: '端口 {{port}} 已添加到监听列表',
      killingProcess: '正在结束进程 {{pid}}...',
      killedSuccess: '进程 {{pid}} 已成功结束',
      failedToKill: '结束失败: {{error}}',
      permissionDenied: '权限不足，请尝试以管理员权限运行 PortKill。',
      processNotFound: '该进程已不存在，正在刷新端口状态。',
      forceRequiredWindows: 'Windows 无法正常结束此进程，请确认安全后使用“强制结束”。',
      invalidProcessRequest: '进程操作请求无效，已被拒绝。',
      unknownError: '未知错误',
      error: '错误: {{message}}',
      settings: '设置',
      theme: '主题',
      language: '语言',
      systemDefault: '跟随系统',
      light: '浅色',
      dark: '深色',
      confirmKillTitle: '结束进程确认',
      confirmKillContent: '您确定要结束端口 {{port}} 上的进程 {{pid}} 吗？',
      dontShowAgain: '不再提示',
      confirm: '确认',
      cancel: '取消',
      removeWatch: '取消监听',
      confirmUnwatchTitle: '取消监听确认',
      confirmUnwatchContent: '确定要取消对端口 {{port}} 的监听吗？',
      portRemoved: '端口 {{port}} 已从监听列表移除',
      restoreDefault: '恢复默认监听列表',
      confirmRestoreTitle: '恢复默认确认',
      confirmRestoreContent: '确定要恢复默认监听列表吗？自定义的端口将会丢失。',
      restoreSuccess: '已恢复默认监听列表',
      batchEnd: '批量结束',
      batchForceKill: '批量强制结束',
      batchRemove: '批量取消监听',
      batchConfirmTitle: '批量操作确认',
      batchConfirmContent: '确定要对选中的 {{count}} 个端口执行该操作吗？',
      batchKillingProcess: '正在结束 {{count}} 个进程...',
      batchKillSuccess: '已成功结束 {{count}} 个进程',
      batchKillFailed: '{{count}} 个进程结束失败：{{reason}}',
      batchKillPartial: '已结束 {{successCount}} 个进程，另有 {{failedCount}} 个进程失败',
      noActiveProcessesSelected: '选中的端口中没有正在运行的进程。',
      batchPortRemoved: '已从监听列表移除 {{count}} 个端口',
      filterAll: '全部端口',
      filterActive: '已被占用',
      filterInactive: '未被占用',
      totalItems: '共 {{total}} 项',
      lsofMissingTitle: '无法扫描端口',
      lsofMissingDescription: 'Linux 上需要安装 lsof，请通过系统包管理器安装后刷新。',
      scanFailedTitle: '端口扫描失败',
      scanFailedDescription: '无法读取端口状态，请检查系统权限后重试。'
    }
  }
}

const savedLang = localStorage.getItem('portkill_language') || 'auto'
const defaultLang =
  savedLang === 'auto' ? (navigator.language.startsWith('zh') ? 'zh' : 'en') : savedLang

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
})

export default i18n
