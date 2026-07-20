import { useState } from 'react'
import { Modal, Progress, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useAppUpdater } from '../hooks/useAppUpdater'

const { Paragraph, Text } = Typography

export function UpdateController(): React.JSX.Element | null {
  const { t } = useTranslation()
  const { state, downloadUpdate, installUpdate, openReleasePage } = useAppUpdater()
  const [dismissedPrompt, setDismissedPrompt] = useState<string | null>(null)

  if (!state) return null

  const promptKey = `${state.phase}:${state.latestVersion ?? ''}:${state.errorCode ?? ''}`
  const isPromptPhase =
    state.phase === 'available' ||
    state.phase === 'downloaded' ||
    (state.phase === 'error' &&
      (state.checkSource === 'manual' || state.errorCode === 'DOWNLOAD_FAILED'))
  const open = state.phase === 'downloading' || (isPromptPhase && dismissedPrompt !== promptKey)

  const dismiss = (): void => setDismissedPrompt(promptKey)

  if (state.phase === 'downloading') {
    return (
      <Modal
        open={open}
        title={t('downloadingUpdate')}
        footer={null}
        closable={false}
        keyboard={false}
        maskClosable={false}
      >
        <Progress percent={Math.round(state.progress ?? 0)} />
      </Modal>
    )
  }

  if (state.phase === 'available') {
    const handleConfirm = (): void => {
      if (state.installMode === 'manual') {
        void openReleasePage()
        dismiss()
      } else {
        void downloadUpdate()
      }
    }

    return (
      <Modal
        open={open}
        title={t('updateAvailableTitle')}
        okText={state.installMode === 'manual' ? t('openReleasePage') : t('downloadUpdate')}
        cancelText={t('later')}
        onOk={handleConfirm}
        onCancel={dismiss}
      >
        <Paragraph>
          {t('updateAvailableContent', {
            currentVersion: state.currentVersion,
            latestVersion: state.latestVersion
          })}
        </Paragraph>
        {state.installMode === 'manual' && <Text type="secondary">{t('manualUpdateHint')}</Text>}
      </Modal>
    )
  }

  if (state.phase === 'downloaded') {
    return (
      <Modal
        open={open}
        title={t('updateDownloadedTitle')}
        okText={t('restartAndInstall')}
        cancelText={t('later')}
        onOk={() => void installUpdate()}
        onCancel={dismiss}
      >
        <Paragraph>{t('updateDownloadedContent', { version: state.latestVersion })}</Paragraph>
      </Modal>
    )
  }

  if (state.phase === 'error') {
    return (
      <Modal
        open={open}
        title={t('updateErrorTitle')}
        okText={t('confirm')}
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={dismiss}
        onCancel={dismiss}
      >
        <Paragraph>{t(`updateError.${state.errorCode ?? 'CHECK_FAILED'}`)}</Paragraph>
      </Modal>
    )
  }

  return null
}
