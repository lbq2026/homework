import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Download, Upload, Trash2, AlertTriangle, FileJson, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { AppState } from '@/types';

interface SettingsProps {
  state: AppState;
  onBack: () => void;
  onToggleSound: () => void;
  onExport: () => string;
  onImport: (data: string) => boolean;
  onResetAll: () => void;
  onResetToday: () => void;
}

export const Settings = ({
  state,
  onBack,
  onToggleSound,
  onExport,
  onImport,
  onResetAll,
  onResetToday,
}: SettingsProps) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetTodayConfirm, setShowResetTodayConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            数据管理
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
                <div className="font-medium">备份数据</div>
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
                <div className="font-medium">恢复数据</div>
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
              <span>定期备份数据防止丢失</span>
            </li>
          </ul>
        </section>

        {/* 版本信息 */}
        <div className="text-center text-sm text-gray-400 pt-4">
          <p>小勇士积分王国 v1.0</p>
          <p className="mt-1">让作业变得有趣 🌟</p>
        </div>
      </div>

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
    </div>
  );
};
