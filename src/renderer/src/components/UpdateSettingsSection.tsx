import { Alert, Button, Progress, Space, Typography } from 'antd'
import { DownloadOutlined, SyncOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useAppUpdater } from '../hooks/useAppUpdater'

const { Text } = Typography

export function UpdateSettingsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const { state, checkForUpdates, downloadUpdate, installUpdate, openReleasePage } = useAppUpdater()

  const isChecking = state?.phase === 'checking'
  const isDownloading = state?.phase === 'downloading'
  const showNoUpdate = state?.phase === 'not-available' && state.checkSource === 'manual'

  const handleAvailableAction = (): void => {
    if (state?.installMode === 'manual') {
      void openReleasePage()
    } else {
      void downloadUpdate()
    }
  }

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{t('currentVersion')}</Text>
          <Text code>{state ? `v${state.currentVersion}` : '--'}</Text>
        </Space>

        <Button
          block
          icon={<SyncOutlined spin={isChecking} />}
          loading={isChecking}
          disabled={!state || isDownloading || state.phase === 'unsupported'}
          onClick={() => void checkForUpdates()}
        >
          {t('checkForUpdates')}
        </Button>

        {state?.phase === 'available' && (
          <Alert
            type="info"
            showIcon
            message={t('newVersionAvailable', { version: state.latestVersion })}
            action={
              <Button size="small" type="primary" onClick={handleAvailableAction}>
                {state.installMode === 'manual' ? t('openReleasePage') : t('downloadUpdate')}
              </Button>
            }
          />
        )}

        {isDownloading && (
          <div>
            <Text>{t('downloadingUpdate')}</Text>
            <Progress percent={Math.round(state.progress ?? 0)} />
          </div>
        )}

        {state?.phase === 'downloaded' && (
          <Button
            block
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => void installUpdate()}
          >
            {t('restartAndInstall')}
          </Button>
        )}

        {showNoUpdate && <Alert type="success" showIcon message={t('alreadyLatestVersion')} />}
        {state?.phase === 'error' && (
          <Alert
            type="error"
            showIcon
            message={t(`updateError.${state.errorCode ?? 'CHECK_FAILED'}`)}
          />
        )}
        {state?.phase === 'unsupported' && (
          <Alert type="info" showIcon message={t('developmentUpdateUnavailable')} />
        )}
      </Space>
    </div>
  )
}
