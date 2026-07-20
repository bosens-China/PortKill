import React from 'react'
import { Drawer, Select, Popconfirm, Button, Divider } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { THEME_KEY, LANG_KEY } from '../hooks/usePortState'
import { UpdateSettingsSection } from './UpdateSettingsSection'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  appTheme: 'auto' | 'light' | 'dark'
  setAppTheme: (val: 'auto' | 'light' | 'dark') => void
  appLang: 'auto' | 'zh' | 'en'
  setAppLang: (val: 'auto' | 'zh' | 'en') => void
  onRestoreDefaults: () => void
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  open,
  onClose,
  appTheme,
  setAppTheme,
  appLang,
  setAppLang,
  onRestoreDefaults
}) => {
  const { t, i18n } = useTranslation()

  const handleThemeChange = (val: 'auto' | 'light' | 'dark'): void => {
    setAppTheme(val)
    localStorage.setItem(THEME_KEY, val)
  }

  const handleLangChange = (val: 'auto' | 'zh' | 'en'): void => {
    setAppLang(val)
    localStorage.setItem(LANG_KEY, val)
    if (val === 'auto') {
      i18n.changeLanguage(navigator.language.startsWith('zh') ? 'zh' : 'en')
    } else {
      i18n.changeLanguage(val)
    }
  }

  return (
    <Drawer title={t('settings')} open={open} onClose={onClose} placement="right">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('theme')}</span>
          <Select value={appTheme} onChange={handleThemeChange} style={{ width: 150 }}>
            <Select.Option value="auto">{t('systemDefault')}</Select.Option>
            <Select.Option value="light">{t('light')}</Select.Option>
            <Select.Option value="dark">{t('dark')}</Select.Option>
          </Select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t('language')}</span>
          <Select value={appLang} onChange={handleLangChange} style={{ width: 150 }}>
            <Select.Option value="auto">{t('systemDefault')}</Select.Option>
            <Select.Option value="zh">简体中文</Select.Option>
            <Select.Option value="en">English</Select.Option>
          </Select>
        </div>

        <Divider style={{ margin: 0 }}>{t('updates')}</Divider>
        <UpdateSettingsSection />

        <Popconfirm
          title={t('confirmRestoreTitle')}
          description={t('confirmRestoreContent')}
          onConfirm={onRestoreDefaults}
          okText={t('confirm')}
          cancelText={t('cancel')}
        >
          <Button type="primary" danger icon={<ReloadOutlined />} style={{ marginTop: '20px' }}>
            {t('restoreDefault')}
          </Button>
        </Popconfirm>
      </div>
    </Drawer>
  )
}
