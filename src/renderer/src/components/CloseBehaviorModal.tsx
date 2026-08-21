import { Button, Modal, Space } from 'antd'
import { QuestionCircleFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import type { CloseBehavior } from '../../../shared/close-behavior'

interface CloseBehaviorModalProps {
  closePromptOpen: boolean
  resolveCloseRequest: (behavior: CloseBehavior) => void
  cancelCloseRequest: () => void
}

export function CloseBehaviorModal({
  closePromptOpen,
  resolveCloseRequest,
  cancelCloseRequest
}: CloseBehaviorModalProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Modal
      title={
        <Space>
          <QuestionCircleFilled style={{ color: '#1677ff' }} />
          <span>{t('closeBehaviorPromptTitle')}</span>
        </Space>
      }
      open={closePromptOpen}
      onCancel={cancelCloseRequest}
      closable={false}
      footer={[
        <Button key="cancel" onClick={cancelCloseRequest}>
          {t('cancel')}
        </Button>,
        <Button key="quit" danger onClick={() => resolveCloseRequest('quit')}>
          {t('quitApplication')}
        </Button>,
        <Button key="tray" type="primary" onClick={() => resolveCloseRequest('tray')}>
          {t('minimizeToTray')}
        </Button>
      ]}
    >
      <p>{t('closeBehaviorPromptContent')}</p>
      <p style={{ marginBottom: 0, color: 'rgba(127, 127, 127, 0.9)' }}>
        {t('closeBehaviorRememberHint')}
      </p>
    </Modal>
  )
}
