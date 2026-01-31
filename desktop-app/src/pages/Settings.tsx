import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './Settings.css';

interface Settings {
    pythonPath: string;
    theme: 'dark' | 'light';
    apiKeys: ApiKey[];
}

interface ApiKey {
    service: string;
    key: string;
    masked: string;
}

const defaultSettings: Settings = {
    pythonPath: 'python ../vibe.py',
    theme: 'dark',
    apiKeys: []
};

const Settings: React.FC = () => {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // New API key form
    const [newKeyService, setNewKeyService] = useState('claude');
    const [newKeyValue, setNewKeyValue] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await invoke<string>('get_settings');
            if (saved) {
                setSettings(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: Settings) => {
        setIsSaving(true);
        try {
            await invoke('save_settings', { settings: JSON.stringify(newSettings) });
            setSettings(newSettings);
            showNotification('✓ Đã lưu cài đặt', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            showNotification('Lỗi khi lưu cài đặt', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handlePythonPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, pythonPath: e.target.value }));
    };

    const handleSavePythonPath = () => {
        saveSettings(settings);
    };

    const handleThemeToggle = () => {
        const newTheme: 'dark' | 'light' = settings.theme === 'dark' ? 'light' : 'dark';
        const newSettings = { ...settings, theme: newTheme };
        saveSettings(newSettings);
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleAddApiKey = async () => {
        if (!newKeyValue.trim()) {
            showNotification('Vui lòng nhập API key', 'error');
            return;
        }

        const masked = newKeyValue.slice(0, 8) + '...' + newKeyValue.slice(-4);
        const newKey: ApiKey = {
            service: newKeyService,
            key: newKeyValue,
            masked
        };

        const newSettings = {
            ...settings,
            apiKeys: [...settings.apiKeys.filter(k => k.service !== newKeyService), newKey]
        };

        // If adding Gemini key, also save to store for AI Skill Factory
        if (newKeyService === 'gemini') {
            try {
                // Save gemini_api_key via Tauri command for AI Skill Factory
                await invoke('save_gemini_api_key', { apiKey: newKeyValue });
                showNotification('✓ Gemini API Key đã lưu cho AI Skill Factory', 'success');
            } catch (storeError) {
                console.error('Failed to save Gemini key:', storeError);
            }
        }

        saveSettings(newSettings);
        setNewKeyValue('');
        setShowApiKeyModal(false);
    };

    const handleDeleteApiKey = (service: string) => {
        const newSettings = {
            ...settings,
            apiKeys: settings.apiKeys.filter(k => k.service !== service)
        };
        saveSettings(newSettings);
    };

    const handleTestConnection = async () => {
        try {
            await invoke('test_python_connection', { pythonPath: settings.pythonPath });
            showNotification('✓ Kết nối Python thành công!', 'success');
        } catch (error) {
            showNotification(`Lỗi kết nối: ${error}`, 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="settings-page loading">
                <div className="loading-spinner"></div>
                <span>Đang tải cài đặt...</span>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h1>⚙️ Cài đặt</h1>
                <p>Quản lý cấu hình ứng dụng Vibecode</p>
            </header>

            {notification && (
                <div className={`settings-notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <div className="settings-content">
                {/* Python Connection */}
                <section className="settings-section">
                    <div className="section-header">
                        <span className="section-icon">🐍</span>
                        <div>
                            <h2>Kết nối Python</h2>
                            <p>Cấu hình đường dẫn đến Vibecode CLI</p>
                        </div>
                    </div>
                    <div className="section-body">
                        <div className="input-group">
                            <input
                                type="text"
                                value={settings.pythonPath}
                                onChange={handlePythonPathChange}
                                placeholder="python ../vibe.py"
                                className="settings-input"
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={handleTestConnection}
                            >
                                Test
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSavePythonPath}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* API Keys */}
                <section className="settings-section">
                    <div className="section-header">
                        <span className="section-icon">🔑</span>
                        <div>
                            <h2>API Keys</h2>
                            <p>Quản lý API keys cho các AI services</p>
                        </div>
                    </div>
                    <div className="section-body">
                        {settings.apiKeys.length === 0 ? (
                            <p className="empty-text">Chưa có API key nào được cấu hình</p>
                        ) : (
                            <div className="api-keys-list">
                                {settings.apiKeys.map(key => (
                                    <div key={key.service} className="api-key-item">
                                        <span className="key-service">{key.service}</span>
                                        <span className="key-masked">{key.masked}</span>
                                        <button
                                            className="btn-icon btn-danger"
                                            onClick={() => handleDeleteApiKey(key.service)}
                                            title="Xóa key"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowApiKeyModal(true)}
                        >
                            + Thêm API Key
                        </button>
                    </div>
                </section>

                {/* Theme */}
                <section className="settings-section">
                    <div className="section-header">
                        <span className="section-icon">🎨</span>
                        <div>
                            <h2>Giao diện</h2>
                            <p>Tùy chỉnh theme và hiển thị</p>
                        </div>
                    </div>
                    <div className="section-body">
                        <div className="theme-toggle">
                            <span>Theme hiện tại: <strong>{settings.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}</strong></span>
                            <button
                                className="btn btn-secondary"
                                onClick={handleThemeToggle}
                            >
                                Chuyển sang {settings.theme === 'dark' ? 'Light' : 'Dark'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* About */}
                <section className="settings-section">
                    <div className="section-header">
                        <span className="section-icon">ℹ️</span>
                        <div>
                            <h2>Thông tin</h2>
                            <p>Về ứng dụng Vibecode Desktop</p>
                        </div>
                    </div>
                    <div className="section-body about-section">
                        <div className="about-item">
                            <span className="about-label">Phiên bản</span>
                            <span className="about-value">1.0.0</span>
                        </div>
                        <div className="about-item">
                            <span className="about-label">Tác giả</span>
                            <span className="about-value">Valentina Nie</span>
                        </div>
                        <div className="about-item">
                            <span className="about-label">License</span>
                            <span className="about-value">MIT</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* API Key Modal */}
            {showApiKeyModal && (
                <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🔑 Thêm API Key</h3>
                            <button className="modal-close" onClick={() => setShowApiKeyModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Dịch vụ</label>
                                <select
                                    value={newKeyService}
                                    onChange={e => setNewKeyService(e.target.value)}
                                    className="settings-select"
                                >
                                    <option value="claude">Claude (Anthropic)</option>
                                    <option value="gemini">Gemini (Google)</option>
                                    <option value="openai">GPT (OpenAI)</option>
                                    <option value="groq">Groq</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>API Key</label>
                                <input
                                    type="password"
                                    value={newKeyValue}
                                    onChange={e => setNewKeyValue(e.target.value)}
                                    placeholder="sk-..."
                                    className="settings-input"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowApiKeyModal(false)}>
                                Hủy
                            </button>
                            <button className="btn btn-primary" onClick={handleAddApiKey}>
                                Lưu API Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
