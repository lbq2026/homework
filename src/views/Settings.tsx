import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Download, Upload, Trash2, AlertTriangle, FileJson, RotateCcw, X, Lock, ShieldCheck, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getTodayStr } from '@/utils/date';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission } from '@/hooks/useReminder';

/** 二次确认输入词 */
const CONFIRM_WORD = '确认重置';

export const Settings = () => {
  const navigate = useNavigate();
  const { isParent } = useAuth();
  const { state, toggleSound, updateReminder, exportAppData, importAppData, resetAll, resetToday } = useAppState();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetTodayConfirm, setShowResetTodayConfirm] = useState(false);
  const [confirmWord, setConfirmWord] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 开启提醒时请求通知授权
  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setImportError('通知权限未开启，请在浏览器设置中允许通知');
        return;
      }
    }
    updateReminder(enabled);
  };

  const handleExport = () => {
    const data = exportAppData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小勇士积分王国备份_${getTodayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = importAppData(content);
        if (success) {
          setShowImportSuccess(true);
          setImportError(null);
        } else {
          setImportError('数据格式错误，请检查文件');
        }
      } catch (error) {
        setImportError('读取文件失败');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const closeResetDialog = () => {
    setShowResetConfirm(false);
    setShowResetTodayConfirm(false);
    setConfirmWord('');
  };

  const handleResetAll = async () => {
    if (confirmWord !== CONFIRM_WORD) return;
    setIsResetting(true);
    await resetAll(); // 内部已先强制云端备份
    setIsResetting(false);
    closeResetDialog();
  };

  const handleResetToday = async () => {
    if (confirmWord !== CONFIRM_WORD) return;
    setIsResetting(true);
    await resetToday(); // 内部已先强制云端备份
    setIsResetting(false);
    closeResetDialog();
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 头部 */}
      <header className="bg-white p-4 shadow-card border-b border-neutral-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold text-neutral-800">设置</h1>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 音效设置 */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                state.settings.soundEnabled ? 'bg-brand-50 text-brand-500' : 'bg-neutral-100 text-neutral-400'
              }`}>
                {state.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-medium text-neutral-800">音效</h3>
                <p className="text-caption text-neutral-400">完成任务时播放音效</p>
              </div>
            </div>
            <Switch
              checked={state.settings.soundEnabled}
              onCheckedChange={toggleSound}
            />
          </div>
        </section>

        {/* 作业提醒（本地通知） */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                state.settings.remindEnabled ? 'bg-accent-yellow-300/40 text-accent-yellow-600' : 'bg-neutral-100 text-neutral-400'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-800">作业提醒</h3>
                <p className="text-caption text-neutral-400">每天定时提醒未完成任务</p>
              </div>
            </div>
            <Switch
              checked={state.settings.remindEnabled}
              onCheckedChange={handleToggleReminder}
            />
          </div>
          {state.settings.remindEnabled && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100">
              <span className="text-caption text-neutral-400">提醒时间</span>
              <input
                type="time"
                value={state.settings.remindTime || '19:00'}
                onChange={(e) => updateReminder(true, e.target.value)}
                className="flex-1 text-body border border-neutral-200 rounded-input px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow-300"
              />
            </div>
          )}
          <p className="text-caption text-neutral-400 mt-2">
            💡 需在浏览器中允许通知权限；可安装到主屏幕获得更好的提醒体验
          </p>
        </section>

        {/* 数据管理（仅家长可见） */}
        {isParent && (
          <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
            <h3 className="font-medium text-neutral-800 mb-4 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-accent-yellow-600" />
              数据管理
            </h3>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 rounded-button"
                onClick={handleExport}
              >
                <div className="w-8 h-8 bg-accent-green-300/30 rounded-lg flex items-center justify-center">
                  <Download className="w-4 h-4 text-accent-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-neutral-800">备份数据</div>
                  <div className="text-caption text-neutral-400">导出为JSON文件</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 rounded-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                  <Upload className="w-4 h-4 text-brand-500" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-neutral-800">恢复数据</div>
                  <div className="text-caption text-neutral-400">从JSON文件导入</div>
                </div>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </section>
        )}

        {/* 重置选项（仅家长可见 + 二次确认） */}
        {isParent && (
          <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
            <h3 className="font-medium text-neutral-800 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-semantic-danger" />
              重置选项
            </h3>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 border-accent-orange-300 hover:bg-accent-orange-300/20 rounded-button"
                onClick={() => { setShowResetTodayConfirm(true); setConfirmWord(''); }}
              >
                <div className="w-8 h-8 bg-accent-orange-300/40 rounded-lg flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-accent-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-accent-orange-600">重置今日记录</div>
                  <div className="text-caption text-accent-orange-400">清除今天的作业完成情况（自动备份）</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 border-semantic-danger/30 hover:bg-semantic-danger-soft rounded-button"
                onClick={() => { setShowResetConfirm(true); setConfirmWord(''); }}
              >
                <div className="w-8 h-8 bg-semantic-danger-soft rounded-lg flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-semantic-danger" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-semantic-danger">重置所有数据</div>
                  <div className="text-caption text-semantic-danger/70">清除所有记录（重置前自动备份）</div>
                </div>
              </Button>
            </div>
          </section>
        )}

        {/* 孩子端提示 */}
        {!isParent && (
          <section className="bg-brand-50 rounded-card p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-brand-400 shrink-0" />
            <p className="text-body text-brand-600">
              数据管理与重置操作仅家长可用，如有需要请家长登录操作。
            </p>
          </section>
        )}

        {/* 隐私政策 */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-14 hover:bg-neutral-50 rounded-button"
            onClick={() => navigate('/privacy')}
          >
            <div className="w-8 h-8 bg-accent-purple-300/30 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent-purple-600" />
            </div>
            <div className="text-left">
              <div className="font-medium text-neutral-800">隐私政策</div>
              <div className="text-caption text-neutral-400">了解我们如何保护孩子数据</div>
            </div>
          </Button>
        </section>

        {/* 使用说明 */}
        <section className="bg-brand-50 rounded-card p-4">
          <h3 className="font-medium text-brand-700 mb-3">💡 使用小贴士</h3>
          <ul className="space-y-2 text-body text-brand-600">
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>在"作业管理"中创建作业并添加到今日清单</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>完成作业后勾选，获得积分奖励</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>积累积分兑换心仪的奖品</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>连续完成作业解锁特殊徽章</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-400">•</span>
              <span>定期备份数据防止丢失</span>
            </li>
          </ul>
        </section>

        {/* 版本信息 */}
        <div className="text-center text-caption text-neutral-400 pt-4">
          <p>小勇士积分王国 v1.1</p>
          <p className="mt-1">让作业变得有趣 🌟</p>
        </div>
      </div>

      {/* 重置所有 - 二次确认对话框（输入确认词） */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-semantic-danger" />
              确认重置?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center">
            这将清除所有数据，包括作业、奖品、徽章和积分记录。
            <br />
            <span className="text-semantic-danger font-medium">此操作不可恢复!</span>
            <br />
            <span className="text-caption text-neutral-400">操作前会自动创建云端备份。</span>
          </DialogDescription>
          <div className="mt-4">
            <Input
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder={`请输入「${CONFIRM_WORD}」以确认`}
              className="rounded-input"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={closeResetDialog}
              disabled={isResetting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-button"
              onClick={handleResetAll}
              disabled={confirmWord !== CONFIRM_WORD || isResetting}
            >
              {isResetting ? '处理中...' : '确认重置'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重置今日 - 二次确认对话框（输入确认词） */}
      <Dialog open={showResetTodayConfirm} onOpenChange={setShowResetTodayConfirm}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">确认重置今日记录?</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center">
            这将清除今天的作业完成情况，但不会影响总积分和其他数据。
            <br />
            <span className="text-caption text-neutral-400">操作前会自动创建云端备份。</span>
          </DialogDescription>
          <div className="mt-4">
            <Input
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder={`请输入「${CONFIRM_WORD}」以确认`}
              className="rounded-input"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={closeResetDialog}
              disabled={isResetting}
            >
              取消
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-accent-orange-400 hover:bg-accent-orange-600 rounded-button"
              onClick={handleResetToday}
              disabled={confirmWord !== CONFIRM_WORD || isResetting}
            >
              {isResetting ? '处理中...' : '确认重置'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 导入成功提示 */}
      <Dialog open={showImportSuccess} onOpenChange={setShowImportSuccess}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">导入成功!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-neutral-600">数据已成功恢复</p>
          </div>
          <Button
            className="w-full bg-brand-500 hover:bg-brand-400 rounded-button"
            onClick={() => setShowImportSuccess(false)}
          >
            确定
          </Button>
        </DialogContent>
      </Dialog>

      {/* 导入错误提示 */}
      {importError && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 bg-semantic-danger text-white p-4 rounded-card shadow-card-hover flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{importError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setImportError(null)}
            className="text-white hover:bg-semantic-danger/80"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
