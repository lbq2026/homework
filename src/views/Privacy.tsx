import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Baby, Database, FileDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

/**
 * 隐私政策页（P2-6）：
 * 面向家长说明儿童数据处理方式、最小化收集、家长同意机制与数据权利。
 */
export const Privacy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Baby className="w-5 h-5 text-brand-500" />,
      title: '儿童数据保护',
      items: [
        '本应用面向 6~12 岁儿童，收集的数据限于使用所必需（任务、积分、兑换记录），不包含敏感个人信息',
        '我们不在应用中展示任何广告，也不向第三方出售儿童数据',
        '建议家长保管好孩子的登录账号，避免他人冒用',
      ],
    },
    {
      icon: <Database className="w-5 h-5 text-accent-green-600" />,
      title: '数据收集与使用',
      items: [
        '账号信息：邮箱、昵称、头像（仅用于登录与展示）',
        '使用数据：作业任务、完成记录、积分流水、兑换记录、徽章',
        '数据仅用于向你提供积分激励服务，不用于其他目的',
      ],
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-accent-purple-600" />,
      title: '家长同意机制',
      items: [
        '孩子账号由家长创建并管理（「我的 → 我的孩子」）',
        '积分调整、奖品管理、数据重置等规则操作仅家长账号可执行',
        '孩子发起的兑换需家长审核确认后才会生效',
      ],
    },
    {
      icon: <FileDown className="w-5 h-5 text-accent-yellow-600" />,
      title: '你的数据权利',
      items: [
        '导出：设置 → 数据管理 → 备份数据，可随时导出全部数据为 JSON 文件',
        '更正：个人中心可修改昵称、头像、手机号',
        '删除：设置 → 重置选项可清除全部数据（操作前自动云端备份）',
      ],
    },
    {
      icon: <Trash2 className="w-5 h-5 text-semantic-danger" />,
      title: '账号注销',
      items: [
        '如需注销账号并删除全部云端数据，请联系客服邮箱处理（见下方）',
        '注销后所有任务、积分、兑换记录将不可恢复',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white p-4 shadow-card border-b border-neutral-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold text-neutral-800">隐私政策</h1>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        <div className="bg-gradient-to-r from-brand-400 to-brand-500 rounded-surface p-5 text-white shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8" />
            <h2 className="text-subtitle font-bold">小勇士积分王国 · 隐私承诺</h2>
          </div>
          <p className="text-body text-brand-100 leading-relaxed">
            我们重视每一个小勇士的隐私安全。本页面向家长说明我们如何收集、使用和保护数据。
            更新日期：2026-08-18。
          </p>
        </div>

        {sections.map((section, index) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white rounded-card p-4 shadow-card border border-neutral-100"
          >
            <div className="flex items-center gap-2 mb-3">
              {section.icon}
              <h3 className="font-bold text-neutral-800">{section.title}</h3>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-body text-neutral-600">
                  <span className="text-brand-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}

        <div className="bg-brand-50 rounded-card p-4 text-body text-brand-600 leading-relaxed">
          <p className="font-medium mb-1">📮 联系方式</p>
          <p>如对隐私政策有任何疑问，或需要注销账号、删除数据，请联系：</p>
          <p className="font-mono text-caption mt-1 break-all">support@little-warrior.example.com</p>
        </div>

        <p className="text-center text-caption text-neutral-400">
          小勇士积分王国 v1.4.0 · 隐私政策生效日期 2026-08-18
        </p>
      </div>
    </div>
  );
};
