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
      error: 'Error: {{message}}',
      settings: 'Settings',
      theme: 'Theme',
      language: 'Language',
      systemDefault: 'System Default',
      light: 'Light',
      dark: 'Dark',
      confirmKillTitle: 'Confirm Kill Process',
      confirmKillContent: 'Are you sure you want to end process {{pid}} on port {{port}}?',
      dontShowAgain: 'Don\'t show this again',
      confirm: 'Confirm',
      cancel: 'Cancel',
      removeWatch: 'Remove Watch',
      confirmUnwatchTitle: 'Confirm Remove Watch',
      confirmUnwatchContent: 'Are you sure you want to stop watching port {{port}}?',
      portRemoved: 'Port {{port}} removed from watch list',
      restoreDefault: 'Restore Defaults',
      confirmRestoreTitle: 'Confirm Restore',
      confirmRestoreContent: 'Are you sure you want to restore default ports? Custom watched ports will be lost.',
      restoreSuccess: 'Restored default watch list successfully',
      batchEnd: 'Batch End',
      batchForceKill: 'Batch Force Kill',
      batchRemove: 'Batch Remove',
      batchConfirmTitle: 'Confirm Batch Action',
      batchConfirmContent: 'Are you sure you want to apply this action to {{count}} selected ports?',
      filterAll: 'All Ports',
      filterActive: 'Active Only',
      filterInactive: 'Inactive Only',
      totalItems: 'Total {{total}} items'
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
      filterAll: '全部端口',
      filterActive: '已被占用',
      filterInactive: '未被占用',
      totalItems: '共 {{total}} 项'
    }
  }
}

const savedLang = localStorage.getItem('portkill_language') || 'auto'
const defaultLang = savedLang === 'auto' 
  ? (navigator.language.startsWith('zh') ? 'zh' : 'en') 
  : savedLang

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
