import React from 'react'
import { Modal, Checkbox, Space } from 'antd'
import { ExclamationCircleFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { DisplayPortStatus, ConfirmAction, SKIP_CONFIRM_KEY } from '../hooks/usePortState'

interface ConfirmModalProps {
  config: {
    open: boolean
    record: DisplayPortStatus | null
    force: boolean
    actionType: ConfirmAction
  }
  skipConfirm: boolean
  setSkipConfirm: (val: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  selectedCount: number
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  config,
  skipConfirm,
  setSkipConfirm,
  onConfirm,
  onCancel,
  selectedCount
}) => {
  const { t } = useTranslation()

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleFilled style={{ color: '#faad14' }} />
          <span>
            {config.actionType === 'kill' ? t('confirmKillTitle') : 
             config.actionType === 'unwatch' ? t('confirmUnwatchTitle') : 
             t('batchConfirmTitle')}
          </span>
        </Space>
      }
      open={config.open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText={t('confirm')}
      cancelText={t('cancel')}
      okButtonProps={{ danger: config.force || config.actionType === 'kill' || config.actionType === 'batchKill' }}
    >
      <div style={{ padding: '10px 0 20px 0' }}>
        {config.actionType === 'kill' && config.record && t('confirmKillContent', { pid: config.record.pid, port: config.record.port })}
        {config.actionType === 'unwatch' && config.record && t('confirmUnwatchContent', { port: config.record.port })}
        {(config.actionType === 'batchKill' || config.actionType === 'batchUnwatch') && t('batchConfirmContent', { count: selectedCount })}
      </div>
      <Checkbox
        checked={skipConfirm}
        onChange={(e) => {
          const checked = e.target.checked
          setSkipConfirm(checked)
          localStorage.setItem(SKIP_CONFIRM_KEY, String(checked))
        }}
      >
        {t('dontShowAgain')}
      </Checkbox>
    </Modal>
  )
}
