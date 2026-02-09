import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Volume2, VolumeX, Download, Upload, Trash2, AlertTriangle, 
  FileJson, RotateCcw, X, Cloud, CloudUpload, History, Smartphone, 
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataBackup } from '@/hooks/useDataBackup';
import { useAuth } from '@/hooks/useAuth';
import type { AppState } from '@/types';

interface SettingsProps {
  state: AppState;
  onBack: () => void;
  onToggleSound: () => void;
  onExport: () => string;
  onImport: (data: string) => boolean;
  onResetAll: () => void;
  onResetToday: () => void;
  onRestoreFromBackup?: (state: AppState) => void;
}

export const Settings = ({
  state,
  onBack,
  onToggleSound,
  onExport,
  onImport,
  onResetAll,
  onResetToday,
  onRestoreFromBackup,
}: SettingsProps) => {
  const { user } = useAuth();
  const { 
    backups, 
    loading: backupLoading, 
    createBackup, 
    fetchBackups, 
    restoreBackup, 
    deleteBackup,
    formatFileSize 
  } = useDataBackup();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetTodayConfirm, setShowResetTodayConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 云端备份相关状态
  const [showCloudBackup, setShowCloudBackup] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载备份列表
  useEffect(() => {
    if (showCloudBackup && user) {
      fetchBackups();
    }
  }, [showCloudBackup, user, fetchBackups]);

  // 本地备份
  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小勇士积分王国备份_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 本地恢复
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = onImport(content);
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

  // 创建云端备份
  const handleCreateCloudBackup = async () => {
    const result = await createBackup(state, backupName || undefined);
    if (result.success) {
      setBackupMessage({ type: 'success', text: '云端备份创建成功' });
      setBackupName('');
      await fetchBackups();
    } else {
      setBackupMessage({ type: 'error', text: '备份失败：' + result.error });
    }
    setTimeout(() => setBackupMessage(null), 3000);
  };

  // 从云端恢复
  const handleRestoreFromCloud = async (backupId: string) => {
    const result = await restoreBackup(backupId);
    if (result.success && result.data) {
      if (onRestoreFromBackup) {
        onRestoreFromBackup(result.data);
      }
      setBackupMessage({ type: 'success', text: '数据恢复成功' });
      setShowRestoreConfirm(null);
    } else {
      setBackupMessage({ type: 'error', text: '恢复失败：' + result.error });
    }
    setTimeout(() => setBackupMessage(null), 3000);
  };

  // 删除云端备份
  const handleDeleteBackup = async (backupId: string) => {
    const result = await deleteBackup(backupId);
    if (result.success) {
      setBackupMessage({ type: 'success', text: '备份已删除' });
    } else {
      setBackupMessage({ type: 'error', text: '删除失败：' + result.error });
    }
    setTimeout(() => setBackupMessage(null), 3000);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">设置</h1>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 音效设置 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                state.settings.soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {state.settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-medium text-gray-800">音效</h3>
                <p className="text-sm text-gray-500">完成任务时播放音效</p>
              </div>
            </div>
            <Switch
              checked={state.settings.soundEnabled}
              onCheckedChange={onToggleSound}
            />
          </div>
        </section>

        {/* 数据管理 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
            <FileJson className="w-5 h-5 text-amber-500" />
            本地数据管理
          </h3>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={handleExport}
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">备份到本地</div>
                <div className="text-xs text-gray-500">导出为JSON文件</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">从本地恢复</div>
                <div className="text-xs text-gray-500">从JSON文件导入</div>
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

        {/* 云端备份 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            云端备份
          </h3>
          
          <div className="space-y-3">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
              <p>✨ 登录账号后，数据会自动同步到云端</p>
              <p className="mt-1 text-blue-600">多设备登录时数据会自动同步</p>
            </div>

            {user ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => setShowCloudBackup(true)}
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CloudUpload className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">管理云端备份</div>
                  <div className="text-xs text-gray-500">查看和恢复历史备份</div>
                </div>
              </Button>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                登录后可使用云端备份功能
              </div>
            )}
          </div>
        </section>

        {/* 重置选项 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-500" />
            重置选项
          </h3>
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-orange-200 hover:bg-orange-50"
              onClick={() => setShowResetTodayConfirm(true)}
            >
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-orange-700">重置今日记录</div>
                <div className="text-xs text-orange-500">清除今天的作业完成情况</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14 border-red-200 hover:bg-red-50"
              onClick={() => setShowResetConfirm(true)}
            >
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-red-700">重置所有数据</div>
                <div className="text-xs text-red-500">清除所有记录，不可恢复</div>
              </div>
            </Button>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="bg-blue-50 rounded-2xl p-4">
          <h3 className="font-medium text-blue-800 mb-3">💡 使用小贴士</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>在"作业管理"中创建作业并添加到今日清单</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>完成作业后勾选，获得积分奖励</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>积累积分兑换心仪的奖品</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>连续完成作业解锁特殊徽章</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400">•</span>
              <span>登录账号后数据自动同步到云端</span>
            </li>
          </ul>
        </section>

        {/* 版本信息 */}
        <div className="text-center text-sm text-gray-400 pt-4">
          <p>小勇士积分王国 v1.0</p>
          <p className="mt-1">让作业变得有趣 🌟</p>
        </div>
      </div>

      {/* 云端备份管理对话框 */}
      <Dialog open={showCloudBackup} onOpenChange={setShowCloudBackup}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-500" />
              云端备份管理
            </DialogTitle>
            <DialogDescription>
              您的数据会自动同步到云端，也可以手动创建备份
            </DialogDescription>
          </DialogHeader>

          {/* 消息提示 */}
          <AnimatePresence>
            {backupMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-lg text-sm ${
                  backupMessage.type === 'success' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {backupMessage.text}
              </motion.div>
            )}
          </AnimatePresence>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">创建备份</TabsTrigger>
              <TabsTrigger value="history">历史备份</TabsTrigger>
            </TabsList>

            {/* 创建备份 */}
            <TabsContent value="create" className="space-y-4">
              <div>
                <Label>备份名称（可选）</Label>
                <Input
                  placeholder={`自动备份 ${new Date().toLocaleString('zh-CN')}`}
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>作业数量</span>
                  <span>{state.tasks.length} 个</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>奖品数量</span>
                  <span>{state.rewards.length} 个</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>当前积分</span>
                  <span>{state.totalPoints} 分</span>
                </div>
              </div>

              <Button
                onClick={handleCreateCloudBackup}
                disabled={backupLoading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                {backupLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4 mr-2" />
                )}
                立即备份
              </Button>
            </TabsContent>

            {/* 历史备份 */}
            <TabsContent value="history">
              {backupLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                  <p className="text-gray-500 mt-2">加载中...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Cloud className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无云端备份</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-sm truncate">
                            {backup.backupName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" />
                            {backup.deviceInfo}
                          </span>
                          <span>{formatFileSize(backup.fileSize)}</span>
                          <span>{formatTime(backup.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-blue-600"
                          onClick={() => setShowRestoreConfirm(backup.id)}
                        >
                          恢复
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-500"
                          onClick={() => handleDeleteBackup(backup.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 恢复确认对话框 */}
      <Dialog open={!!showRestoreConfirm} onOpenChange={() => setShowRestoreConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              确认恢复?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center">
            恢复备份将覆盖当前所有数据。
            <br />
            <span className="text-amber-600 font-medium">建议先创建当前数据的备份！</span>
          </DialogDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRestoreConfirm(null)}
            >
              取消
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={() => showRestoreConfirm && handleRestoreFromCloud(showRestoreConfirm)}
              disabled={backupLoading}
            >
              {backupLoading ? '恢复中...' : '确认恢复'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重置确认对话框 */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              确认重置?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center">
            这将清除所有数据，包括作业、奖品、徽章和积分记录。
            <br />
            <span className="text-red-500 font-medium">此操作不可恢复!</span>
          </DialogDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowResetConfirm(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                onResetAll();
                setShowResetConfirm(false);
              }}
            >
              确认重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重置今日确认对话框 */}
      <Dialog open={showResetTodayConfirm} onOpenChange={setShowResetTodayConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">确认重置今日记录?</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center">
            这将清除今天的作业完成情况，但不会影响总积分和其他数据。
          </DialogDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowResetTodayConfirm(false)}
            >
              取消
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                onResetToday();
                setShowResetTodayConfirm(false);
              }}
            >
              确认重置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 导入成功提示 */}
      <Dialog open={showImportSuccess} onOpenChange={setShowImportSuccess}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">导入成功!</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600">数据已成功恢复</p>
          </div>
          <Button
            className="w-full"
            onClick={() => setShowImportSuccess(false)}
          >
            确定
          </Button>
        </DialogContent>
      </Dialog>

      {/* 导入错误提示 */}
      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 bg-red-500 text-white p-4 rounded-xl shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{importError}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportError(null)}
              className="text-white hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
