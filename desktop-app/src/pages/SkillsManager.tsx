import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';


interface Skill {
    id: string;
    name: string;
    description: string;
    path: string;
    version: string;
    category: string | null;
    has_scripts: boolean;
    has_guardrails: boolean;
    created_at: string;
    updated_at: string;
}

interface CreateSkillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (skill: Skill) => void;
}

const CreateSkillModal: React.FC<CreateSkillModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Tên skill là bắt buộc');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const skill = await invoke<Skill>('create_skill', {
                name: name.trim(),
                description: description.trim(),
                category: category.trim() || null
            });
            onSuccess(skill);
            setName('');
            setDescription('');
            setCategory('');
            onClose();
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>✨ Tạo Skill Mới</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-group">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Tên Skill <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="VD: finance-audit, legal-contract-review"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-medium text-text-secondary mb-2">Mô tả</label>
                            <textarea
                                className="input min-h-[100px]"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Skill này giúp AI thực hiện..."
                            />
                        </div>
                        <div className="form-group">
                            <label className="block text-sm font-medium text-text-secondary mb-2">Danh mục</label>
                            <select
                                className="settings-select"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                            >
                                <option value="">-- Chọn danh mục --</option>
                                <option value="Finance">Finance</option>
                                <option value="Legal">Legal</option>
                                <option value="HR">HR</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Development">Development</option>
                                <option value="Operations">Operations</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        {error && <div className="text-error text-sm bg-error-muted p-3 rounded">{error}</div>}
                    </form>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
                        Hủy
                    </button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Đang tạo...' : 'Tạo Skill'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SkillsManager: React.FC = () => {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [skillContent, setSkillContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [scriptOutput, setScriptOutput] = useState<string>('');
    const [isRunningScript, setIsRunningScript] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [skillScripts, setSkillScripts] = useState<string[]>([]);


    const loadSkills = async () => {
        setIsLoading(true);
        try {
            const result = await invoke<Skill[]>('list_skills');
            setSkills(result);
            setError('');
        } catch (err) {
            setError(String(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSkills();
    }, []);

    const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSelectSkill = async (skill: Skill) => {
        setSelectedSkill(skill);
        setTestResult(null);  // Clear previous test results
        setScriptOutput('');  // Clear previous script output
        try {
            const content = await invoke<string>('read_skill_content', { skillId: skill.id });
            setSkillContent(content);

            // Load available scripts
            if (skill.has_scripts) {
                const scripts = await invoke<string[]>('list_skill_scripts', { skillId: skill.id });
                setSkillScripts(scripts);
            } else {
                setSkillScripts([]);
            }
        } catch (err) {
            showNotification(`Không thể đọc SKILL.md: ${err}`, 'error');
        }
    };

    const handleSaveSkill = async () => {
        if (!selectedSkill) return;

        try {
            await invoke('update_skill', {
                skillId: selectedSkill.id,
                content: skillContent
            });
            showNotification('✅ Đã lưu skill thành công!', 'success');
            loadSkills();
        } catch (err) {
            showNotification(`Lỗi: ${err}`, 'error');
        }
    };

    const handleDeleteSkill = async (skill: Skill) => {
        if (!window.confirm(`Bạn có chắc muốn xóa skill "${skill.name}"?`)) return;

        try {
            await invoke('delete_skill', { skillId: skill.id });
            showNotification(`🗑️ Đã xóa skill "${skill.name}"`, 'success');
            if (selectedSkill?.id === skill.id) {
                setSelectedSkill(null);
                setSkillContent('');
            }
            loadSkills();
        } catch (err) {
            showNotification(`Lỗi: ${err}`, 'error');
        }
    };

    const handleRunScript = async (scriptName: string) => {
        if (!selectedSkill) return;

        setIsRunningScript(true);
        setScriptOutput('⏳ Đang chạy script...');

        try {
            const result: any = await invoke('run_skill_script', {
                skillId: selectedSkill.id,
                scriptName
            });

            const output = `✅ Script executed successfully!\n\nExecution Time: ${result.execution_time.toFixed(3)}s\n\nOutput:\n${result.output}`;
            const errorOutput = result.error ? `\n\nErrors:\n${result.error}` : '';

            setScriptOutput(output + errorOutput);
            showNotification('✅ Script completed', 'success');
        } catch (err) {
            setScriptOutput(`❌ Error: ${err}`);
            showNotification(`Lỗi: ${err}`, 'error');
        } finally {
            setIsRunningScript(false);
        }
    };

    const handleTestSkill = async () => {
        if (!selectedSkill) return;

        try {
            const result: any = await invoke('test_skill', {
                skillId: selectedSkill.id
            });
            setTestResult(result);
            if (result.is_valid) {
                showNotification(`✅ Skill "${result.skill_name}" v${result.version} hợp lệ!`, 'success');
            } else {
                showNotification(`⚠️ Skill có ${result.errors.length} lỗi cần sửa`, 'error');
            }
        } catch (err) {
            showNotification(`Lỗi test skill: ${err}`, 'error');
        }
    };

    const handleExportSkill = async () => {
        if (!selectedSkill) return;

        setIsExporting(true);
        try {
            const result: any = await invoke('export_skill', {
                skillId: selectedSkill.id
            });
            showNotification(`📦 Đã export "${result.skill_name}" (${(result.file_size / 1024).toFixed(1)} KB)`, 'success');
        } catch (err) {
            showNotification(`Lỗi export: ${err}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };


    const filteredSkills = skills.filter(skill =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (skill.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getCategoryIcon = (category: string | null) => {
        switch (category) {
            case 'Finance': return '💰';
            case 'Legal': return '⚖️';
            case 'HR': return '👥';
            case 'Marketing': return '📢';
            case 'Development': return '💻';
            case 'Operations': return '⚙️';
            default: return '📦';
        }
    };

    return (
        <div className="h-full flex flex-col bg-bg-base overflow-hidden">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 animate-fade-in ${notification.type === 'success' ? 'bg-success/10 text-success border border-success/30' :
                        notification.type === 'error' ? 'bg-error/10 text-error border border-error/30' :
                            'bg-info/10 text-info border border-info/30'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>{notification.type === 'success' ? '✓' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
                        <span className="font-medium">{notification.message}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-surface">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-text-primary">🎯 Skills Manager</h1>
                    <span className="bg-bg-elevated px-2 py-1 rounded text-xs text-text-muted">{skills.length} skills</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            className="input pl-9 w-64"
                            placeholder="🔍 Tìm kiếm skills..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        ✨ Tạo Skill Mới
                    </button>
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="flex-1 flex overflow-hidden">
                {/* Skills List (Sidebar style) */}
                <div className="w-1/3 border-r border-border-default bg-bg-surface overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <div className="w-6 h-6 border-2 border-accent-primary rounded-full animate-spin border-t-transparent" />
                            <p className="text-text-muted text-sm">Đang tải skills...</p>
                        </div>
                    ) : filteredSkills.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                            <div className="text-4xl mb-3">📦</div>
                            <h3 className="text-text-primary font-medium mb-1">Chưa có skill nào</h3>
                            <button className="btn btn-sm btn-outline mt-3" onClick={() => setShowCreateModal(true)}>
                                Tạo Skill Đầu Tiên
                            </button>
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {filteredSkills.map(skill => (
                                <div
                                    key={skill.id}
                                    className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedSkill?.id === skill.id
                                            ? 'bg-accent-primary/10 border-accent-primary'
                                            : 'bg-bg-base border-border-subtle hover:border-border-default hover:bg-bg-hover'
                                        }`}
                                    onClick={() => handleSelectSkill(skill)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="text-xl bg-bg-elevated p-2 rounded-md">{getCategoryIcon(skill.category)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-medium truncate ${selectedSkill?.id === skill.id ? 'text-accent-primary' : 'text-text-primary'}`}>
                                                    {skill.name}
                                                </h4>
                                                <span className="text-[10px] bg-bg-elevated px-1.5 py-0.5 rounded text-text-muted">v{skill.version}</span>
                                            </div>
                                            <p className="text-xs text-text-secondary truncate mt-0.5">{skill.description || 'Không có mô tả'}</p>
                                            <div className="flex gap-1 mt-2">
                                                {skill.has_scripts && <span className="text-[10px] bg-info/10 text-info px-1.5 rounded">📜 Scripts</span>}
                                                {skill.has_guardrails && <span className="text-[10px] bg-success/10 text-success px-1.5 rounded">🛡️ Guardrails</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="flex-1 bg-bg-base flex flex-col h-full overflow-hidden">
                    {selectedSkill ? (
                        <>
                            {/* Editor Toolbar */}
                            <div className="border-b border-border-subtle bg-bg-surface p-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{getCategoryIcon(selectedSkill.category)}</div>
                                    <div>
                                        <h2 className="text-lg font-bold text-text-primary">{selectedSkill.name}</h2>
                                        <p className="text-xs text-text-mono text-text-muted">{selectedSkill.path}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-sm btn-ghost" onClick={handleTestSkill}>🧪 Test</button>
                                    <button className="btn btn-sm btn-ghost" onClick={handleExportSkill} disabled={isExporting}>
                                        {isExporting ? '📦 Exporting...' : '📤 Export'}
                                    </button>
                                    <button className="btn btn-sm btn-danger ml-2" onClick={() => handleDeleteSkill(selectedSkill)}>
                                        🗑️
                                    </button>
                                    <button className="btn btn-sm btn-primary ml-2" onClick={handleSaveSkill}>
                                        💾 Lưu
                                    </button>
                                </div>
                            </div>

                            {/* Editor Content split: Code vs Tools */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Code Editor */}
                                <div className="flex-1 flex flex-col border-r border-border-subtle">
                                    <textarea
                                        className="flex-1 w-full bg-bg-base p-6 font-mono text-sm text-text-secondary resize-none focus:outline-none"
                                        value={skillContent}
                                        onChange={e => setSkillContent(e.target.value)}
                                        spellCheck={false}
                                    />
                                </div>

                                {/* Right Panel: Tools & Output */}
                                <div className="w-80 bg-bg-surface border-l border-border-subtle flex flex-col overflow-y-auto">
                                    {selectedSkill.has_scripts && (
                                        <div className="p-4 border-b border-border-subtle">
                                            <h3 className="text-xs font-bold text-text-muted uppercase mb-3">🚀 Quick Scripts</h3>
                                            <div className="space-y-2">
                                                {skillScripts.map((scriptName) => (
                                                    <button
                                                        key={scriptName}
                                                        className="w-full btn btn-sm btn-secondary justify-start font-mono text-xs"
                                                        onClick={() => handleRunScript(scriptName)}
                                                        disabled={isRunningScript}
                                                    >
                                                        {isRunningScript ? '⏳' : '▶️'} {scriptName}
                                                    </button>
                                                ))}
                                            </div>
                                            {scriptOutput && (
                                                <div className="mt-3 p-3 bg-bg-base rounded border border-border-subtle overflow-hidden">
                                                    <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-all">{scriptOutput}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {testResult && (
                                        <div className={`p-4 border-b border-border-subtle ${testResult.is_valid ? 'bg-success/5' : 'bg-error/5'}`}>
                                            <h3 className="text-xs font-bold text-text-muted uppercase mb-2">Test Results</h3>
                                            <div className="text-xs space-y-2">
                                                {testResult.errors.length > 0 && (
                                                    <div className="text-error">
                                                        <strong>Errors:</strong>
                                                        <ul className="list-disc pl-4 mt-1">{testResult.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
                                                    </div>
                                                )}
                                                {testResult.is_valid && <p className="text-success font-medium">✅ Skill valid</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-xl font-medium text-text-primary">Chọn một skill để chỉnh sửa</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <CreateSkillModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={(skill) => {
                    setSkills(prev => [...prev, skill]);
                    showNotification(`✅ Đã tạo skill "${skill.name}"`, 'success');
                    handleSelectSkill(skill);
                }}
            />
        </div>
    );
};

export default SkillsManager;
