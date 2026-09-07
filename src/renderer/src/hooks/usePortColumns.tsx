import { Button, Space, Tooltip, type TableColumnsType } from 'antd'
import { DeleteOutlined, EyeInvisibleOutlined, StopOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { ConfirmAction, DisplayPortStatus } from './usePortState'

type RequestAction = (record: DisplayPortStatus, force: boolean, actionType: ConfirmAction) => void

export function usePortColumns(requestAction: RequestAction): TableColumnsType<DisplayPortStatus> {
  const { t } = useTranslation()

  return [
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
        record.active === undefined ? (
          t('portStatusUnknown')
        ) : record.active ? (
          text
        ) : (
          <span style={{ color: '#999' }}>--</span>
        )
    },
    {
      title: t('pid'),
      dataIndex: 'pid',
      key: 'pid',
      render: (text: string, record: DisplayPortStatus) =>
        record.active === undefined ? (
          t('portStatusUnknown')
        ) : record.active ? (
          text
        ) : (
          <span style={{ color: '#999' }}>--</span>
        )
    },
    {
      title: t('action'),
      key: 'action',
      render: (_, record) => (
        <Space>
          <Tooltip
            title={t(record.active && !record.canKill ? 'identityUnavailable' : 'endProcess')}
          >
            <Button
              type="primary"
              disabled={!record.canKill}
              icon={<StopOutlined />}
              onClick={() => requestAction(record, false, 'kill')}
            />
          </Tooltip>
          <Tooltip
            title={t(record.active && !record.canKill ? 'identityUnavailable' : 'forceKill')}
          >
            <Button
              type="primary"
              disabled={!record.canKill}
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
  ]
}
