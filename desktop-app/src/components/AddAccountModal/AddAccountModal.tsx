import React, { useState } from 'react';
import './AddAccountModal.css';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (account: NewAccount) => void;
}

interface NewAccount {
    email: string;
    service: string;
    plan: 'free' | 'pro';
    apiKey?: string;
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [service, setService] = useState('claude');
    const [plan, setPlan] = useState<'free' | 'pro'>('pro');
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }

        if (!email.includes('@')) {
            setError('Email không hợp lệ');
            return;
        }

        setIsLoading(true);

        try {
            // Simulate API call / account verification
            await new Promise(resolve => setTimeout(resolve, 800));

            const newAccount: NewAccount = {
                email: email.trim(),
                service,
                plan,
                apiKey: apiKey.trim() || undefined
            };

            onSuccess(newAccount);
            handleClose();
        } catch (err) {
            setError('Không thể thêm tài khoản. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setService('claude');
        setPlan('pro');
        setApiKey('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="add-account-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>➕ Thêm Tài Khoản Mới</h3>
                    <button className="modal-close" onClick={handleClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Email tài khoản *</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="example@gmail.com"
                                className="form-input"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Dịch vụ AI</label>
                            <select
                                value={service}
                                onChange={e => setService(e.target.value)}
                                className="form-select"
                            >
                                <option value="claude">Claude (Anthropic)</option>
                                <option value="gemini">Gemini (Google)</option>
                                <option value="openai">GPT (OpenAI)</option>
                                <option value="cursor">Cursor</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Gói dịch vụ</label>
                            <div className="plan-selector">
                                <button
                                    type="button"
                                    className={`plan-option ${plan === 'free' ? 'active' : ''}`}
                                    onClick={() => setPlan('free')}
                                >
                                    <span className="plan-name">Free</span>
                                    <span className="plan-desc">Giới hạn queries</span>
                                </button>
                                <button
                                    type="button"
                                    className={`plan-option ${plan === 'pro' ? 'active' : ''}`}
                                    onClick={() => setPlan('pro')}
                                >
                                    <span className="plan-badge">PRO</span>
                                    <span className="plan-name">Pro</span>
                                    <span className="plan-desc">Unlimited</span>
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>API Key (tùy chọn)</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="sk-... hoặc để trống"
                                className="form-input"
                            />
                            <span className="form-hint">Để trống nếu sử dụng tài khoản đăng nhập</span>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Đang thêm...' : 'Thêm Tài Khoản'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAccountModal;
