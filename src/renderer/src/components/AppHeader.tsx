import { Button, Input, Layout, Select, Space, Typography } from 'antd'
import { InfoCircleOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

export type PortFilterStatus = 'all' | 'active' | 'inactive'

interface AppHeaderProps {
  isDark: boolean
  filterStatus: PortFilterStatus
  onFilterStatusChange: (status: PortFilterStatus) => void
  searchValue: string
  onSearchValueChange: (value: string) => void
  onAddWatch: (value: string) => void
  loading: boolean
  onRefresh: () => void
  onOpenSettings: () => void
}

const { Header } = Layout
const { Title } = Typography

export function AppHeader({
  isDark,
  filterStatus,
  onFilterStatusChange,
  searchValue,
  onSearchValueChange,
  onAddWatch,
  loading,
  onRefresh,
  onOpenSettings
}: AppHeaderProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Header
      style={{
        background: isDark ? '#1f1f1f' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px 12px 20px',
        height: 'auto',
        lineHeight: 1.4,
        borderBottom: isDark ? '1px solid #303030' : '1px solid #f0f0f0'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        <Title level={4} style={{ color: isDark ? '#fff' : '#000', margin: 0 }}>
          {t('appName')}
        </Title>
        <Space>
          <Select value={filterStatus} onChange={onFilterStatusChange} style={{ width: 120 }}>
            <Select.Option value="all">{t('filterAll')}</Select.Option>
            <Select.Option value="active">{t('filterActive')}</Select.Option>
            <Select.Option value="inactive">{t('filterInactive')}</Select.Option>
          </Select>
          <Input.Search
            placeholder={t('searchPlaceholder')}
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            onSearch={onAddWatch}
            style={{ width: 200 }}
            allowClear
          />
          <Button icon={<SyncOutlined spin={loading} />} onClick={onRefresh} type="primary">
            {t('refresh')}
          </Button>
          <Button
            icon={<SettingOutlined />}
            type="text"
            onClick={onOpenSettings}
            style={{ color: isDark ? '#fff' : '#000' }}
          />
        </Space>
      </div>
      <div style={{ marginTop: 8, width: '100%' }}>
        <Space
          style={{
            color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
            fontSize: 12
          }}
          size={4}
        >
          <InfoCircleOutlined style={{ fontSize: 12 }} />
          <span>
            {t('searchTip')}
            <br />
            {t('tcpScope')}
          </span>
        </Space>
      </div>
    </Header>
  )
}
