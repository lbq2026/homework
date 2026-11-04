(some characters truncated)...
有分类</h3>
                  <p className="text-caption text-neutral-400">点击上方按钮添加一级分类</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.primaryCategories.map((primary) => (
                    <div key={primary.id} className="bg-white rounded-card shadow-card border border-neutral-100 overflow-hidden">
                      <div 
                        className="p-4 flex items-center gap-3 cursor-pointer"
                        onClick={() => togglePrimary(primary.id)}
                      >
                        <div className="text-3xl">{primary.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-neutral-800">{primary.name}</div>
                          <div className="text-caption text-neutral-400">
                            {state.secondaryCategories.filter(s => s.primaryCategoryId === primary.id).length} 个二级分类
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isParent && (
                            <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddDialog('add-secondary', primary.id);
                            }}
                            className="text-brand-500 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog('edit-primary', primary);
                            }}
                            className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePrimaryCategory(primary.id);
                            }}
                            className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                            </>
                          )}
                          {expandedPrimary === primary.id ? (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>

                      {expandedPrimary === primary.id && (
                        <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                          {state.secondaryCategories
                            .filter(s => s.primaryCategoryId === primary.id)
                            .map((secondary) => (
                              <div key={secondary.id} className="mb-2 bg-white rounded-card overflow-hidden">
                                <div 
                                  className="p-3 flex items-center gap-2 cursor-pointer"
                                  onClick={() => toggleSecondary(secondary.id)}
                                >
                                  <div className="text-2xl">{secondary.icon}</div>
                                  <div className="flex-1">
                                    <div className="font-medium text-neutral-800 text-body">{secondary.name}</div>
                                    <div className="text-caption text-neutral-400">
                                      {state.tertiaryCategories.filter(t => t.secondaryCategoryId === secondary.id).length} 个三级分类
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isParent && (
                                      <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAddDialog('add-tertiary', secondary.id);
                                      }}
                                      className="text-brand-500 hover:text-brand-600 hover:bg-brand-50"
                                    >
                                      <PlusCircle className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog('edit-secondary', secondary);
                                      }}
                                      className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSecondaryCategory(secondary.id);
                                      }}
                                      className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                      </>
                                    )}
                                    {expandedSecondary === secondary.id ? (
                                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                                    )}
                                  </div>
                                </div>

                                {expandedSecondary === secondary.id && (
                                  <div className="border-t border-neutral-100 p-3 bg-neutral-50">

                                    {state.tertiaryCategories
                                      .filter(t => t.secondaryCategoryId === secondary.id)
                                      .map((tertiary) => (
                                        <div key={tertiary.id} className="mb-2 bg-white rounded-card p-2 flex items-center gap-2">
                                          <div className="text-xl">{tertiary.icon}</div>
                                          <div className="flex-1">
                                            <div className="font-medium text-neutral-800 text-body flex items-center gap-1.5">
                                              {tertiary.name}
                                              {tertiary.repeat?.type === 'daily' && (
                                                <span className="text-caption bg-brand-50 text-brand-500 px-1.5 py-0.5 rounded-badge">每天</span>
                                              )}
                                              {tertiary.repeat?.type === 'weekly' && (
                                                <span className="text-caption bg-role-child-soft text-role-child px-1.5 py-0.5 rounded-badge">
                                                  每周{tertiary.repeat.weekdays?.map(d => `周${WEEKDAY_LABELS[d]}`).join('·')}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-caption text-accent-yellow-600 font-bold">+{tertiary.defaultPoints} 积分</div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {isParent && (
                                              <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => addTertiaryCategoryToToday(tertiary.id)}
                                              className="text-accent-green-600 hover:text-accent-green-600 hover:bg-accent-green-300/20"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditDialog('edit-tertiary', tertiary)}
                                              className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                              </>
                                            )}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => deleteTertiaryCategory(tertiary.id)}
                                              className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'add-primary' && '添加一级分类'}
              {dialogType === 'edit-primary' && '编辑一级分类'}
              {dialogType === 'add-secondary' && '添加二级分类'}
              {dialogType === 'edit-secondary' && '编辑二级分类'}
              {dialogType === 'add-tertiary' && '添加三级分类'}
              {dialogType === 'edit-tertiary' && '编辑三级分类'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入名称"
                className="mt-1"
              />
            </div>

            {(dialogType === 'add-tertiary' || dialogType === 'edit-tertiary') && (
              <div>
                <Label>默认积分</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, defaultPoints: Math.max(1, formData.defaultPoints - 1) })}
                  >
                    -
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">{formData.defaultPoints}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, defaultPoints: formData.defaultPoints + 1 })}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>图标</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {Object.entries(TASK_ICONS).map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl p-2 rounded-lg transition-all flex items-center justify-center min-h-[50px] ${
                      formData.icon === icon 
                        ? 'bg-blue-100 ring-2 ring-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 重复规则（仅三级分类） */}
            {(dialogType === 'add-tertiary' || dialogType === 'edit-tertiary') && (
              <div>
                <Label>重复规则</Label>
                <div className="flex gap-2 mt-1">
                  {([
                    { v: 'none', label: '不重复' },
                    { v: 'daily', label: '每天' },
                    { v: 'weekly', label: '每周固定日' },
                  ] as const).map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, repeatType: opt.v }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        formData.repeatType === opt.v
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {formData.repeatType === 'weekly' && (
                  <div className="flex gap-1.5 mt-2">
                    {WEEKDAY_LABELS.map((label, idx) => {
                      const active = formData.repeatWeekdays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            repeatWeekdays: active
                              ? prev.repeatWeekdays.filter(w => w !== idx)
                              : [...prev.repeatWeekdays, idx],
                          }))}
                          className={`w-9 h-9 rounded-full text-body font-bold transition-all ${
                            active
                              ? 'bg-brand-500 text-white'
                              : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-caption text-neutral-400 mt-2">
                  设置后点击「一键生成今日清单」可自动添加到每日任务
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => {
                setDialogType(null);
                setEditingItem(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-brand-500 hover:bg-brand-400 rounded-button"
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加临时任务对话框 */}
      <Dialog open={showTempDialog} onOpenChange={setShowTempDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">添加临时任务</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>任务名称</Label>
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="例如：帮妈妈洗碗、整理书桌"
                className="mt-1 rounded-input"
                autoFocus
              />
            </div>
            <div>
              <Label>奖励积分</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTempPoints(Math.max(1, tempPoints - 1))}
                >
                  -
                </Button>
                <span className="text-title font-bold w-12 text-center">{tempPoints}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTempPoints(tempPoints + 1)}
                >
                  +
                </Button>
              </div>
              <p className="text-caption text-neutral-400 mt-2">临时任务只出现在今日清单，不会加入作业库</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowTempDialog(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-accent-green-400 hover:bg-accent-green-600 rounded-button"
              onClick={() => {
                if (!tempName.trim()) return;
                addTemporaryTaskToToday(tempName.trim(), tempPoints);
                setShowTempDialog(false);
                toast.success('已添加临时任务', { icon: '📝' });
              }}
              disabled={!tempName.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
