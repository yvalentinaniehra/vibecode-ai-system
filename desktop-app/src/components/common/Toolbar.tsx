import React from 'react';

interface ToolbarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    filter: string;
    onFilterChange: (filter: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    onAdd?: () => void;
    onRefreshAll?: () => void;
    onSettings?: () => void;
    onExport?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    searchValue,
    onSearchChange,
    filter,
    onFilterChange: _onFilterChange, // Future feature
    viewMode,
    onViewModeChange,
    onAdd,
    onRefreshAll,
    onSettings,
    onExport,
}) => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 bg-bg-base border border-border-default rounded-lg px-3 py-2 flex-1 max-w-sm focus-within:ring-1 focus-within:ring-accent-primary focus-within:border-accent-primary transition-all shadow-sm">
                    <div className="text-text-muted"><SearchIcon /></div>
                    <input
                        type="text"
                        className="bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-muted w-full"
                        placeholder="Tìm kiếm tài khoản..."
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-1 bg-bg-elevated p-1 rounded-lg border border-border-default">
                    <button
                        className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-bg-surface shadow text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        onClick={() => onViewModeChange('list')}
                        title="Danh sách"
                    >
                        <ListIcon />
                    </button>
                    <button
                        className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-bg-surface shadow text-accent-primary' : 'text-text-secondary hover:text-text-primary'}`}
                        onClick={() => onViewModeChange('grid')}
                        title="Lưới"
                    >
                        <GridIcon />
                    </button>
                </div>

                <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-default rounded-lg hover:bg-bg-hover cursor-pointer text-sm font-medium transition-colors" onClick={() => { }}>
                    <span className="text-text-secondary">Tất cả ({filter})</span>
                    <div className="text-text-muted"><ChevronDownIcon /></div>
                </div>

                <div className="hidden xl:flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-default rounded-lg hover:bg-bg-hover cursor-pointer text-sm font-medium transition-colors" onClick={() => { }}>
                    <div className="text-text-secondary"><FilterIcon /></div>
                    <span>Theo tổng hạn</span>
                    <div className="text-text-muted"><ChevronDownIcon /></div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    className="p-2.5 rounded-lg bg-accent-primary text-white hover:bg-accent-hover shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
                    onClick={onAdd}
                    title="Thêm mới"
                >
                    <PlusIcon />
                </button>
                <div className="w-px h-6 bg-border-default mx-1 hidden sm:block"></div>
                <button className="p-2.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors" onClick={onRefreshAll} title="Làm mới tất cả">
                    <RefreshIcon />
                </button>
                <button className="p-2.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors" onClick={onSettings} title="Cài đặt">
                    <SettingsIcon />
                </button>
                <button className="p-2.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors" onClick={onExport} title="Xuất dữ liệu">
                    <DownloadIcon />
                </button>
                <button className="p-2.5 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors" onClick={onExport} title="Tải lên">
                    <UploadIcon />
                </button>
            </div>
        </div>
    );
};

// Icons
const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const ListIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
);

const GridIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const FilterIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
);

const ChevronDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
);

const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
);

const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const UploadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

export default Toolbar;
