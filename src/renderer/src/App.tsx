import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  ConfigProvider,
  Input,
  Layout,
  Select,
  Space,
  Table,
  theme,
  Tooltip,
  Typography,
  type TableColumnsType
} from 'antd'
import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  StopOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'

import {
  LANG_KEY,
  LEGACY_SKIP_CONFIRM_KEY,
  SKIP_KILL_CONFIRM_KEY,
  SKIP_UNWATCH_CONFIRM_KEY,
  THEME_KEY,
  usePortState,
  type ConfirmAction,
  type DisplayPortStatus
} from './hooks/usePortState'
import { SettingsDrawer } from './components/SettingsDrawer'
import { ConfirmModal } from './components/ConfirmModal'
import { UpdateController } from './components/UpdateController'

const { Header, Content } = Layout
const { Title } = Typography

type AppTheme = 'auto' | 'light' | 'dark'
type AppLanguage = 'auto' | 'zh' | 'en'
type ConfirmCategory = 'kill' | 'unwatch'

function getStoredPreference<T extends string>(
  key: string,
  allowedValues: readonly T[],
  fallback: T
): T {
  const value = localStorage.getItem(key)
  return value && allowedValues.includes(value as T) ? (value as T) : fallback
}

function getConfirmCategory(action: ConfirmAction): ConfirmCategory {
  return action === 'kill' || action === 'batchKill' ? 'kill' : 'unwatch'
}

function App(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const {
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
  } = usePortState()

  const [searchVal, setSearchVal] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appTheme, setAppTheme] = useState<AppTheme>(
    getStoredPreference<AppTheme>(THEME_KEY, ['auto', 'light', 'dark'], 'auto')
  )
  const [appLang, setAppLang] = useState<AppLanguage>(
    getStoredPreference<AppLanguage>(LANG_KEY, ['auto', 'zh', 'en'], 'auto')
  )
  const [systemDark, setSystemDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const [confirmConfig, setConfirmConfig] = useState<{
    open: boolean
    record: DisplayPortStatus | null
    force: boolean
    actionType: ConfirmAction
  }>({ open: false, record: null, force: false, actionType: 'kill' })
  const [skipConfirm, setSkipConfirm] = useState<Record<ConfirmCategory, boolean>>({
    kill: localStorage.getItem(SKIP_KILL_CONFIRM_KEY) === 'true',
    unwatch: localStorage.getItem(SKIP_UNWATCH_CONFIRM_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.removeItem(LEGACY_SKIP_CONFIRM_KEY)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (event: MediaQueryListEvent): void => setSystemDark(event.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const requestAction = (
    record: DisplayPortStatus,
    force: boolean,
    actionType: ConfirmAction
  ): void => {
    if (skipConfirm[getConfirmCategory(actionType)]) {
      if (actionType === 'kill' && record.pid) {
        void executeKill(record.pid, force)
      } else if (actionType === 'unwatch') {
        executeUnwatch(record.port)
      }
    } else {
      setConfirmConfig({ open: true, record, force, actionType })
    }
  }

  const requestBatchAction = (force: boolean, actionType: ConfirmAction): void => {
    if (skipConfirm[getConfirmCategory(actionType)]) {
      if (actionType === 'batchKill') void executeBatchKill(force)
      else if (actionType === 'batchUnwatch') executeBatchUnwatch()
    } else {
      setConfirmConfig({ open: true, record: null, force, actionType })
    }
  }

  const confirmModalAction = (): void => {
    if (confirmConfig.actionType === 'kill' && confirmConfig.record?.pid) {
      void executeKill(confirmConfig.record.pid, confirmConfig.force)
    } else if (confirmConfig.actionType === 'unwatch' && confirmConfig.record) {
      executeUnwatch(confirmConfig.record.port)
    } else if (confirmConfig.actionType === 'batchKill') {
      void executeBatchKill(confirmConfig.force)
    } else if (confirmConfig.actionType === 'batchUnwatch') {
      executeBatchUnwatch()
    }
    setConfirmConfig({ open: false, record: null, force: false, actionType: 'kill' })
  }

  const updateSkipConfirm = (value: boolean): void => {
    const category = getConfirmCategory(confirmConfig.actionType)
    const storageKey = category === 'kill' ? SKIP_KILL_CONFIRM_KEY : SKIP_UNWATCH_CONFIRM_KEY
    setSkipConfirm((previous) => ({ ...previous, [category]: value }))
    localStorage.setItem(storageKey, String(value))
  }

  const isDark = appTheme === 'dark' || (appTheme === 'auto' && systemDark)
  const algorithm = isDark ? theme.darkAlgorithm : theme.defaultAlgorithm
  const bgHeader = isDark ? '#1f1f1f' : '#ffffff'
  const bgLayout = isDark ? '#141414' : '#f0f2f5'

  const columns: TableColumnsType<DisplayPortStatus> = [
    {
      title: t('port'),
      dataIndex: 'port',
      key: 'port',
      render: (text: number, record: DisplayPortStatus) => (
        <strong style={{ color: record.active ? 'inherit' : '#999' }}>{text}</strong>
      )
    },
    {
      title: t('processName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DisplayPortStatus) =>
        record.active ? text : <span style={{ color: '#999' }}>--</span>
    },
    {
      title: t('pid'),
      dataIndex: 'pid',
      key: 'pid',
      render: (text: number, record: DisplayPortStatus) =>
        record.active ? text : <span style={{ color: '#999' }}>--</span>
    },
    {
      title: t('action'),
      key: 'action',
      render: (_, record) => {
        return (
          <Space>
            <Tooltip title={t('endProcess')}>
              <Button
                type="primary"
                disabled={!record.active}
                icon={<StopOutlined />}
                onClick={() => requestAction(record, false, 'kill')}
              />
            </Tooltip>
            <Tooltip title={t('forceKill')}>
              <Button
                type="primary"
                disabled={!record.active}
                danger
                icon={<DeleteOutlined />}
                onClick={() => requestAction(record, true, 'kill')}
              />
            </Tooltip>
            <Tooltip title={t('removeWatch')}>
              <Button
                type="dashed"
                icon={<EyeInvisibleOutlined />}
                onClick={() => requestAction(record, false, 'unwatch')}
              />
            </Tooltip>
          </Space>
        )
      }
    }
  ]

  let displayedPorts = allPorts.filter(
    (p) =>
      p.port.toString().includes(searchVal) ||
      (p.name && p.name.toLowerCase().includes(searchVal.toLowerCase()))
  )
  if (filterStatus === 'active') {
    displayedPorts = displayedPorts.filter((p) => p.active)
  } else if (filterStatus === 'inactive') {
    displayedPorts = displayedPorts.filter((p) => !p.active)
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as number[])
    }
  }

  const antdLocale = i18n.language.startsWith('zh') ? zhCN : enUS

  return (
    <ConfigProvider theme={{ algorithm }} locale={antdLocale}>
      <UpdateController />
      <Layout style={{ minHeight: '100vh', background: bgLayout }}>
        <Header
          style={{
            background: bgHeader,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            borderBottom: isDark ? '1px solid #303030' : '1px solid #f0f0f0'
          }}
        >
          <Title level={4} style={{ color: isDark ? '#fff' : '#000', margin: 0 }}>
            {t('appName')}
          </Title>
          <Space>
            <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 120 }}>
              <Select.Option value="all">{t('filterAll')}</Select.Option>
              <Select.Option value="active">{t('filterActive')}</Select.Option>
              <Select.Option value="inactive">{t('filterInactive')}</Select.Option>
            </Select>
            <Input.Search
              placeholder={t('searchPlaceholder')}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onSearch={handleAddWatch}
              style={{ width: 200 }}
              allowClear
            />
            <Button icon={<SyncOutlined spin={loading} />} onClick={fetchStatus} type="primary">
              {t('refresh')}
            </Button>
            <Button
              icon={<SettingOutlined />}
              type="text"
              onClick={() => setSettingsOpen(true)}
              style={{ color: isDark ? '#fff' : '#000' }}
            />
          </Space>
        </Header>
        <Content style={{ padding: '20px' }}>
          {scanErrorCode && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              message={
                scanErrorCode === 'LSOF_NOT_FOUND' ? t('lsofMissingTitle') : t('scanFailedTitle')
              }
              description={
                scanErrorCode === 'LSOF_NOT_FOUND'
                  ? t('lsofMissingDescription')
                  : t('scanFailedDescription')
              }
            />
          )}
          <Space size={6} style={{ marginBottom: 12 }}>
            <InfoCircleOutlined />
            <Typography.Text type="secondary">{t('searchHint')}</Typography.Text>
          </Space>
          <div
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              visibility: selectedRowKeys.length > 0 ? 'visible' : 'hidden',
              minHeight: 32
            }}
          >
            <Button
              type="primary"
              icon={<StopOutlined />}
              onClick={() => requestBatchAction(false, 'batchKill')}
            >
              {t('batchEnd')}
            </Button>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={() => requestBatchAction(true, 'batchKill')}
            >
              {t('batchForceKill')}
            </Button>
            <Button
              type="dashed"
              icon={<EyeInvisibleOutlined />}
              onClick={() => requestBatchAction(false, 'batchUnwatch')}
            >
              {t('batchRemove')}
            </Button>
          </div>
          <Table
            rowSelection={rowSelection}
            dataSource={displayedPorts}
            columns={columns}
            rowKey="port"
            pagination={{
              position: ['bottomRight'],
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => t('totalItems', { total })
            }}
            scroll={{ y: 'calc(100vh - 300px)' }}
            locale={{ emptyText: t('emptyText') }}
          />
        </Content>

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          appTheme={appTheme}
          setAppTheme={setAppTheme}
          appLang={appLang}
          setAppLang={setAppLang}
          onRestoreDefaults={handleRestoreDefaults}
        />

        <ConfirmModal
          config={confirmConfig}
          skipConfirm={skipConfirm[getConfirmCategory(confirmConfig.actionType)]}
          onSkipConfirmChange={updateSkipConfirm}
          onConfirm={confirmModalAction}
          onCancel={() =>
            setConfirmConfig({ open: false, record: null, force: false, actionType: 'kill' })
          }
          selectedCount={selectedRowKeys.length}
        />
      </Layout>
    </ConfigProvider>
  )
}

export default App
